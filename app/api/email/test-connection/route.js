import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentWorkspace } from "@/lib/googleClient";
import { getEmailProvider } from "@/lib/email";
import { TitanProvider } from "@/lib/email/TitanProvider";
import { encrypt } from "@/lib/encryption";

export const maxDuration = 20; // 20s execution limit for testing connections

export async function POST(req) {
  try {
    const session = await auth();
    console.log("[Test Connection] claims", {
      sessionEmail: session?.user?.email || null,
    });

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    console.log("[Test Connection] resolvedWorkspace", {
      workspaceId: workspace.id,
      ownerId: workspace.ownerId,
    });

    const body = await req.json();
    const providerName = body.emailProvider || workspace.emailProvider || "gmail";

    if (providerName === "gmail") {
      const provider = getEmailProvider(workspace);
      const testResult = await provider.testConnection();
      return NextResponse.json({ success: true, ...testResult });
    }

    if (providerName === "titan") {
      const credentials = body.titanCredentials;
      if (!credentials || !credentials.email || !credentials.password) {
        return NextResponse.json({ error: "Missing Titan credentials to test" }, { status: 400 });
      }

      let testPassword = credentials.password;
      if (testPassword === "••••••••") {
        testPassword = workspace.titanCredentials?.password || "";
      } else {
        // Encrypt plain input so TitanProvider can decrypt it successfully
        testPassword = encrypt(testPassword);
      }

      const tempWorkspace = {
        ...workspace,
        titanCredentials: {
          ...credentials,
          password: testPassword,
        },
      };

      const provider = new TitanProvider(tempWorkspace);
      const testResult = await provider.testConnection();
      return NextResponse.json({ success: true, ...testResult });
    }

    return NextResponse.json({ error: `Unsupported email provider: ${providerName}` }, { status: 400 });

  } catch (e) {
    console.error("[Test Connection API ERROR]:", e.message);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 200 } // Keep 200 but success: false, so clients can read the message cleanly
    );
  }
}
