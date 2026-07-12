import { google } from "googleapis";
import { auth } from "@/auth";
import {
  getWorkspaceById,
  findWorkspaceForUser,
  updateWorkspace,
} from "./db";

/**
 * Returns an authenticated OAuth2 client using the WORKSPACE OWNER's tokens.
 *
 * Architecture rules:
 *  - All users in the workspace (Owner, Operator, Viewer, Admin) share the same
 *    Google connection — the tokens belonging to the Workspace Owner.
 *  - Invited members never connect their own Google account for data access.
 *  - If the access token is expired, the OAuth2 client automatically refreshes
 *    it using the stored refresh_token, then persists the new tokens to DB.
 *
 * Logs emitted:
 *  - userId, workspaceId, spreadsheetId, access token presence/expiry
 */
export async function getGoogleClient() {
  const session = await auth();

  const userId      = session?.user?.id    || "unknown";
  const resolvedWorkspace = session?.user
    ? findWorkspaceForUser({
        userId: session.user.id || null,
        email: session.user.email || null,
        workspaceId: session.user.workspaceId || null,
      })
    : null;
  const workspaceId = resolvedWorkspace?.id || session?.user?.workspaceId || null;

  console.log("[GoogleClient] ─────────────────────────────────────────");
  console.log(`[GoogleClient] userId        : ${userId}`);
  console.log(`[GoogleClient] workspaceId   : ${workspaceId || "NONE"}`);

  if (!session?.user?.email) {
    throw new Error("No active session / unauthorized");
  }

  if (!workspaceId) {
    console.error("[GoogleClient] ERROR: unable to resolve workspace for session user");
    throw new Error("User is not assigned to a workspace");
  }

  // Always use the WORKSPACE's tokens — never the individual user's
  const workspace = resolvedWorkspace || getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  console.log(`[GoogleClient] workspaceName : ${workspace.name}`);
  console.log(`[GoogleClient] ownerEmail    : ${workspace.ownerEmail}`);
  console.log(`[GoogleClient] spreadsheetId : ${workspace.spreadsheetId || "NONE"}`);
  console.log("[GoogleClient] workspaceSnapshot", {
    workspaceId: workspace.id,
    ownerId: workspace.ownerId,
    emailProvider: workspace.emailProvider || "gmail",
    googleTokens: workspace.googleTokens || null,
    spreadsheetId: workspace.spreadsheetId || "",
  });

  const tokens = workspace.googleTokens;
  const hasAccess  = !!tokens?.accessToken;
  const hasRefresh = !!tokens?.refreshToken;
  const expiresAt  = tokens?.expiresAt || null;
  const isExpired  = expiresAt ? new Date(expiresAt) < new Date() : false;

  console.log(`[GoogleClient] accessToken   : ${hasAccess  ? "present" : "MISSING"}`);
  console.log(`[GoogleClient] refreshToken  : ${hasRefresh ? "present" : "MISSING"}`);
  console.log(`[GoogleClient] expiresAt     : ${expiresAt || "unknown"}`);
  console.log(`[GoogleClient] tokenExpired  : ${isExpired}`);

  if (!hasAccess && !hasRefresh) {
    console.error("[GoogleClient] ERROR: no tokens in workspace record");
    throw new Error(
      "No Google connection found for this workspace. " +
      "The Workspace Owner must sign in to connect Google services."
    );
  }

  const clientId     = process.env.AUTH_GOOGLE_ID     || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/google`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  oauth2Client.setCredentials({
    access_token:  tokens.accessToken  || null,
    refresh_token: tokens.refreshToken || null,
    expiry_date:   expiresAt ? new Date(expiresAt).getTime() : null,
  });

  // Auto-refresh: when googleapis refreshes the access token, persist it to DB
  oauth2Client.on("tokens", (newTokens) => {
    console.log("[GoogleClient] Token refreshed by googleapis library");
    if (newTokens.access_token) {
      updateWorkspace(workspaceId, {
        googleTokens: {
          accessToken:  newTokens.access_token,
          refreshToken: newTokens.refresh_token || tokens.refreshToken,
          expiresAt:    newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : tokens.expiresAt,
        },
      });
      console.log("[GoogleClient] New access_token persisted to workspace DB");
    }
  });

  console.log("[GoogleClient] OAuth2 client ready");
  return oauth2Client;
}

/**
 * Look up the workspace for the current user and return the workspace record.
 */
export async function getCurrentWorkspace() {
  const session = await auth();
  if (!session?.user) return null;

  return findWorkspaceForUser({
    userId: session.user.id || null,
    email: session.user.email || null,
    workspaceId: session.user.workspaceId || null,
  });
}
