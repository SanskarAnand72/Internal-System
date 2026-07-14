import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findWorkspaceForUser, getUsersByWorkspace } from "@/lib/db";

// GET /api/team/members
// Returns all members of the current workspace.
export async function GET() {
  const session = await auth();
  const workspace = findWorkspaceForUser({ email: session?.user?.email || null });
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = getUsersByWorkspace(workspace.id).map((u) => ({
    id:          u.id,
    name:        u.name,
    email:       u.email,
    image:       u.image || null,
    role:        u.role,
    status:      u.status,
    lastLogin:   u.lastLogin || null,
    createdAt:   u.createdAt || null,
    isOwner:     u.id === workspace.ownerId,
  }));

  return NextResponse.json({ members });
}
