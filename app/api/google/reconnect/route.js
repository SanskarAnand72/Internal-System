import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, getWorkspaceById, updateWorkspace } from "@/lib/db";

/**
 * POST /api/google/reconnect
 *
 * Clears the workspace's stored Google tokens so the owner is forced
 * to re-authenticate on the next login. This allows upgrading to a
 * token with the full required scope set (Gmail + Calendar + Sheets).
 *
 * Only the Workspace Owner can invoke this endpoint.
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "Owner") {
      return NextResponse.json(
        { error: "Only the Workspace Owner can reconnect Google services." },
        { status: 403 }
      );
    }

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const workspace = getWorkspaceById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Clear all Google tokens — the next owner sign-in will re-populate them
    updateWorkspace(workspaceId, { googleTokens: null });

    console.log(`[Google Reconnect] Cleared tokens for workspace ${workspaceId} (${workspace.name})`);
    console.log(`[Google Reconnect] Owner must sign out and sign back in to reconnect.`);

    return NextResponse.json({
      success: true,
      message: "Google tokens cleared. Please sign out and sign back in to reconnect all Google services.",
    });
  } catch (error) {
    console.error("[Google Reconnect] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
