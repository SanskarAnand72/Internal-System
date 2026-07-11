import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleClient, getCurrentWorkspace } from "@/lib/googleClient";
import { auth } from "@/auth";

const REQUIRED_MAPPED_FIELDS = [
  "Company",
  "Contact Name",
  "Email",
  "Phone",
  "Country",
  "Lead Status",
  "Last Contact",
  "Next Followup",
  "Interested",
  "Meeting",
  "Estimated",
  "Notes"
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
  "Next Followup": ["nextfollowup", "nextaction", "followup", "action"],
  "Interested": ["interested", "interest"],
  "Meeting": ["meeting", "meetingscheduled", "appointment"],
  "Estimated": ["estimated", "value", "amount", "price", "proposalvalue", "estvalue"],
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
    const workspaceId = session?.user?.workspaceId || "unknown";
    const workspace   = await getCurrentWorkspace();

    let spreadsheetId = workspace?.spreadsheetId || "";
    if (!spreadsheetId) {
      const { searchParams } = new URL(req.url);
      spreadsheetId = searchParams.get("spreadsheetId") || "";
    }

    if (!spreadsheetId) {
      return NextResponse.json({ error: "No Spreadsheet ID configured" }, { status: 400 });
    }

    const authClient = await getGoogleClient();
    const sheets     = google.sheets({ version: "v4", auth: authClient });

    // Fetch spreadsheet metadata
    const metadata  = await sheets.spreadsheets.get({ spreadsheetId });
    const spreadsheetTitle = metadata.data.properties?.title || "Unknown Spreadsheet";
    const worksheetNames = (metadata.data.sheets || []).map(s => s.properties?.title || "");
    const sheetName = worksheetNames[0] || "Sheet1";

    const response  = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];

    // Dynamic header mapping
    const colIndices = {};
    const mappedFields = {};
    for (const field of REQUIRED_MAPPED_FIELDS) {
      const aliases = FIELD_ALIASES[field];
      const index = headers.findIndex(h => {
        const norm = normalizeHeader(h);
        return aliases.includes(norm);
      });
      colIndices[field] = index;
      mappedFields[field] = index !== -1 ? `Index ${index} ("${headers[index]}")` : "MISSING";
    }

    const dataRows = rows.slice(1);
    const queueData = [];
    let totalRev = 0;
    let recoverableCount = 0;
    let interestedYesCount = 0;

    dataRows.forEach((row, idx) => {
      if (row.length === 0) return;

      const getVal = (field) => {
        const colIdx = colIndices[field];
        return colIdx !== -1 && row[colIdx] !== undefined ? row[colIdx].trim() : "";
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

    const overviewMetrics = {
      rows: totalRows,
      opp: recoverableCount,
      rev: totalRev,
      conf: aiConfidence
    };

    const finalPayload = {
      sheetName,
      sheetData: {
        headers,
        rows: dataRows
      },
      overviewMetrics,
      queueData,
      recoveryData: queueData,
      leads: queueData,
      rows: totalRows,
      opp: recoverableCount,
      rev: totalRev,
      conf: aiConfidence
    };

    return NextResponse.json({
      "Spreadsheet title": spreadsheetTitle,
      "Worksheet names": worksheetNames,
      "Headers": headers,
      "Mapped fields": mappedFields,
      "Raw values": dataRows,
      "Parsed objects": queueData,
      "Metrics": overviewMetrics,
      "Final AppContext payload": finalPayload
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
