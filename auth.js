import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { randomUUID } from "crypto";
import {
  saveUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getWorkspaceById,
  findWorkspaceForUser,
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
      console.log("[Auth][getGrantedGoogleScopes] Before fetch(tokeninfo)", {
        hasAccessToken: !!account?.access_token,
        accountScope: account?.scope || null,
      });
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(account.access_token)}`
      );
      console.log("[Auth][getGrantedGoogleScopes] After fetch(tokeninfo)", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (response.ok) {
        console.log("[Auth][getGrantedGoogleScopes] Before response.json()");
        const tokenInfo = await response.json();
        console.log("[Auth][getGrantedGoogleScopes] After response.json()", tokenInfo);
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

function logAuth(label, details = {}) {
  console.log(`[Auth][${label}]`, JSON.stringify(details, null, 2));
}

function logAuthError(label, error) {
  console.error(`[Auth][${label}]`, error);
  if (error?.stack) {
    console.error(`[Auth][${label}][stack]`, error.stack);
  }
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
      logAuth("signIn:start", {
        provider: account?.provider || null,
        email: user?.email || null,
        accountScope: account?.scope || null,
        accessTokenPresent: !!account?.access_token,
        refreshTokenPresent: !!account?.refresh_token,
        expiresAt: account?.expires_at || null,
        profileSub: profile?.sub || null,
      });

      if (account?.provider !== "google") return true;

      try {
        console.log("[Auth][signIn] Before getGrantedGoogleScopes", {
          email: user?.email,
          scope: account?.scope,
          accessTokenExists: !!account?.access_token,
          refreshTokenExists: !!account?.refresh_token
        });
        const grantedScopes = await getGrantedGoogleScopes(account);
        console.log("[Auth][signIn] After getGrantedGoogleScopes", { grantedScopes });

        logAuth("signIn:grantedScopes", {
          accountScope: account?.scope || null,
          grantedScopes,
        });

        if (!account.refresh_token) {
          logAuth("signIn:refreshTokenMissing", {
            email: user?.email || null,
            accessTokenPresent: !!account?.access_token,
            refreshTokenPresent: !!account?.refresh_token,
          });
        }

        console.log("[Auth][signIn] Before getUserByEmail", { email: user?.email });
        const existingUser = getUserByEmail(user.email);
        console.log("[Auth][signIn] After getUserByEmail", {
          found: !!existingUser,
          userId: existingUser?.id || null,
          workspaceId: existingUser?.workspaceId || null,
        });

        logAuth("signIn:dbRead:getUserByEmail", {
          email: user?.email || null,
          found: !!existingUser,
          userId: existingUser?.id || null,
          workspaceId: existingUser?.workspaceId || null,
          role: existingUser?.role || null,
        });
        const now = new Date().toISOString();

        console.log("[Auth][signIn] Before getPendingInvitationByEmail", { email: user?.email });
        const hasPendingInvite = !!getPendingInvitationByEmail(user.email);
        console.log("[Auth][signIn] After getPendingInvitationByEmail", { hasPendingInvite });

        logAuth("signIn:pendingInvite", {
          email: user?.email || null,
          hasPendingInvite,
        });

        // ── Scope enforcement (Owners only) ────────────────────────────────
        // Invited members authenticate identity-only; they never need API scopes.
        // Owners MUST consent to ALL required scopes so Gmail, Sheets and Calendar work.
        if (!hasPendingInvite) {
          const missingScopes = REQUIRED_OWNER_SCOPES.filter(
            scope => !grantedScopes.includes(scope)
          );
          console.log("[Auth][signIn] Scope enforcement check", {
            requiredScopes: REQUIRED_OWNER_SCOPES,
            grantedScopes,
            missingScopes
          });
          logAuth("signIn:scopeCheck", {
            email: user?.email || null,
            requiredScopes: REQUIRED_OWNER_SCOPES,
            grantedScopes,
            missingScopes,
          });
          if (missingScopes.length > 0) {
            logAuth("signIn:return", {
              decision: "redirect",
              value: "/login?error=missing_scopes",
              reason: "missing required owner scopes",
            });
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
            logAuth("signIn:path", {
              path: "existingUser>pendingInvite>updateUser",
              userId: existingUser.id,
              workspaceId: existingUser.workspaceId || null,
            });
            console.log("[Auth][signIn] Before updateUser (invited member)", {
              userId: existingUser.id,
              patch,
            });
            updateUser(existingUser.id, patch);
            console.log("[Auth][signIn] After updateUser (invited member)");

            console.log("[Auth][signIn] Before getUserById (invited member)", { userId: existingUser.id });
            const updatedUser = getUserById(existingUser.id);
            console.log("[Auth][signIn] After getUserById (invited member)", { found: !!updatedUser });

            logAuth("signIn:dbWrite:updateUser", {
              userId: existingUser.id,
              result: updatedUser,
            });
          } else if (!existingUser.workspaceId) {
            // ── OWNER: no workspace yet (first sign-in / legacy edge case) ──
            const existingWorkspace = findWorkspaceForUser({
              userId: existingUser.id,
              email: existingUser.email,
              workspaceId: existingUser.workspaceId,
            });

            if (existingWorkspace) {
              logAuth("signIn:path", {
                path: "existingUser>owner>reuseExistingWorkspace",
                userId: existingUser.id,
                workspaceId: existingWorkspace.id,
                ownerId: existingWorkspace.ownerId,
                ownerEmail: existingWorkspace.ownerEmail,
              });

              patch.workspaceId = existingWorkspace.id;
              patch.role        = existingWorkspace.ownerId === existingUser.id ? "Owner" : (existingUser.role || null);
              patch.status      = existingUser.status || "active";

              if (existingWorkspace.ownerId === existingUser.id && account?.access_token) {
                console.log("[Auth][signIn] Before buildGoogleTokens (re-link existing workspace)");
                const ownerTokens = buildGoogleTokens(account, existingWorkspace.googleTokens);
                console.log("[Auth][signIn] After buildGoogleTokens (re-link existing workspace)", {
                  accessTokenExists: !!ownerTokens.accessToken,
                  refreshTokenExists: !!ownerTokens.refreshToken,
                });

                updateWorkspace(existingWorkspace.id, { googleTokens: ownerTokens });
                const savedWorkspace = getWorkspaceById(existingWorkspace.id);
                logAuth("signIn:savedGoogleTokens", {
                  workspaceId: savedWorkspace?.id || existingWorkspace.id,
                  googleTokens: savedWorkspace?.googleTokens || null,
                });
                console.log(`[signIn] Re-linked existing workspace ${existingWorkspace.id} for ${existingUser.email}`);
              }
            } else {
              const workspaceId = randomUUID();
              const defaultName = `${(user.name || existingUser.name || 'User').split(' ')[0]}'s Workspace`;
              logAuth("signIn:path", {
                path: "existingUser>owner>createWorkspace",
                userId: existingUser.id,
                workspaceId,
                defaultName,
                accessTokenPresent: !!account?.access_token,
                refreshTokenPresent: !!account?.refresh_token,
              });

              console.log("[Auth][signIn] Before buildGoogleTokens (owner)");
              const ownerTokens = buildGoogleTokens(account);
              console.log("[Auth][signIn] After buildGoogleTokens (owner)", {
                accessTokenExists: !!ownerTokens.accessToken,
                refreshTokenExists: !!ownerTokens.refreshToken
              });

              console.log("[Auth][signIn] Before createWorkspace (owner)", {
                workspaceId,
                ownerId: existingUser.id,
                ownerEmail: existingUser.email,
                defaultName,
              });
              createWorkspace({
                id:           workspaceId,
                name:         defaultName,
                ownerId:      existingUser.id,
                ownerEmail:   existingUser.email,
                googleTokens: ownerTokens,
                spreadsheetId: "",
              });
              console.log("[Auth][signIn] After createWorkspace (owner)");

              console.log("[Auth][signIn] Before getWorkspaceById (owner)", { workspaceId });
              const ownerWs = getWorkspaceById(workspaceId);
              console.log("[Auth][signIn] After getWorkspaceById (owner)", { found: !!ownerWs });

              logAuth("signIn:dbWrite:createWorkspace", {
                workspaceId,
                result: ownerWs,
              });
              logAuth("signIn:savedGoogleTokens", {
                workspaceId: ownerWs?.id || workspaceId,
                googleTokens: ownerWs?.googleTokens || null,
              });

              patch.workspaceId = workspaceId;
              patch.role        = "Owner";
              patch.status      = "active";
            }

            console.log("[Auth][signIn] Before updateUser (owner)", {
              userId: existingUser.id,
              patch,
            });
            updateUser(existingUser.id, patch);
            console.log("[Auth][signIn] After updateUser (owner)");

            console.log("[Auth][signIn] Before getUserById (owner)", { userId: existingUser.id });
            const ownerUser = getUserById(existingUser.id);
            console.log("[Auth][signIn] After getUserById (owner)", { found: !!ownerUser });

            logAuth("signIn:dbWrite:updateUser", {
              userId: existingUser.id,
              result: ownerUser,
            });
            console.log(`[signIn] Created workspace ${workspaceId} for new owner ${existingUser.email}`);
          } else {
            // ── EXISTING USER (Owner or Member re-authenticating) ───────────
            // Update identity fields.
            logAuth("signIn:path", {
              path: "existingUser>existingWorkspace>updateUser",
              userId: existingUser.id,
              workspaceId: existingUser.workspaceId,
              ownerId: getWorkspaceById(existingUser.workspaceId)?.ownerId || null,
              accessTokenPresent: !!account?.access_token,
              refreshTokenPresent: !!account?.refresh_token,
            });

            console.log("[Auth][signIn] Before updateUser (re-auth)", {
              userId: existingUser.id,
              patch,
            });
            updateUser(existingUser.id, patch);
            console.log("[Auth][signIn] After updateUser (re-auth)");

            console.log("[Auth][signIn] Before getUserById (re-auth)", { userId: existingUser.id });
            const reauthUser = getUserById(existingUser.id);
            console.log("[Auth][signIn] After getUserById (re-auth)", { found: !!reauthUser });

            logAuth("signIn:dbWrite:updateUser", {
              userId: existingUser.id,
              result: reauthUser,
            });

            // If this user is the workspace owner AND Google returned tokens,
            // sync them to the workspace so all API calls keep working.
            // We ALWAYS do this on owner re-login to refresh the access_token.
            console.log("[Auth][signIn] Before getWorkspaceById (re-auth)", {
              workspaceId: existingUser.workspaceId,
            });
            const workspace = getWorkspaceById(existingUser.workspaceId);
            console.log("[Auth][signIn] After getWorkspaceById (re-auth)", {
              workspaceId: existingUser.workspaceId,
              found: !!workspace,
              ownerId: workspace?.ownerId || null,
            });

            logAuth("signIn:dbRead:getWorkspaceById", {
              workspaceId: existingUser.workspaceId,
              found: !!workspace,
              ownerId: workspace?.ownerId || null,
              googleTokensPresent: !!workspace?.googleTokens,
            });

            if (workspace && workspace.ownerId === existingUser.id && account.access_token) {
              console.log("[Auth][signIn] Before buildGoogleTokens (re-auth)", {
                hasAccountAccessToken: !!account.access_token,
                hasExistingTokens: !!workspace.googleTokens
              });
              const merged = buildGoogleTokens(account, workspace.googleTokens);
              console.log("[Auth][signIn] After buildGoogleTokens (re-auth)", {
                accessTokenExists: !!merged.accessToken,
                refreshTokenExists: !!merged.refreshToken
              });

              logAuth("signIn:path", {
                path: "existingUser>owner>updateWorkspaceTokens",
                workspaceId: workspace.id,
                accessTokenPresent: !!account?.access_token,
                refreshTokenPresent: !!account?.refresh_token,
                mergedTokens: merged,
              });

              console.log("[Auth][signIn] Before updateWorkspace (re-auth)", {
                workspaceId: workspace.id,
                googleTokens: merged,
              });
              updateWorkspace(workspace.id, { googleTokens: merged });
              console.log("[Auth][signIn] After updateWorkspace (re-auth)");

              console.log("[Auth][signIn] Before getWorkspaceById after update (re-auth)", { workspaceId: workspace.id });
              const updatedWorkspace = getWorkspaceById(workspace.id);
              console.log("[Auth][signIn] After getWorkspaceById after update (re-auth)", { found: !!updatedWorkspace });

              logAuth("signIn:dbWrite:updateWorkspace", {
                workspaceId: workspace.id,
                result: updatedWorkspace,
              });
              logAuth("signIn:savedGoogleTokens", {
                workspaceId: updatedWorkspace?.id || workspace.id,
                googleTokens: updatedWorkspace?.googleTokens || null,
              });
              console.log(`[signIn] Synced Google tokens to workspace ${workspace.id} for owner ${existingUser.email}`);
              console.log(`[signIn] Has refresh_token: ${!!merged.refreshToken}, expires: ${merged.expiresAt}`);
            }
          }

        } else {
          // ── Brand new user ─────────────────────────────────────────────────
          const userId = user.id || profile?.sub;

          if (hasPendingInvite) {
            // Invited member — identity only, no workspace, no tokens
            logAuth("signIn:path", {
              path: "newUser>pendingInvite>saveUser",
              userId,
              email: user?.email || null,
            });

            console.log("[Auth][signIn] Before saveUser (new invited member)", {
              userId,
              email: user.email,
              workspaceId: null,
            });
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
            console.log("[Auth][signIn] After saveUser (new invited member)");

            console.log("[Auth][signIn] Before getUserById (new invited member)", { userId });
            const newInvitedUser = getUserById(userId);
            console.log("[Auth][signIn] After getUserById (new invited member)", { found: !!newInvitedUser });

            logAuth("signIn:dbWrite:saveUser", {
              userId,
              result: newInvitedUser,
            });
          } else {
            // New owner — auto-create workspace and store tokens there
            const workspaceId = randomUUID();
            const defaultName = `${(user.name || 'User').split(' ')[0]}'s Workspace`;
            logAuth("signIn:path", {
              path: "newUser>owner>createWorkspace+saveUser",
              userId,
              workspaceId,
              defaultName,
              accessTokenPresent: !!account?.access_token,
              refreshTokenPresent: !!account?.refresh_token,
            });

            console.log("[Auth][signIn] Before createWorkspace (new owner)", {
              workspaceId,
              ownerId: userId,
              ownerEmail: user.email,
            });
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
            console.log("[Auth][signIn] After createWorkspace (new owner)");

            console.log("[Auth][signIn] Before getWorkspaceById (new owner)", { workspaceId });
            const newOwnerWs = getWorkspaceById(workspaceId);
            console.log("[Auth][signIn] After getWorkspaceById (new owner)", { found: !!newOwnerWs });

            logAuth("signIn:savedGoogleTokens", {
              workspaceId: newOwnerWs?.id || workspaceId,
              googleTokens: newOwnerWs?.googleTokens || null,
            });

            logAuth("signIn:dbWrite:createWorkspace", {
              workspaceId,
              result: newOwnerWs,
            });

            console.log("[Auth][signIn] Before saveUser (new owner)", {
              userId,
              email: user.email,
              workspaceId,
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
            console.log("[Auth][signIn] After saveUser (new owner)");

            console.log("[Auth][signIn] Before getUserById (new owner)", { userId });
            const newOwnerUser = getUserById(userId);
            console.log("[Auth][signIn] After getUserById (new owner)", { found: !!newOwnerUser });

            logAuth("signIn:dbWrite:saveUser", {
              userId,
              result: newOwnerUser,
            });
          }
        }
      } catch (e) {
        console.error("=== AUTH SIGNIN ERROR DIAGNOSTICS ===");
        console.error("Error Name:", e?.name);
        console.error("Error Message:", e?.message);
        console.error("Error Stack:", e?.stack);
        console.error("JSON Stringified Error:", JSON.stringify(e, Object.getOwnPropertyNames(e)));
        if (e?.cause) {
          console.error("Error Cause:", e.cause);
          console.error("JSON Stringified Cause:", JSON.stringify(e.cause, Object.getOwnPropertyNames(e.cause)));
        }
        console.error("======================================");
        throw e;
      }

      logAuth("signIn:return", {
        decision: "allow",
        value: true,
      });
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
      logAuth("jwt:start", {
        trigger: trigger || null,
        accountPresent: !!account,
        provider: account?.provider || null,
        email: token?.email || null,
        accountScope: account?.scope || null,
        accessTokenPresent: !!account?.access_token,
        refreshTokenPresent: !!account?.refresh_token,
        tokenWorkspaceId: token?.workspaceId || null,
      });

      // ── Always store the provider sub so we can use it for tracing ──────────
      if (account) {
        token.providerSub = user?.id || token.sub;  // Google numeric sub
        logAuth("jwt:providerSub", {
          providerSub: token.providerSub || null,
        });
          token.email = user?.email || token.email || null;
      }

      // ── Primary DB lookup: use EMAIL (always reliable) ────────────────────
      // Auth.js puts the Google numeric sub in user.id / token.sub.
      // Our DB stores UUIDs — getUserById would fail to find the user.
      // Email is always present in the token and never changes.
      const email = token.email || user?.email || null;
      if (!email) {
        logAuth("jwt:return", {
          decision: "allow",
          reason: "missing email",
          value: token,
        });
        return token;
      }

      // Only re-hydrate from DB on sign-in, explicit update(), or when workspaceId is missing
      if (account || trigger === "update" || !token.workspaceId) {
        // Look up by email — this always works regardless of ID format
        let dbUser = getUserByEmail(email);
        logAuth("jwt:dbRead:getUserByEmail", {
          email,
          found: !!dbUser,
          userId: dbUser?.id || null,
          workspaceId: dbUser?.workspaceId || null,
          role: dbUser?.role || null,
        });

        if (dbUser) {
          // ── Store the DB UUID as the canonical token.id ──────────────────
          // This ensures session.user.id is always the DB UUID, not the Google sub.
          token.id = dbUser.id;

          // Preserve the email claim so later JWT hydrations can still recover the workspace.
          token.email = dbUser.email || token.email || email;

          let resolvedWorkspace = findWorkspaceForUser({
            userId: dbUser.id,
            email: dbUser.email,
            workspaceId: dbUser.workspaceId,
          });

          logAuth("jwt:workspaceSnapshot", {
            workspaceId: resolvedWorkspace?.id || dbUser.workspaceId || null,
            ownerId: resolvedWorkspace?.ownerId || null,
            emailProvider: resolvedWorkspace?.emailProvider || null,
            googleTokens: resolvedWorkspace?.googleTokens || null,
            spreadsheetId: resolvedWorkspace?.spreadsheetId || null,
          });

          if (!dbUser.workspaceId && resolvedWorkspace) {
            updateUser(dbUser.id, {
              workspaceId: resolvedWorkspace.id,
              role: resolvedWorkspace.ownerId === dbUser.id ? "Owner" : dbUser.role || null,
              status: dbUser.status || "active",
            });
            dbUser.workspaceId = resolvedWorkspace.id;
            if (resolvedWorkspace.ownerId === dbUser.id) {
              dbUser.role = "Owner";
            }
          }

          if (!dbUser.workspaceId) {
            // Only auto-create a workspace if there's no pending invitation
            const pendingInvite = getPendingInvitationByEmail(dbUser.email);
            logAuth("jwt:dbRead:getPendingInvitationByEmail", {
              email: dbUser.email,
              found: !!pendingInvite,
              invitationId: pendingInvite?.id || null,
              workspaceId: pendingInvite?.workspaceId || null,
            });
            if (!pendingInvite) {
              // Fallback workspace creation (should rarely be needed)
              const workspaceId = randomUUID();
              const defaultName = `${(token.name || dbUser.name || 'User').split(' ')[0]}'s Workspace`;
              logAuth("jwt:path", {
                path: "dbUserMissingWorkspace>createWorkspace+updateUser",
                userId: dbUser.id,
                workspaceId,
                defaultName,
              });
              createWorkspace({
                id:           workspaceId,
                name:         defaultName,
                ownerId:      dbUser.id,
                ownerEmail:   dbUser.email,
                googleTokens: null,
                spreadsheetId: "",
              });
              logAuth("jwt:dbWrite:createWorkspace", {
                workspaceId,
                result: getWorkspaceById(workspaceId),
              });
              updateUser(dbUser.id, {
                workspaceId,
                role:   "Owner",
                status: "active",
              });
              logAuth("jwt:dbWrite:updateUser", {
                userId: dbUser.id,
                result: getUserById(dbUser.id),
              });
              dbUser.workspaceId = workspaceId;
              dbUser.role        = "Owner";
            }
            // If there IS a pending invite, workspaceId stays null until /join
          }

          resolvedWorkspace = resolvedWorkspace || findWorkspaceForUser({
            userId: dbUser.id,
            email: dbUser.email,
            workspaceId: dbUser.workspaceId,
          });

          token.workspaceId = dbUser.workspaceId || resolvedWorkspace?.id || null;
          token.role        = dbUser.role         || null;
          token.image       = dbUser.image        || token.picture || null;

          // ── Lookup workspace name for debugging ──────────────────────────
          const ws = resolvedWorkspace || (dbUser.workspaceId ? getWorkspaceById(dbUser.workspaceId) : null);
          token.workspaceName = ws?.name || null;
          logAuth("jwt:dbRead:getWorkspaceById", {
            workspaceId: dbUser.workspaceId || null,
            found: !!ws,
            name: ws?.name || null,
            ownerId: ws?.ownerId || null,
          });

          // ── Print session state on every JWT hydration (requirement 8) ──
          logAuth("jwt:hydrated", {
            userId: dbUser.id,
            workspaceId: dbUser.workspaceId || null,
            workspaceName: ws?.name || null,
            role: dbUser.role || null,
          });

        } else if (account) {
          // Extreme fallback: signIn callback failed to create a DB record.
          // Only create workspace if NOT an invited member.
          const pendingInvite = getPendingInvitationByEmail(email);
          logAuth("jwt:dbRead:getPendingInvitationByEmail", {
            email,
            found: !!pendingInvite,
            invitationId: pendingInvite?.id || null,
            workspaceId: pendingInvite?.workspaceId || null,
          });
          if (!pendingInvite) {
            const newUserId   = randomUUID();
            const workspaceId = randomUUID();
            const defaultName = `${(token.name || 'User').split(' ')[0]}'s Workspace`;
            logAuth("jwt:path", {
              path: "fallbackCreateUser+Workspace",
              userId: newUserId,
              workspaceId,
              email,
            });
            createWorkspace({
              id:           workspaceId,
              name:         defaultName,
              ownerId:      newUserId,
              ownerEmail:   email,
              googleTokens: null,
              spreadsheetId: "",
            });
            logAuth("jwt:dbWrite:createWorkspace", {
              workspaceId,
              result: getWorkspaceById(workspaceId),
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
            logAuth("jwt:dbWrite:saveUser", {
              userId: newUserId,
              result: getUserById(newUserId),
            });
            token.id          = newUserId;
            token.workspaceId = workspaceId;
            token.role        = "Owner";
            token.workspaceName = defaultName;
            console.log(`[JWT] Fallback: created user ${newUserId} + workspace ${workspaceId} for ${email}`);
          }
        } else {
          // User exists in session but not in DB (data inconsistency)
          logAuth("jwt:warning", {
            message: "No DB user found for email; workspaceId will be null",
            email,
          });
        }
      } else {
        logAuth("jwt:skipHydration", {
          reason: "account absent and workspaceId already present",
          tokenWorkspaceId: token.workspaceId || null,
        });
      }

      logAuth("jwt:return", {
        decision: "allow",
        value: token,
      });
      return token;
    },

    /**
     * Session callback — exposes workspaceId, workspaceName, role and DB UUID to the client.
     */
    async session({ session, token }) {
      logAuth("session:start", {
        email: session?.user?.email || null,
        tokenId: token?.id || null,
        tokenSub: token?.sub || null,
        workspaceId: token?.workspaceId || null,
        workspaceName: token?.workspaceName || null,
        role: token?.role || null,
      });

      if (session.user) {
        const sessionUserId = token.id || token.sub || null;
        const sessionEmail = session.user.email || token.email || null;
        const sessionWorkspace = findWorkspaceForUser({
          userId: sessionUserId,
          email: sessionEmail,
          workspaceId: token.workspaceId,
        });

        // token.id is now the DB UUID (set in the jwt callback); fall back to sub only if missing
        session.user.id = sessionUserId;
        session.user.email = sessionEmail;
        session.user.workspaceId = sessionWorkspace?.id || token.workspaceId || null;
        session.user.workspaceName = sessionWorkspace?.name || token.workspaceName || null;
        session.user.role = token.role || (sessionWorkspace?.ownerId === sessionUserId ? "Owner" : null);
        if (token.image) session.user.image = token.image;

        logAuth("session:workspaceSnapshot", {
          workspaceId: sessionWorkspace?.id || token.workspaceId || null,
          ownerId: sessionWorkspace?.ownerId || null,
          emailProvider: sessionWorkspace?.emailProvider || null,
          googleTokens: sessionWorkspace?.googleTokens || null,
          spreadsheetId: sessionWorkspace?.spreadsheetId || null,
        });
      }

      logAuth("session:return", {
        value: session,
      });
      return session;
    },

  },
});
