import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, updateUser, getWorkspaceById } from "@/lib/db";

// PATCH /api/team/role
// Change a workspace member's role. Owner only.
// Owner cannot be demoted via this endpoint — ownership transfer requires /api/team/transfer.
export async function PATCH(req) {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Only the Workspace Owner can change roles." }, { status: 403 });
  }

  const { userId, role } = await req.json();
  const validRoles = ["Operator", "Viewer"];

  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }

  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Role must be Operator or Viewer" }, { status: 400 });
  }

  const targetUser = getUserById(userId);
  if (!targetUser || targetUser.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Member not found in this workspace" }, { status: 404 });
  }

  // Owner cannot change their own role via this endpoint
  const workspace = getWorkspaceById(session.user.workspaceId);
  if (workspace.ownerId === userId) {
    return NextResponse.json({ error: "Owner role cannot be changed. Use ownership transfer." }, { status: 400 });
  }

  const updated = updateUser(userId, { role });
  return NextResponse.json({ user: { id: updated.id, email: updated.email, role: updated.role } });
}
