import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findWorkspaceForUser, getUserById, removeUser } from "@/lib/db";

// DELETE /api/team/remove
// Remove a member from the workspace. Owner only.
// Owner cannot remove themselves.
export async function DELETE(req) {
  const session = await auth();
  const workspace = findWorkspaceForUser({ email: session?.user?.email || null });
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Only the Workspace Owner can remove members." }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Owner cannot remove themselves
  if (userId === session.user.id) {
    return NextResponse.json({ error: "You cannot remove yourself as the workspace owner." }, { status: 400 });
  }

  const targetUser = getUserById(userId);
  if (!targetUser || targetUser.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Member not found in this workspace." }, { status: 404 });
  }

  // Extra safeguard — never remove the workspace owner record
  if (workspace.ownerId === userId) {
    return NextResponse.json({ error: "The workspace owner cannot be removed." }, { status: 400 });
  }

  removeUser(userId);
  return NextResponse.json({ success: true });
}
