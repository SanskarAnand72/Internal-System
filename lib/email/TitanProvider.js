import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { classifyEmail } from "./classify";

/**
 * Helper to find the correct Sent mailbox path dynamically.
 */
async function findSentMailbox(client) {
  try {
    // Try standard "Sent" first
    const status = await client.status("Sent", { exists: true });
    if (status) return "Sent";
  } catch (e) {
    // Silently proceed to check list
  }

  try {
    const list = await client.list();
    for (const mailbox of list) {
      const name = mailbox.name.toLowerCase();
      // Check for common sent folder names
      if (name === "sent" || name === "sent items" || name === "sent messages" || name.includes("sent")) {
        return mailbox.path;
      }
    }
  } catch (e) {
    console.warn("[TitanProvider] Error listing mailboxes:", e.message);
  }

  return "Sent"; // Fallback default
}

/**
 * Fetch inbox and sent emails from Titan Email via IMAP.
 *
 * @param {Object} credentials - Titan IMAP credentials
 * @param {string} credentials.host - IMAP Host (e.g., imap.titan.email)
 * @param {number} credentials.imapPort - IMAP Port (e.g., 993)
 * @param {string} credentials.email - Email address
 * @param {string} credentials.password - Password
 * @returns {Promise<Object>} Unified email data
 */
export async function fetchTitanData(credentials) {
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error("Missing Titan IMAP credentials");
  }

  const client = new ImapFlow({
    host: credentials.host || "imap.titan.email",
    port: parseInt(credentials.imapPort) || 993,
    secure: true,
    auth: {
      user: credentials.email,
      pass: credentials.password,
    },
    connectionTimeout: 8000,
    logger: false,
  });

  // Prevent uncaught errors from crashing the Node process
  client.on("error", (err) => {
    console.error("[TitanProvider IMAP Error]:", err.message);
  });

  const categories = {
    inbox: 0,
    sent: 0,
    replies: 0,
    interested: [],
    meetingRequested: [],
    notInterested: [],
    noResponse: [],
  };

  const threadDetails = [];
  let unreadCount = 0;

  try {
    console.log(`[TitanProvider] Connecting to IMAP: ${credentials.email}`);
    await client.connect();

    // 1. Read Inbox
    let inboxLock = await client.getMailboxLock("INBOX");
    try {
      // Find unread count
      const searchResult = await client.search({ seen: false });
      unreadCount = searchResult.length;

      const totalExists = client.mailbox.exists;
      if (totalExists > 0) {
        // Fetch up to 15 latest emails
        const startRange = Math.max(1, totalExists - 14);
        const range = `${startRange}:${totalExists}`;

        for await (const message of client.fetch(range, { envelope: true, source: true, flags: true, internalDate: true })) {
          try {
            const parsed = await simpleParser(message.source);
            const snippet = parsed.textAsHtml || parsed.text || "";
            const cleanSnippet = snippet.replace(/<[^>]*>/g, " ").substring(0, 200).trim();
            const fromHeader = parsed.from?.text || parsed.headers?.get("from") || "";
            const subject = parsed.subject || "(No Subject)";
            
            const category = classifyEmail(cleanSnippet);
            const isUnread = !message.flags.has("\\Seen");

            const item = {
              id: message.uid.toString(),
              company: fromHeader.split("@")[1]?.split(".")?.[0]?.toUpperCase() || fromHeader.split(" ")[0] || "Client",
              name: fromHeader.replace(/<.*>/, "").trim() || "Contact",
              email: fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader,
              snippet: cleanSnippet,
              subject,
              date: parsed.date ? parsed.date.toISOString() : new Date(message.internalDate).toISOString(),
              time: new Date(message.internalDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              category,
              isUnread,
            };

            threadDetails.push(item);

            if (category === "interested") categories.interested.push(item);
            else if (category === "meeting") categories.meetingRequested.push(item);
            else if (category === "not-interested") categories.notInterested.push(item);
            else categories.replies++;
          } catch (fetchErr) {
            console.error("[TitanProvider] Error parsing message in inbox:", fetchErr.message);
          }
        }
      }
    } finally {
      inboxLock.release();
    }

    // Sort inbox threads descending by date/time (latest first)
    threadDetails.reverse();

    // 2. Read Sent folder for "no-response" detection
    const sentMailboxPath = await findSentMailbox(client);
    console.log(`[TitanProvider] Opening sent folder: ${sentMailboxPath}`);
    
    let sentLock = await client.getMailboxLock(sentMailboxPath);
    try {
      const totalExists = client.mailbox.exists;
      categories.sent = totalExists;

      if (totalExists > 0) {
        // Fetch up to 8 latest sent emails
        const startRange = Math.max(1, totalExists - 7);
        const range = `${startRange}:${totalExists}`;

        for await (const message of client.fetch(range, { envelope: true, source: true, flags: true, internalDate: true })) {
          try {
            const parsed = await simpleParser(message.source);
            const snippet = parsed.textAsHtml || parsed.text || "";
            const cleanSnippet = snippet.replace(/<[^>]*>/g, " ").substring(0, 200).trim();
            const toHeader = parsed.to?.text || parsed.headers?.get("to") || "";
            const subject = parsed.subject || "(No Subject)";

            categories.noResponse.push({
              id: message.uid.toString(),
              company: toHeader.split("@")[1]?.split(".")?.[0]?.toUpperCase() || "Prospect",
              name: toHeader.split("<")[0]?.trim() || "Contact",
              email: toHeader.match(/<([^>]+)>/)?.[1] || toHeader,
              snippet: cleanSnippet,
              subject,
              time: parsed.date ? new Date(parsed.date).toLocaleDateString() : new Date(message.internalDate).toLocaleDateString(),
              category: "no-response",
            });
          } catch (fetchErr) {
            console.error("[TitanProvider] Error parsing message in sent:", fetchErr.message);
          }
        }
      }
    } finally {
      sentLock.release();
    }

    // Sort sent messages descending
    categories.noResponse.reverse();

  } catch (err) {
    console.error("[TitanProvider] IMAP operations failed:", err.message);
    throw err;
  } finally {
    try {
      await client.logout();
    } catch (logoutErr) {
      // Ignored
    }
  }

  categories.inbox = threadDetails.length;

  return {
    unreadCount,
    threads: threadDetails,
    categories,
  };
}

/**
 * Send an email via SMTP.
 *
 * @param {Object} credentials - Titan SMTP credentials
 * @param {string} credentials.host - SMTP Host (e.g., smtp.titan.email)
 * @param {number} credentials.smtpPort - SMTP Port (e.g., 465 or 587)
 * @param {string} credentials.email - Email address
 * @param {string} credentials.password - Password
 * @param {Object} mailOptions - Mail content options
 * @param {string} mailOptions.to - Recipient email
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.text - Text body
 * @param {string} mailOptions.html - HTML body (optional)
 * @returns {Promise<Object>} Nodemailer send status
 */
export async function sendTitanEmail(credentials, mailOptions) {
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error("Missing Titan SMTP credentials");
  }

  const smtpPort = parseInt(credentials.smtpPort) || 465;
  const isSecure = smtpPort === 465; // Port 465 uses SSL/TLS, Port 587 uses STARTTLS

  const transporter = nodemailer.createTransport({
    host: credentials.host || "smtp.titan.email",
    port: smtpPort,
    secure: isSecure,
    auth: {
      user: credentials.email,
      pass: credentials.password,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  const options = {
    from: `"${credentials.email.split("@")[0]}" <${credentials.email}>`,
    to: mailOptions.to,
    subject: mailOptions.subject,
    text: mailOptions.text,
    html: mailOptions.html,
  };

  console.log(`[TitanProvider] Sending SMTP mail from ${credentials.email} to ${mailOptions.to}`);
  return await transporter.sendMail(options);
}
