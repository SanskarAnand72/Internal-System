import { GmailProvider } from "./GmailProvider";
import { TitanProvider } from "./TitanProvider";

/**
 * Instantiates the correct email provider class for the given workspace settings.
 *
 * Designed to easily support Outlook, Zoho, or others in the future by adding
 * additional provider cases.
 *
 * @param {Object} workspace - Workspace record
 * @returns {BaseEmailProvider} Constructed provider instance
 */
export function getEmailProvider(workspace) {
  if (!workspace) {
    throw new Error("No active workspace provided");
  }

  const provider = workspace.emailProvider || "gmail";

  switch (provider) {
    case "gmail":
      return new GmailProvider(workspace);

    case "titan":
      return new TitanProvider(workspace);

    // Future pluggable providers:
    // case "outlook":
    //   return new OutlookProvider(workspace);
    // case "zoho":
    //   return new ZohoProvider(workspace);

    default:
      console.warn(`[EmailRouter] Unknown provider "${provider}", falling back to Gmail`);
      return new GmailProvider(workspace);
  }
}

/**
 * Backward compatibility helper to fetch email data directly.
 *
 * @param {Object} workspace
 * @returns {Promise<Object>} Unified email data structure
 */
export async function getEmailData(workspace) {
  const providerInstance = getEmailProvider(workspace);
  return await providerInstance.fetchEmails();
}
