import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleClient, getCurrentWorkspace } from "@/lib/googleClient";
import { auth } from "@/auth";

// Headers that MUST exist for core metrics to work
const REQUIRED_HEADERS = [
  "Company",
  "Contact Name",
  "Lead Status",
];

// Headers that are mapped if present, silently defaulted if absent
const OPTIONAL_HEADERS = [
  "Email",
  "Phone",
  "Country",
  "Last Contact",
  "Next Followup",
  "Interested",
  "Meeting",
  "Estimated",
  "Notes",
];

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

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

export async function GET(req) {
  try {
    const session     = await auth();
    const userId      = session?.user?.id          || "unknown";
    const userRole    = session?.user?.role        || "unknown";
    console.log("[Sheets API] claims", {
      sessionUserId: session?.user?.id || null,
      sessionEmail: session?.user?.email || null,
    });

    // ALWAYS read spreadsheetId from the workspace DB — never from URL params.
    // Client state must not override the real DB.
    const workspace   = await getCurrentWorkspace();
    const workspaceId = workspace?.id || "unknown";
    const spreadsheetId = workspace?.spreadsheetId || "";
    console.log("[Sheets API] resolvedWorkspace", {
      workspaceId: workspace?.id || null,
      ownerId: workspace?.ownerId || null,
      emailProvider: workspace?.emailProvider || null,
      googleTokens: workspace?.googleTokens || null,
      spreadsheetId: workspace?.spreadsheetId || null,
    });

    console.log("[Sheets API] ─────────────────────────────────────────────");
    console.log(`[Sheets API] userId        : ${userId}`);
    console.log(`[Sheets API] workspaceId   : ${workspaceId}`);
    console.log(`[Sheets API] userRole      : ${userRole}`);
    console.log(`[Sheets API] workspace DB  : ${workspace ? "found" : "NOT FOUND"}`);
    console.log(`[Sheets API] spreadsheetId : "${spreadsheetId || "NONE"}"`);

    if (!spreadsheetId) {
      console.warn("[Sheets API] BLOCKED — workspace has no spreadsheetId in data/workspaces.json");
      return NextResponse.json({
        error:   "No Data Connected",
        message: "No Spreadsheet ID configured. Go to Settings and save a Spreadsheet ID.",
        details: {
          searchedRecord: "data/workspaces.json",
          workspaceId,
          workspaceName: workspace?.name || "unknown",
          spreadsheetIdFound: spreadsheetId || "(empty)",
          userId,
        },
      }, { status: 400 });
    }

    const authClient = await getGoogleClient();
    const sheets     = google.sheets({ version: "v4", auth: authClient });

    // Fetch spreadsheet metadata
    const metadata  = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = metadata.data.sheets?.[0]?.properties?.title || "Sheet1";

    const response  = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("[Sheets API] Zero rows returned from Google Sheets API");
      return NextResponse.json({
        error: "No Data Connected",
        message: "The spreadsheet is completely empty.",
        details: { searchedRecord: "data/workspaces.json", workspaceId, userId }
      }, { status: 400 });
    }

    const headers = rows[0];
    const ALL_FIELDS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

    // Dynamic header mapping
    const colIndices = {};

    // Required fields — return error if any are missing
    for (const field of REQUIRED_HEADERS) {
      const aliases = FIELD_ALIASES[field];
      const index = headers.findIndex(h => aliases.includes(normalizeHeader(h)));
      if (index === -1) {
        console.warn(`[Sheets API] Missing required header: "${field}"`);
        console.warn(`[Sheets API] Available headers: ${JSON.stringify(headers)}`);
        return NextResponse.json({
          error: "Missing Header",
          message: `Missing required header: "${field}". Found columns: ${headers.join(", ")}`
        }, { status: 400 });
      }
      colIndices[field] = index;
    }

    // Optional fields — map if present, skip if absent (getVal returns "" for -1)
    for (const field of OPTIONAL_HEADERS) {
      const aliases = FIELD_ALIASES[field];
      const index = headers.findIndex(h => aliases.includes(normalizeHeader(h)));
      colIndices[field] = index; // -1 means not found — handled in getVal
      if (index === -1) {
        console.log(`[Sheets API] Optional header not found (OK): "${field}"`);
      }
    }

    const dataRows = rows.slice(1);
    const queueData = [];
    let totalRev = 0;
    let recoverableCount = 0;
    let interestedYesCount = 0;

    dataRows.forEach((row, idx) => {
      // Skip completely empty rows
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

      const cleanVal = parseEstimated(estimated);
      totalRev += cleanVal;

      // Compute dynamic score & tier
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

    console.log(`[Sheets API] Rows loaded   : ${totalRows} data rows`);
    console.log(`[Sheets API] Recoverable   : ${recoverableCount}`);
    console.log(`[Sheets API] Total Rev     : $${totalRev.toLocaleString()}`);
    console.log(`[Sheets API] AI Confidence : ${aiConfidence}%`);

    return NextResponse.json({
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
    });

  } catch (e) {
    console.error("[Sheets API] GET ERROR:", {
      message: e.message,
      code: e.code || null,
      status: e?.response?.status || null,
      response: e?.response?.data || null,
    });
    
    // Special handling for Office/Excel files that haven't been converted to Google Sheets
    if (e.message && e.message.includes("not supported for this document")) {
      return NextResponse.json({
        error: "Office File Detected",
        message: "The linked file is an Excel or Office document, not a native Google Sheet. Open it in Google Drive, then go to File → Save as Google Sheets to convert it, then paste the new URL/ID here.",
        details: { hint: "The Google Sheets API cannot read .xlsx or other Office formats directly." }
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "No Data Connected", message: e.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const { spreadsheetId, rowIndex, rowData } = await req.json();
    if (!spreadsheetId || !rowIndex) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const authClient = await getGoogleClient();
    const sheets     = google.sheets({ version: "v4", auth: authClient });

    const metadata  = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = metadata.data.sheets?.[0]?.properties?.title || "Sheet1";

    const sheetValResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    const headers = sheetValResponse.data.values?.[0] || [];
    const values  = new Array(headers.length).fill("");

    // Load current values of this row to preserve unedited columns
    const currentRowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    });
    const currentRowValues = currentRowResponse.data.values?.[0] || [];
    for (let i = 0; i < headers.length; i++) {
      values[i] = currentRowValues[i] || "";
    }

    // Update mapped columns dynamically
    headers.forEach((h, colIdx) => {
      const norm = normalizeHeader(h);
      if (FIELD_ALIASES["Company"].includes(norm)) values[colIdx] = rowData.company || values[colIdx];
      else if (FIELD_ALIASES["Contact Name"].includes(norm)) values[colIdx] = rowData.name || values[colIdx];
      else if (FIELD_ALIASES["Estimated"].includes(norm)) values[colIdx] = rowData.val || values[colIdx];
      else if (FIELD_ALIASES["Last Contact"].includes(norm)) values[colIdx] = rowData.contact || values[colIdx];
      else if (FIELD_ALIASES["Lead Status"].includes(norm)) values[colIdx] = rowData.status || values[colIdx];
      else if (FIELD_ALIASES["Next Followup"].includes(norm)) values[colIdx] = rowData.action || values[colIdx];
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });

    console.log(`[Sheets API] PUT row ${rowIndex} updated in spreadsheet ${spreadsheetId}`);
    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("[Sheets API] PUT ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
