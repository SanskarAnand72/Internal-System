import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, getWorkspaceById, updateUser, updateWorkspace } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.workspaceId) {
      const workspace = getWorkspaceById(user.workspaceId);
      if (workspace && workspace.ownerId === user.id) {
        updateWorkspace(workspace.id, { googleTokens: null });
      }
    }

    updateUser(user.id, {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    console.log(`[Google OAuth] Cleared stored tokens for ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect Google tokens:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}