import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findWorkspaceForUser, getPendingInvitations } from "@/lib/db";

// GET /api/team/invitations
// Returns pending invitations for the current workspace. Owner only.
export async function GET() {
  const session = await auth();
  const workspace = findWorkspaceForUser({ email: session?.user?.email || null });
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const invitations = getPendingInvitations(workspace.id);
  return NextResponse.json({ invitations });
}
