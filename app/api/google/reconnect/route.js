import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findWorkspaceForUser, updateWorkspace } from "@/lib/db";

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

    const workspace = findWorkspaceForUser({ email: session.user.email });
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    console.log("[Google Reconnect] workspaceSnapshot:before", {
      workspaceId: workspace.id,
      ownerId: workspace.ownerId,
      emailProvider: workspace.emailProvider || "gmail",
      googleTokens: workspace.googleTokens || null,
      spreadsheetId: workspace.spreadsheetId || "",
    });

    // Preserve Google tokens; sign-out/sign-in will refresh them without losing the current workspace record.
    updateWorkspace(workspace.id, { updatedAt: new Date().toISOString() });

    console.log(`[Google Reconnect] Cleared tokens for workspace ${workspace.id} (${workspace.name})`);
    console.log(`[Google Reconnect] Owner must sign out and sign back in to reconnect.`);
    console.log("[Google Reconnect] workspaceSnapshot:after", {
      workspaceId: workspace.id,
      ownerId: workspace.ownerId,
      emailProvider: workspace.emailProvider || "gmail",
      googleTokens: findWorkspaceForUser({ email: session.user.email })?.googleTokens || null,
      spreadsheetId: findWorkspaceForUser({ email: session.user.email })?.spreadsheetId || "",
    });

    return NextResponse.json({
      success: true,
      message: "Google reconnect requested. Please sign out and sign back in to refresh Google services.",
    });
  } catch (error) {
    console.error("[Google Reconnect] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
