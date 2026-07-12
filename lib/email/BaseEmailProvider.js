/**
 * lib/email/BaseEmailProvider.js
 *
 * Base class for all email provider integrations.
 * Future providers (e.g. Outlook, Zoho) must extend this class
 * and implement its methods to be pluggable.
 */
export class BaseEmailProvider {
  /**
   * @param {Object} workspace - The workspace database record
   */
  constructor(workspace) {
    this.workspace = workspace;
  }

  /**
   * Fetch inbox and sent emails, perform classification, and return the standard shape.
   *
   * @returns {Promise<{ unreadCount: number, threads: Array, categories: Object }>}
   */
  async fetchEmails() {
    throw new Error("fetchEmails() not implemented");
  }

  /**
   * Send an email.
   *
   * @param {Object} mailOptions
   * @param {string} mailOptions.to
   * @param {string} mailOptions.subject
   * @param {string} mailOptions.text
   * @param {string} mailOptions.html
   * @returns {Promise<any>}
   */
  async sendEmail(mailOptions) {
    throw new Error("sendEmail() not implemented");
  }

  /**
   * Test connection to incoming (IMAP/OAuth) and outgoing (SMTP/OAuth) servers.
   *
   * @returns {Promise<{ imapConnected: boolean, smtpConnected: boolean }>}
   */
  async testConnection() {
    throw new Error("testConnection() not implemented");
  }
}
