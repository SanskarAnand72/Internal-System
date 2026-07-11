import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import {
  getWorkspaceById,
  getUserByEmail,
  getUsersByWorkspace,
  createInvitation,
} from "@/lib/db";

// POST /api/team/invite
// Creates an invitation record and returns the invite link. Owner only.
// No email is sent here — the owner copies and shares the link manually.
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Only the Workspace Owner can invite members." }, { status: 403 });
  }

  const workspace = getWorkspaceById(session.user.workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { email, role = "Operator" } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const validRoles = ["Operator", "Viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Role must be Operator or Viewer" }, { status: 400 });
  }

  // Prevent inviting someone who's already in the workspace
  const existingUser = getUserByEmail(email.toLowerCase().trim());
  if (existingUser && existingUser.workspaceId === workspace.id) {
    return NextResponse.json({ error: "This user is already a member of the workspace." }, { status: 409 });
  }

  // Prevent inviting the owner themselves
  if (email.toLowerCase().trim() === workspace.ownerEmail.toLowerCase()) {
    return NextResponse.json({ error: "The workspace owner cannot be invited." }, { status: 400 });
  }

  const token = randomUUID();
  const id    = randomUUID();

  const invitation = createInvitation({
    id,
    token,
    email: email.toLowerCase().trim(),
    workspaceId:   workspace.id,
    role,
    invitedById:   session.user.id,
    invitedByName: session.user.name || session.user.email,
  });

  const baseUrl   = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite?token=${token}`;

  return NextResponse.json({
    invitation: {
      id:          invitation.id,
      token:       invitation.token,
      email:       invitation.email,
      role:        invitation.role,
      status:      invitation.status,
      invitedByName: invitation.invitedByName,
      expiresAt:   invitation.expiresAt,
    },
    inviteUrl,
  });
}
