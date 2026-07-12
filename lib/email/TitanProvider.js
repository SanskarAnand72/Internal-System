import { BaseEmailProvider } from "./BaseEmailProvider";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { classifyEmail } from "./classify";
import { decrypt } from "../encryption";

/**
 * Helper to find the correct Sent mailbox path dynamically.
 */
async function findSentMailbox(client) {
  try {
    const status = await client.status("Sent", { exists: true });
    if (status) return "Sent";
  } catch (e) {
    // Silently check listing
  }

  try {
    const list = await client.list();
    for (const mailbox of list) {
      const name = mailbox.name.toLowerCase();
      if (name === "sent" || name === "sent items" || name === "sent messages" || name.includes("sent")) {
        return mailbox.path;
      }
    }
  } catch (e) {
    console.warn("[TitanProvider] Error listing mailboxes:", e.message);
  }

  return "Sent"; // Fallback default
}

export class TitanProvider extends BaseEmailProvider {
  /**
   * Fetch inbox and sent emails from Titan Email via IMAP.
   * Decrypts the password for IMAP connectivity.
   *
   * @returns {Promise<{ unreadCount: number, threads: Array, categories: Object }>}
   */
  async fetchEmails() {
    const creds = this.workspace?.titanCredentials;
    if (!creds || !creds.email || !creds.password) {
      throw new Error("Missing Titan IMAP credentials in workspace");
    }

    const decryptedPassword = decrypt(creds.password);

    const client = new ImapFlow({
      host: creds.host || "imap.titan.email",
      port: parseInt(creds.imapPort) || 993,
      secure: true,
      auth: {
        user: creds.email,
        pass: decryptedPassword,
      },
      connectionTimeout: 8000,
      logger: false,
    });

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
      console.log(`[TitanProvider] Connecting to IMAP: ${creds.email}`);
      await client.connect();

      // 1. Read Inbox
      let inboxLock = await client.getMailboxLock("INBOX");
      try {
        const searchResult = await client.search({ seen: false });
        unreadCount = searchResult.length;

        const totalExists = client.mailbox.exists;
        if (totalExists > 0) {
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

      threadDetails.reverse();

      // 2. Read Sent folder for "no-response" detection
      const sentMailboxPath = await findSentMailbox(client);
      console.log(`[TitanProvider] Opening sent folder: ${sentMailboxPath}`);
      
      let sentLock = await client.getMailboxLock(sentMailboxPath);
      try {
        const totalExists = client.mailbox.exists;
        categories.sent = totalExists;

        if (totalExists > 0) {
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
   * Send an email via Titan SMTP.
   * Decrypts the password for SMTP connectivity.
   *
   * @param {Object} mailOptions
   */
  async sendEmail(mailOptions) {
    const creds = this.workspace?.titanCredentials;
    if (!creds || !creds.email || !creds.password) {
      throw new Error("Missing Titan SMTP credentials in workspace");
    }

    const decryptedPassword = decrypt(creds.password);
    const smtpPort = parseInt(creds.smtpPort) || 465;
    const isSecure = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: creds.smtpHost || "smtp.titan.email",
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: creds.email,
        pass: decryptedPassword,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });

    const options = {
      from: `"${creds.email.split("@")[0]}" <${creds.email}>`,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
    };

    console.log(`[TitanProvider] Sending SMTP mail from ${creds.email} to ${mailOptions.to}`);
    return await transporter.sendMail(options);
  }

  /**
   * Test connection to incoming (IMAP) and outgoing (SMTP) servers.
   * Decrypts the password to perform test authentication.
   *
   * @returns {Promise<{ imapConnected: boolean, smtpConnected: boolean }>}
   */
  async testConnection() {
    const creds = this.workspace?.titanCredentials;
    if (!creds || !creds.email || !creds.password) {
      throw new Error("Missing Titan connection credentials");
    }

    const password = decrypt(creds.password);
    
    let imapConnected = false;
    let smtpConnected = false;
    let imapError = null;
    let smtpError = null;

    // 1. Test IMAP
    const imapClient = new ImapFlow({
      host: creds.host || "imap.titan.email",
      port: parseInt(creds.imapPort) || 993,
      secure: true,
      auth: {
        user: creds.email,
        pass: password,
      },
      connectionTimeout: 5000,
      logger: false,
    });
    
    imapClient.on("error", () => {});

    try {
      await imapClient.connect();
      imapConnected = true;
      await imapClient.logout();
    } catch (e) {
      imapError = e.message;
    }

    // 2. Test SMTP
    const smtpPort = parseInt(creds.smtpPort) || 465;
    const transporter = nodemailer.createTransport({
      host: creds.smtpHost || "smtp.titan.email",
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: creds.email,
        pass: password,
      },
      connectionTimeout: 5000,
    });

    try {
      await transporter.verify();
      smtpConnected = true;
    } catch (e) {
      smtpError = e.message;
    }

    if (!imapConnected || !smtpConnected) {
      const imapMsg = imapConnected ? "✓ Connected" : `✗ Failed: ${imapError}`;
      const smtpMsg = smtpConnected ? "✓ Connected" : `✗ Failed: ${smtpError}`;
      throw new Error(`IMAP: ${imapMsg} | SMTP: ${smtpMsg}`);
    }

    return { imapConnected, smtpConnected };
  }
}
