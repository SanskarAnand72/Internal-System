import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import {
  getWorkspaceById,
  updateWorkspace,
  createWorkspace,
  getUserByEmail,
  getUsersByWorkspace,
  updateUser,
} from "@/lib/db";

// ── GET /api/workspace ────────────────────────────────────────────────────────
// Returns the current user's workspace info.
export async function GET() {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  const workspace = getWorkspaceById(session.user.workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const members = getUsersByWorkspace(workspace.id);

  return NextResponse.json({
    id:            workspace.id,
    name:          workspace.name,
    ownerId:       workspace.ownerId,
    ownerEmail:    workspace.ownerEmail,
    spreadsheetId: workspace.spreadsheetId || "",
    googleConnected: !!(workspace.googleTokens?.accessToken),
    memberCount:   members.length,
    createdAt:     workspace.createdAt,
  });
}

// ── POST /api/workspace ───────────────────────────────────────────────────────
// Called from /onboard to create a new workspace for a first-time owner.
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = getUserByEmail(session.user.email);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent creating a second workspace
  if (dbUser.workspaceId) {
    return NextResponse.json({ error: "User already has a workspace" }, { status: 400 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  const workspaceId = randomUUID();

  // Move any Google tokens from the user record to the workspace
  const googleTokens = dbUser.accessToken
    ? {
        accessToken:  dbUser.accessToken,
        refreshToken: dbUser.refreshToken || null,
        expiresAt:    dbUser.expiresAt    || null,
      }
    : null;

  const workspace = createWorkspace({
    id:          workspaceId,
    name:        name.trim(),
    ownerId:     dbUser.id,
    ownerEmail:  dbUser.email,
    googleTokens,
    spreadsheetId: "",
  });

  // Assign user to workspace as Owner, strip tokens from user record
  updateUser(dbUser.id, {
    workspaceId,
    role:         "Owner",
    status:       "active",
    accessToken:  null,   // Tokens now live on the workspace
    refreshToken: null,
    expiresAt:    null,
  });

  return NextResponse.json({ workspace });
}

// ── PATCH /api/workspace ──────────────────────────────────────────────────────
// Update workspace name or spreadsheetId. Owner only.
export async function PATCH(req) {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    console.log("[PATCH /api/workspace] Unauthorized — no workspaceId in session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = getWorkspaceById(session.user.workspaceId);
  if (!workspace) {
    console.log(`[PATCH /api/workspace] Workspace not found for ID: ${session.user.workspaceId}`);
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  console.log(`[PATCH /api/workspace] Current session role: "${session.user.role}"`);

  // Only the Owner can patch workspace settings
  if (session.user.role !== "Owner") {
    console.log(`[PATCH /api/workspace] Forbidden — role is "${session.user.role}", not "Owner"`);
    return NextResponse.json({ error: "Forbidden — Owner only" }, { status: 403 });
  }

  const body = await req.json();
  console.log("[PATCH /api/workspace] Received body:", JSON.stringify(body));

  const patch = {};
  if (body.name             !== undefined) patch.name              = body.name.trim();
  if (body.spreadsheetId    !== undefined) patch.spreadsheetId     = body.spreadsheetId.trim();
  if (body.emailProvider    !== undefined) patch.emailProvider     = body.emailProvider;
  if (body.titanCredentials !== undefined) patch.titanCredentials  = body.titanCredentials;

  console.log("[PATCH /api/workspace] Applying patch:", JSON.stringify(patch));

  const updated = updateWorkspace(workspace.id, patch);
  console.log("[PATCH /api/workspace] Updated record in DB:", JSON.stringify(updated));

  return NextResponse.json({ workspace: updated });
}
