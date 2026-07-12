import { getEmailProvider } from "./index";
import { updateWorkspace } from "../db";

/**
 * Sync service to refresh email data from the active email provider
 * and update connection metrics in the database.
 *
 * Can be triggered on-demand (Sync Now) or scheduled via background workers.
 *
 * @param {Object} workspace - Workspace record to sync
 * @returns {Promise<Object>} Unified email data
 */
export async function runEmailSync(workspace) {
  if (!workspace) {
    throw new Error("No active workspace to sync");
  }

  const providerName = workspace.emailProvider || "gmail";
  console.log(`[SyncService] Starting sync for workspace ${workspace.id} using provider: ${providerName.toUpperCase()}`);

  try {
    const providerInstance = getEmailProvider(workspace);
    const emailData = await providerInstance.fetchEmails();

    // Update connection status metrics to success in database
    updateWorkspace(workspace.id, {
      lastSyncTime: new Date().toISOString(),
      connectionStatus: "connected",
      imapConnected: true,
      smtpConnected: true,
    });

    return emailData;
  } catch (e) {
    console.error(`[SyncService] Sync failed for workspace ${workspace.id}:`, e.message);

    // Update connection metrics to failed in database
    updateWorkspace(workspace.id, {
      connectionStatus: "failed",
      imapConnected: false,
      smtpConnected: false,
    });

    throw e;
  }
}
