import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findWorkspaceForUser, revokeInvitation, getInvitationByToken } from "@/lib/db";

// PATCH /api/team/revoke
// Revokes a pending invitation. Owner only.
export async function PATCH(req) {
  const session = await auth();
  const workspace = findWorkspaceForUser({ email: session?.user?.email || null });
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Only the Workspace Owner can revoke invitations." }, { status: 403 });
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
  }

  const invitation = getInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Ensure the invitation belongs to this workspace
  if (invitation.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (invitation.status !== "pending") {
    return NextResponse.json({ error: `Invitation is already ${invitation.status}.` }, { status: 400 });
  }

  const revoked = revokeInvitation(token);
  return NextResponse.json({ invitation: revoked });
}
