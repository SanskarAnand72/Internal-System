import { NextResponse } from "next/server";
import { getInvitationByToken, getWorkspaceById } from "@/lib/db";

// GET /api/team/accept?token=xxx
// PUBLIC endpoint — no auth required.
// Used by the /invite page to fetch workspace name + inviter before the user logs in.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invitation = getInvitationByToken(token);

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found or invalid." }, { status: 404 });
  }

  if (invitation.status === "revoked") {
    return NextResponse.json({ error: "This invitation has been revoked by the workspace owner." }, { status: 410 });
  }

  if (invitation.status === "accepted") {
    return NextResponse.json({ error: "This invitation has already been accepted." }, { status: 410 });
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This invitation link has expired." }, { status: 410 });
  }

  const workspace = getWorkspaceById(invitation.workspaceId);

  return NextResponse.json({
    valid:         true,
    email:         invitation.email,
    role:          invitation.role,
    invitedByName: invitation.invitedByName,
    workspaceName: workspace?.name || "Workspace",
    expiresAt:     invitation.expiresAt,
  });
}
