import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getInvitationByToken,
  getUserByEmail,
  updateUser,
  deleteInvitation,
  getUsersByWorkspace,
} from "@/lib/db";

// POST /api/team/join
// Called from the /join page after Google OAuth completes.
// Assigns the authenticated user to the workspace specified by the invitation token.
// A member joining via invitation can NEVER become the workspace owner.
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
  }

  const invitation = getInvitationByToken(token);

  // Validate invitation
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found or invalid." }, { status: 404 });
  }
  if (invitation.status === "revoked") {
    return NextResponse.json({ error: "This invitation has been revoked." }, { status: 410 });
  }
  if (new Date(invitation.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This invitation link has expired." }, { status: 410 });
  }

  // The joining user's email MUST match the invitation email
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({
      error: `This invitation was sent to ${invitation.email}. Please sign in with that account.`,
    }, { status: 403 });
  }

  const dbUser = getUserByEmail(session.user.email);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only prevent joining if the user already belongs to a DIFFERENT active team workspace
  // (meaning a workspace that contains other members besides the user themselves).
  if (dbUser.workspaceId && dbUser.workspaceId !== invitation.workspaceId) {
    const otherMembers = getUsersByWorkspace(dbUser.workspaceId).filter(u => u.id !== dbUser.id);
    if (otherMembers.length > 0) {
      return NextResponse.json({
        error: "You are already a member of a different active team workspace.",
      }, { status: 409 });
    }
  }

  // Assign user to workspace with the role from the invitation.
  // Role is ALWAYS what the Owner specified — never Owner itself.
  const safeRole = ["Operator", "Viewer"].includes(invitation.role) ? invitation.role : "Operator";

  updateUser(dbUser.id, {
    workspaceId: invitation.workspaceId,
    role:        safeRole,
    status:      "active",
    // Members never store Google tokens — identity only
    accessToken:  null,
    refreshToken: null,
    expiresAt:    null,
  });

  // Remove the invitation record completely from invitations.json
  deleteInvitation(token);

  return NextResponse.json({ success: true, role: safeRole, workspaceId: invitation.workspaceId });
}
