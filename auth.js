import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { randomUUID } from "crypto";
import {
  saveUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getWorkspaceById,
  updateWorkspace,
  createWorkspace,
  getPendingInvitationByEmail,
} from "@/lib/db";

const GOOGLE_SHEETS_SCOPE   = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly";
const GOOGLE_GMAIL_SEND     = "https://www.googleapis.com/auth/gmail.send";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

const REQUIRED_OWNER_SCOPES = [
  GOOGLE_SHEETS_SCOPE,
  GOOGLE_GMAIL_READONLY,
  GOOGLE_GMAIL_SEND,
  GOOGLE_CALENDAR_SCOPE,
];

function parseScopes(scopeValue) {
  if (!scopeValue) return [];
  return scopeValue
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(Boolean);
}

async function getGrantedGoogleScopes(account) {
  const scopes = new Set(parseScopes(account?.scope));

  if (account?.access_token) {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(account.access_token)}`
      );

      if (response.ok) {
        const tokenInfo = await response.json();
        for (const scope of parseScopes(tokenInfo.scope)) {
          scopes.add(scope);
        }
      } else {
        console.warn("[Google OAuth] tokeninfo lookup failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.warn("[Google OAuth] tokeninfo lookup error:", error);
    }
  }

  return [...scopes];
}

/**
 * Build a googleTokens object from the OAuth account response.
 * @param {object} account  - Auth.js account from the signIn callback
 * @param {object} existing - Current tokens stored in the workspace (used as fallback)
 */
function buildGoogleTokens(account, existing = {}) {
  return {
    // Always take the latest access token if Google returned one
    accessToken:  account.access_token  || existing.accessToken  || null,
    // Only overwrite the refresh_token if Google returned a NEW one.
    // Google only sends refresh_token on the FIRST consent or after revocation.
    // Without this guard we'd blank it out on every subsequent silent sign-in.
    refreshToken: account.refresh_token || existing.refreshToken || null,
    expiresAt:    account.expires_at
      ? new Date(account.expires_at * 1000).toISOString()
      : (existing.expiresAt || null),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    /**
     * signIn callback — runs immediately after Google OAuth completes.
     *
     * Ownership vs. Invitation rules
     * ────────────────────────────────
     *  INVITED MEMBER (email has a pending invitation):
     *    • Save/update identity fields only (name, image, lastLogin).
     *    • Do NOT create a workspace.
     *    • Do NOT store Google API tokens (identity-only OAuth was requested).
     *    • They will be assigned to the owner's workspace by /api/team/join.
     *
     *  WORKSPACE OWNER (no pending invitation):
     *    • If already has a workspace → sync tokens to the workspace record.
     *    • If no workspace yet → auto-create one and assign them as Owner.
     *    • Store all API tokens (Gmail, Sheets, Calendar) on the workspace.
     *
     *  A member authenticating via Google can NEVER become an Owner automatically.
     *  Ownership is only granted explicitly by an existing Owner.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      try {
        const grantedScopes = await getGrantedGoogleScopes(account);
        console.log("[Google OAuth] Granted scopes:", grantedScopes.join(" "));

        if (!account.refresh_token) {
          console.warn("[Google OAuth] No refresh token returned by Google for this consent flow.");
        }

        const existingUser = getUserByEmail(user.email);
        const now = new Date().toISOString();
        const hasPendingInvite = !!getPendingInvitationByEmail(user.email);

        // ── Scope enforcement (Owners only) ────────────────────────────────
        // Invited members authenticate identity-only; they never need API scopes.
        // Owners MUST consent to ALL required scopes so Gmail, Sheets and Calendar work.
        if (!hasPendingInvite) {
          const missingScopes = REQUIRED_OWNER_SCOPES.filter(
            scope => !grantedScopes.includes(scope)
          );
          if (missingScopes.length > 0) {
            console.error("[Google OAuth] Owner is missing required scopes:", missingScopes);
            console.error("[Google OAuth] Granted scopes were:", grantedScopes);
            console.error("[Google OAuth] Rejecting sign-in — owner must re-consent with full scopes.");
            return "/login?error=missing_scopes";
          }
        }

        if (existingUser) {
          // Always refresh identity fields
          const patch = {
            name:      user.name  || existingUser.name,
            image:     user.image || existingUser.image,
            lastLogin: now,
            accessToken:  null,
            refreshToken: null,
            expiresAt:    null,
          };

          if (hasPendingInvite) {
            // ── INVITED MEMBER ──────────────────────────────────────────────
            // Identity-only sign-in. Do NOT store tokens. The workspace
            // assignment happens in POST /api/team/join.
            updateUser(existingUser.id, patch);
          } else if (!existingUser.workspaceId) {
            // ── OWNER: no workspace yet (first sign-in / legacy edge case) ──
            const workspaceId = randomUUID();
            const defaultName = `${(user.name || existingUser.name || 'User').split(' ')[0]}'s Workspace`;
            createWorkspace({
              id:           workspaceId,
              name:         defaultName,
              ownerId:      existingUser.id,
              ownerEmail:   existingUser.email,
              googleTokens: buildGoogleTokens(account),
              spreadsheetId: "",
            });

            patch.workspaceId = workspaceId;
            patch.role        = "Owner";
            patch.status      = "active";

            updateUser(existingUser.id, patch);
            console.log(`[signIn] Created workspace ${workspaceId} for new owner ${existingUser.email}`);
          } else {
            // ── EXISTING USER (Owner or Member re-authenticating) ───────────
            // Update identity fields.
            updateUser(existingUser.id, patch);

            // If this user is the workspace owner AND Google returned tokens,
            // sync them to the workspace so all API calls keep working.
            // We ALWAYS do this on owner re-login to refresh the access_token.
            const workspace = getWorkspaceById(existingUser.workspaceId);
            if (workspace && workspace.ownerId === existingUser.id && account.access_token) {
              const merged = buildGoogleTokens(account, workspace.googleTokens);
              updateWorkspace(workspace.id, { googleTokens: merged });
              console.log(`[signIn] Synced Google tokens to workspace ${workspace.id} for owner ${existingUser.email}`);
              console.log(`[signIn] Has refresh_token: ${!!merged.refreshToken}, expires: ${merged.expiresAt}`);
            }
          }

        } else {
          // ── Brand new user ─────────────────────────────────────────────────
          const userId = user.id || profile?.sub;

          if (hasPendingInvite) {
            // Invited member — identity only, no workspace, no tokens
            saveUser({
              id:           userId,
              name:         user.name,
              email:        user.email,
              image:        user.image,
              workspaceId:  null,
              role:         null,
              status:       "pending_workspace",
              accessToken:  null,
              refreshToken: null,
              expiresAt:    null,
            });
          } else {
            // New owner — auto-create workspace and store tokens there
            const workspaceId = randomUUID();
            const defaultName = `${(user.name || 'User').split(' ')[0]}'s Workspace`;

            createWorkspace({
              id:           workspaceId,
              name:         defaultName,
              ownerId:      userId,
              ownerEmail:   user.email,
              googleTokens: {
                accessToken:  account.access_token  || null,
                refreshToken: account.refresh_token || null,
                expiresAt:    account.expires_at
                  ? new Date(account.expires_at * 1000).toISOString()
                  : null,
              },
              spreadsheetId: "",
            });

            saveUser({
              id:           userId,
              name:         user.name,
              email:        user.email,
              image:        user.image,
              workspaceId:  workspaceId,
              role:         "Owner",
              status:       "active",
              accessToken:  null,
              refreshToken: null,
              expiresAt:    null,
            });
          }
        }
      } catch (e) {
        console.error("signIn callback error:", e);
        throw e;
      }

      return true;
    },

    /**
     * JWT callback — embeds workspaceId and role into the signed token.
     *
     * Called on every sign-in AND on session updates (trigger === "update").
     * When trigger === "update", re-reads from DB to pick up workspace changes
     * made by /api/team/join (invited member joining a workspace).
     *
     * IMPORTANT: We only auto-create a workspace here if:
     *   1. The user has no workspace, AND
     *   2. They have no pending invitation (they're not in the join flow).
     * This prevents invited members from getting a spurious workspace
     * before the /join page can assign them to the correct one.
     */
    async jwt({ token, user, account, trigger }) {
      // ── Always store the provider sub so we can use it for tracing ──────────
      if (account) {
        token.providerSub = user?.id || token.sub;  // Google numeric sub
      }

      // ── Primary DB lookup: use EMAIL (always reliable) ────────────────────
      // Auth.js puts the Google numeric sub in user.id / token.sub.
      // Our DB stores UUIDs — getUserById would fail to find the user.
      // Email is always present in the token and never changes.
      const email = token.email;
      if (!email) return token;

      // Only re-hydrate from DB on sign-in, explicit update(), or when workspaceId is missing
      if (account || trigger === "update" || !token.workspaceId) {
        // Look up by email — this always works regardless of ID format
        let dbUser = getUserByEmail(email);

        if (dbUser) {
          // ── Store the DB UUID as the canonical token.id ──────────────────
          // This ensures session.user.id is always the DB UUID, not the Google sub.
          token.id = dbUser.id;

          if (!dbUser.workspaceId) {
            // Only auto-create a workspace if there's no pending invitation
            const pendingInvite = getPendingInvitationByEmail(dbUser.email);
            if (!pendingInvite) {
              // Fallback workspace creation (should rarely be needed)
              const workspaceId = randomUUID();
              const defaultName = `${(token.name || dbUser.name || 'User').split(' ')[0]}'s Workspace`;
              createWorkspace({
                id:           workspaceId,
                name:         defaultName,
                ownerId:      dbUser.id,
                ownerEmail:   dbUser.email,
                googleTokens: null,
                spreadsheetId: "",
              });
              updateUser(dbUser.id, {
                workspaceId,
                role:   "Owner",
                status: "active",
              });
              dbUser.workspaceId = workspaceId;
              dbUser.role        = "Owner";
            }
            // If there IS a pending invite, workspaceId stays null until /join
          }

          token.workspaceId = dbUser.workspaceId || null;
          token.role        = dbUser.role         || null;
          token.image       = dbUser.image        || token.picture || null;

          // ── Lookup workspace name for debugging ──────────────────────────
          const ws = dbUser.workspaceId ? getWorkspaceById(dbUser.workspaceId) : null;
          token.workspaceName = ws?.name || null;

          // ── Print session state on every JWT hydration (requirement 8) ──
          console.log("[JWT] Session hydrated:");
          console.log(`  userId        : ${dbUser.id}`);
          console.log(`  workspaceId   : ${dbUser.workspaceId || 'NONE'}`);
          console.log(`  workspaceName : ${ws?.name || 'NONE'}`);
          console.log(`  role          : ${dbUser.role || 'NONE'}`);

        } else if (account) {
          // Extreme fallback: signIn callback failed to create a DB record.
          // Only create workspace if NOT an invited member.
          const pendingInvite = getPendingInvitationByEmail(email);
          if (!pendingInvite) {
            const newUserId   = randomUUID();
            const workspaceId = randomUUID();
            const defaultName = `${(token.name || 'User').split(' ')[0]}'s Workspace`;
            createWorkspace({
              id:           workspaceId,
              name:         defaultName,
              ownerId:      newUserId,
              ownerEmail:   email,
              googleTokens: null,
              spreadsheetId: "",
            });
            saveUser({
              id:           newUserId,
              name:         token.name || 'User',
              email,
              image:        token.picture || null,
              workspaceId,
              role:         "Owner",
              status:       "active",
              accessToken:  null,
              refreshToken: null,
              expiresAt:    null,
            });
            token.id          = newUserId;
            token.workspaceId = workspaceId;
            token.role        = "Owner";
            token.workspaceName = defaultName;
            console.log(`[JWT] Fallback: created user ${newUserId} + workspace ${workspaceId} for ${email}`);
          }
        } else {
          // User exists in session but not in DB (data inconsistency)
          console.warn(`[JWT] WARNING: No DB user found for email ${email}. WorkspaceId will be null.`);
        }
      }

      return token;
    },

    /**
     * Session callback — exposes workspaceId, workspaceName, role and DB UUID to the client.
     */
    async session({ session, token }) {
      if (session.user) {
        // token.id is now the DB UUID (set in the jwt callback); fall back to sub only if missing
        session.user.id            = token.id   || token.sub;
        session.user.workspaceId   = token.workspaceId   || null;
        session.user.workspaceName = token.workspaceName || null;
        session.user.role          = token.role          || null;
        if (token.image) session.user.image = token.image;
      }
      return session;
    },

  },
});
