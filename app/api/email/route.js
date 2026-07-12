import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/googleClient";
import { auth } from "@/auth";
import { getEmailData } from "@/lib/email";

export const maxDuration = 30; // Extend serverless duration to accommodate IMAP handshakes

export async function GET(req) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "unknown";
    const workspaceId = session?.user?.workspaceId || "unknown";
    const workspace = await getCurrentWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace connected", message: "User is not assigned to a workspace" },
        { status: 400 }
      );
    }

    const emailData = await getEmailData(workspace);
    return NextResponse.json(emailData);

  } catch (e) {
    console.error("[Email API Endpoint ERROR]:", e.message);
    return NextResponse.json(
      { error: "No Data Connected", message: e.message },
      { status: 500 }
    );
  }
}
