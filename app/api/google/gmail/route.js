import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleClient, getCurrentWorkspace } from "@/lib/googleClient";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const session     = await auth();
    const userId      = session?.user?.id          || "unknown";
    const workspaceId = session?.user?.workspaceId || "unknown";
    const workspace   = await getCurrentWorkspace();

    console.log("[Gmail API] ──────────────────────────────────────────────");
    console.log(`[Gmail API] userId        : ${userId}`);
    console.log(`[Gmail API] workspaceId   : ${workspaceId}`);
    console.log(`[Gmail API] ownerEmail    : ${workspace?.ownerEmail || "NONE"}`);
    console.log(`[Gmail API] accessToken   : ${workspace?.googleTokens?.accessToken ? "present" : "MISSING"}`);

    const authClient = await getGoogleClient();
    const gmail      = google.gmail({ version: "v1", auth: authClient });

    // ── Unread count ───────────────────────────────────────────────────────
    let unreadCount = 0;
    try {
      const labelRes = await gmail.users.labels.get({ userId: "me", id: "INBOX" });
      unreadCount    = labelRes.data.messagesUnread || 0;
    } catch (err) {
      console.warn("[Gmail API] Could not load unread inbox count:", err.message);
    }

    // ── Inbox threads ──────────────────────────────────────────────────────
    const inboxRes  = await gmail.users.threads.list({ userId: "me", maxResults: 15, q: "label:INBOX" });
    const threads   = inboxRes.data.threads || [];

    const threadDetails = [];
    const categories = {
      inbox:            0,
      sent:             0,
      replies:          0,
      interested:       [],
      meetingRequested: [],
      notInterested:    [],
      noResponse:       [],
    };

    // ── Sent threads ───────────────────────────────────────────────────────
    try {
      const sentRes     = await gmail.users.threads.list({ userId: "me", maxResults: 15, q: "label:SENT" });
      const sentThreads = sentRes.data.threads || [];
      categories.sent   = sentThreads.length;

      for (const st of sentThreads.slice(0, 8)) {
        const details  = await gmail.users.threads.get({ userId: "me", id: st.id });
        const messages = details.data.messages || [];
        if (messages.length === 1) {
          const lastMsg = messages[0];
          const snippet = lastMsg.snippet || "";
          const headers = lastMsg.payload?.headers || [];
          const subject  = headers.find(h => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
          const toHeader = headers.find(h => h.name.toLowerCase() === "to")?.value || "";

          categories.noResponse.push({
            id:       st.id,
            company:  toHeader.split("@")[1]?.split(".")?.[0]?.toUpperCase() || "Prospect",
            name:     toHeader.split("<")[0]?.trim() || "Contact",
            email:    toHeader.match(/<([^>]+)>/)?.[1] || toHeader,
            snippet,
            subject,
            time:     new Date(parseInt(lastMsg.internalDate)).toLocaleDateString(),
            category: "no-response",
          });
        }
      }
    } catch (err) {
      console.warn("[Gmail API] Could not load sent threads:", err.message);
    }

    // ── Inbox thread details + categorization ──────────────────────────────
    for (const thread of threads) {
      const details  = await gmail.users.threads.get({ userId: "me", id: thread.id });
      const messages = details.data.messages || [];
      if (messages.length === 0) continue;

      const lastMessage = messages[messages.length - 1];
      const snippet     = lastMessage.snippet || "";
      const headers     = lastMessage.payload?.headers || [];
      const subject     = headers.find(h => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
      const fromHeader  = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
      const dateHeader  = headers.find(h => h.name.toLowerCase() === "date")?.value || "";
      const labelIds    = lastMessage.labelIds || [];
      const bodyText    = snippet.toLowerCase();

      let category = "replies";
      if (bodyText.includes("not interested") || bodyText.includes("no budget") || bodyText.includes("no thanks") || bodyText.includes("pass for now") || bodyText.includes("unsubscribe") || bodyText.includes("another provider")) {
        category = "not-interested";
      } else if (bodyText.includes("meeting") || bodyText.includes("calendar") || bodyText.includes("schedule") || bodyText.includes("zoom") || bodyText.includes("call") || bodyText.includes("book") || bodyText.includes("meet")) {
        category = "meeting";
      } else if (bodyText.includes("interested") || bodyText.includes("discuss") || bodyText.includes("evaluating") || bodyText.includes("send over") || bodyText.includes("details")) {
        category = "interested";
      }

      const item = {
        id:       thread.id,
        company:  fromHeader.split("@")[1]?.split(".")?.[0]?.toUpperCase() || fromHeader.split(" ")[0] || "Client",
        name:     fromHeader.replace(/<.*>/, "").trim() || "Contact",
        email:    fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader,
        snippet,
        subject,
        date:     dateHeader,
        time:     new Date(parseInt(lastMessage.internalDate)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category,
        isUnread: labelIds.includes("UNREAD"),
      };

      threadDetails.push(item);

      if (category === "interested")       categories.interested.push(item);
      else if (category === "meeting")     categories.meetingRequested.push(item);
      else if (category === "not-interested") categories.notInterested.push(item);
      else                                    categories.replies++;
    }

    categories.inbox = threadDetails.length;

    console.log(`[Gmail API] Response       : ${threadDetails.length} inbox threads, ${unreadCount} unread`);

    return NextResponse.json({ unreadCount, threads: threadDetails, categories });

  } catch (e) {
    console.error("[Gmail API] ERROR:", e.message);
    return NextResponse.json(
      { error: "No Data Connected", message: e.message },
      { status: 500 }
    );
  }
}
