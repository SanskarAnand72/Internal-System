import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleClient, getCurrentWorkspace } from "@/lib/googleClient";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const session     = await auth();
    const userId      = session?.user?.id          || "unknown";
    const workspace   = await getCurrentWorkspace();
    console.log("[Calendar API] claims", {
      sessionUserId: session?.user?.id || null,
      sessionEmail: session?.user?.email || null,
    });

    console.log("[Calendar API] ───────────────────────────────────────────");
    console.log(`[Calendar API] userId        : ${userId}`);
    console.log(`[Calendar API] workspaceId   : ${workspace?.id || "unknown"}`);
    console.log(`[Calendar API] ownerEmail    : ${workspace?.ownerEmail || "NONE"}`);
    console.log(`[Calendar API] accessToken   : ${workspace?.googleTokens?.accessToken ? "present" : "MISSING"}`);
    console.log("[Calendar API] resolvedWorkspace", {
      workspaceId: workspace?.id || null,
      ownerId: workspace?.ownerId || null,
      emailProvider: workspace?.emailProvider || null,
      googleTokens: workspace?.googleTokens || null,
      spreadsheetId: workspace?.spreadsheetId || null,
    });

    const authClient = await getGoogleClient();
    const calendar   = google.calendar({ version: "v3", auth: authClient });

    const now      = new Date();
    const rangeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const rangeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    const response = await calendar.events.list({
      calendarId:  "primary",
      timeMin:     rangeMin.toISOString(),
      timeMax:     rangeMax.toISOString(),
      singleEvents: true,
      orderBy:     "startTime",
      maxResults:  50,
    });

    const events    = response.data.items || [];
    const upcoming  = [];
    const completed = [];

    events.forEach(e => {
      const start = e.start?.dateTime || e.start?.date;
      const end   = e.end?.dateTime   || e.end?.date;
      if (!start) return;

      const startTime  = new Date(start);
      const isUpcoming = startTime >= now;

      const durationMs  = end ? new Date(end).getTime() - startTime.getTime() : 30 * 60 * 1000;
      const durationMin = Math.round(durationMs / 60 / 1000);

      // Parse value from event description if available (no hardcoded fallback)
      const descText  = (e.description || "").toLowerCase();
      const valMatch  = descText.match(/\$[\d,]+k?/i) || (e.summary || "").match(/\$[\d,]+k?/i);
      const eventValue = valMatch ? valMatch[0].toUpperCase() : null; // null = no value, let UI match from Sheets

      const item = {
        id:       e.id,
        title:    e.summary || "Discovery Call",
        company:  e.summary?.split("—")?.[0]?.trim() || e.summary?.split("·")?.[0]?.trim() || "Client",
        time:     startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: `${durationMin} min`,
        day:      startTime.getDate().toString(),
        month:    startTime.toLocaleString("en-US", { month: "short" }).toUpperCase(),
        type:     e.hangoutLink ? "video" : "phone",
        value:    eventValue, // null if not in event — frontend correlates with Sheet lead value
        link:     e.hangoutLink || e.location || null,
        status:   e.status === "confirmed" ? "confirmed" : "pending",
        outcome:  isUpcoming ? "Scheduled" : "Completed",
      };

      if (isUpcoming) upcoming.push(item);
      else completed.push(item);
    });

    console.log(`[Calendar API] Response     : ${upcoming.length} upcoming, ${completed.length} completed`);

    return NextResponse.json({
      upcoming:  upcoming.slice(0, 15),
      completed: completed.slice(0, 15),
    });

  } catch (e) {
    console.error("[Calendar API] ERROR:", {
      message: e.message,
      code: e.code || null,
      status: e?.response?.status || null,
      response: e?.response?.data || null,
    });
    return NextResponse.json(
      { error: "No Data Connected", message: e.message },
      { status: 500 }
    );
  }
}
