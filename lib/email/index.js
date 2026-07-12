import { fetchGmailData } from "./GmailProvider";
import { fetchTitanData } from "./TitanProvider";

/**
 * Main email router that dispatches to the correct email provider
 * depending on the workspace settings.
 *
 * Designed to easily support Outlook, Zoho, or others in the future by adding
 * additional provider cases.
 *
 * @param {Object} workspace - Workspace record
 * @returns {Promise<Object>} Unified email data structure
 */
export async function getEmailData(workspace) {
  if (!workspace) {
    throw new Error("No active workspace to retrieve email data for");
  }

  const provider = workspace.emailProvider || "gmail";
  console.log(`[EmailRouter] Route request using provider: ${provider.toUpperCase()}`);

  switch (provider) {
    case "gmail":
      return await fetchGmailData();

    case "titan":
      return await fetchTitanData(workspace.titanCredentials);

    // Future extensibility:
    // case "outlook":
    //   return await fetchOutlookData(workspace.outlookCredentials);
    // case "zoho":
    //   return await fetchZohoData(workspace.zohoCredentials);

    default:
      console.warn(`[EmailRouter] Unknown provider "${provider}", falling back to Gmail`);
      return await fetchGmailData();
  }
}
