import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPendingInvitations } from "@/lib/db";

// GET /api/team/invitations
// Returns pending invitations for the current workspace. Owner only.
export async function GET() {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const invitations = getPendingInvitations(session.user.workspaceId);
  return NextResponse.json({ invitations });
}
