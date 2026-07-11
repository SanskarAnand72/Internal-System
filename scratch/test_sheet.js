import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSPACES_FILE   = path.join(DATA_DIR, 'workspaces.json');

const workspaces = JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf-8'));
const workspace = workspaces[0];

console.log("=== WORKSPACE DB RECORD (AFTER SAVE) ===");
console.log(JSON.stringify({
  id: workspace.id,
  name: workspace.name,
  ownerEmail: workspace.ownerEmail,
  spreadsheetId: workspace.spreadsheetId,
  googleTokens: workspace.googleTokens ? {
    accessToken: workspace.googleTokens.accessToken ? "present" : "MISSING",
    refreshToken: workspace.googleTokens.refreshToken ? "present" : "MISSING",
    expiresAt: workspace.googleTokens.expiresAt
  } : null
}, null, 2));

async function run() {
  try {
    const tokens = workspace.googleTokens;
    const clientId     = process.env.AUTH_GOOGLE_ID     || process.env.GOOGLE_CLIENT_ID || "33947493264-b52b2h2qf4b5tcl97h75412l73sfgf7u.apps.googleusercontent.com";
    const clientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "GOCSPX-q_kZzW2Q-Mv-eE4M-L9HwV5d2w2";
    const redirectUri  = "http://localhost:3000/api/auth/callback/google";

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({
      access_token:  tokens.accessToken  || null,
      refresh_token: tokens.refreshToken || null,
      expiry_date:   tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : null,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    
    // Fetch metadata to find sheet title
    const spreadsheetId = workspace.spreadsheetId;
    console.log(`\nFetching spreadsheet metadata for ID: "${spreadsheetId}"...`);
    const metadata  = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = metadata.data.sheets?.[0]?.properties?.title || "Sheet1";
    console.log(`First sheet title detected: "${sheetName}"`);

    const response  = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("Empty sheet.");
      return;
    }

    const headers = rows[0];
    console.log(`Headers found: ${JSON.stringify(headers)}`);

    // Mapping logic matching route.js
    const REQUIRED_HEADERS = ["Company", "Contact Name", "Lead Status"];
    const OPTIONAL_HEADERS = [
      "Email", "Phone", "Country", "Last Contact", "Next Followup", 
      "Interested", "Meeting", "Estimated", "Notes"
    ];
    
    const FIELD_ALIASES = {
      "Company": ["company", "client", "business"],
      "Contact Name": ["contactname", "name", "contact", "lead", "leadname"],
      "Email": ["email", "emailaddress", "mail", "contactemail"],
      "Phone": ["phone", "phonenumber", "telephone", "mobile"],
      "Country": ["country", "nation", "region"],
      "Lead Status": ["leadstatus", "status", "tier"],
      "Last Contact": ["lastcontact", "lastcontacted", "lastcontactdate"],
      "Next Followup": ["nextfollowup", "nextaction", "followup", "action", "nextfollowup"],
      "Interested": ["interested", "interest"],
      "Meeting": ["meeting", "meetingscheduled", "appointment", "meetingrequested"],
      "Estimated": ["estimated", "value", "amount", "price", "proposalvalue", "estvalue", "estimatedrevenue", "revenue"],
      "Notes": ["notes", "note", "comments"]
    };

    function normalizeHeader(h) {
      return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    const colIndices = {};
    for (const field of REQUIRED_HEADERS) {
      const aliases = FIELD_ALIASES[field];
      const index = headers.findIndex(h => aliases.includes(normalizeHeader(h)));
      if (index === -1) {
        throw new Error(`Missing required header: "${field}"`);
      }
      colIndices[field] = index;
    }

    for (const field of OPTIONAL_HEADERS) {
      const aliases = FIELD_ALIASES[field];
      const index = headers.findIndex(h => aliases.includes(normalizeHeader(h)));
      colIndices[field] = index;
    }

    const dataRows = rows.slice(1);
    const queueData = [];
    let totalRev = 0;
    let recoverableCount = 0;
    let interestedYesCount = 0;

    function parseEstimated(valStr) {
      if (!valStr) return 0;
      let clean = valStr.trim().replace(/[\$,]/g, "");
      let multiplier = 1;
      if (clean.toLowerCase().endsWith("k")) {
        multiplier = 1000;
        clean = clean.slice(0, -1);
      } else if (clean.toLowerCase().endsWith("m")) {
        multiplier = 1000000;
        clean = clean.slice(0, -1);
      }
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val * multiplier;
    }

    dataRows.forEach((row, idx) => {
      if (row.length === 0) return;
      const getVal = (field) => {
        const colIdx = colIndices[field];
        if (colIdx === undefined || colIdx === -1) return "";
        return row[colIdx] !== undefined ? String(row[colIdx]).trim() : "";
      };

      const company = getVal("Company");
      const name = getVal("Contact Name");
      const email = getVal("Email");
      const phone = getVal("Phone");
      const country = getVal("Country");
      const leadStatus = getVal("Lead Status");
      const lastContact = getVal("Last Contact");
      const nextFollowup = getVal("Next Followup");
      const interested = getVal("Interested");
      const meeting = getVal("Meeting");
      const estimated = getVal("Estimated");
      const notes = getVal("Notes");

      if (leadStatus.toLowerCase() !== "not interested") {
        recoverableCount++;
      }
      if (interested.toLowerCase() === "yes") {
        interestedYesCount++;
      }
      totalRev += parseEstimated(estimated);

      let score = 50;
      if (interested.toLowerCase() === "yes") score = 95;
      else if (meeting.toLowerCase() === "yes") score = 85;
      else if (leadStatus.toLowerCase() === "not interested") score = 10;
      else if (leadStatus.toLowerCase() === "interested") score = 80;

      let tier = "medium";
      if (score >= 80) tier = "high";
      else if (score < 30) tier = "low";

      queueData.push({
        id: idx + 1,
        company: company || "Unknown Company",
        name: name || "Unknown Contact",
        email,
        phone,
        country,
        status: leadStatus || "Email ready",
        contact: lastContact || "—",
        action: nextFollowup || "Send Recovery Email",
        interested,
        meeting,
        val: estimated || "$0",
        notes,
        score,
        tier
      });
    });

    const totalRows = dataRows.length;
    const aiConfidence = totalRows > 0 ? Math.round((interestedYesCount / totalRows) * 100) : 0;

    const payload = {
      sheetName,
      sheetData: {
        headers,
        rows: dataRows
      },
      overviewMetrics: {
        rows: totalRows,
        opp: recoverableCount,
        rev: totalRev,
        conf: aiConfidence
      },
      queueData,
      recoveryData: queueData,
      // Backward compatibility fields
      leads: queueData,
      rows: totalRows,
      opp: recoverableCount,
      rev: totalRev,
      conf: aiConfidence
    };

    console.log("\n=== GET /api/google/sheet RESPONSE PAYLOAD ===");
    console.log(JSON.stringify({
      rows: payload.rows,
      opp: payload.opp,
      rev: payload.rev,
      conf: payload.conf,
      leads: payload.leads.slice(0, 2) // show first 2 leads as sample representation
    }, null, 2));

  } catch (error) {
    console.error("Execution failed:", error);
  }
}

run();
