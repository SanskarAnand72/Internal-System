/**
 * lib/email/classify.js
 *
 * Shared AI keyword classifier — used by both GmailProvider and TitanProvider.
 * Returns one of: "interested" | "meeting" | "not-interested" | "replies"
 *
 * To improve classification accuracy, extend the keyword arrays below.
 * Both providers call this so changes are reflected everywhere automatically.
 */

const NOT_INTERESTED_KEYWORDS = [
  "not interested",
  "no budget",
  "no thanks",
  "pass for now",
  "unsubscribe",
  "another provider",
  "not a fit",
  "no need",
  "stop emailing",
  "remove me",
];

const MEETING_KEYWORDS = [
  "meeting",
  "calendar",
  "schedule",
  "zoom",
  "call",
  "book",
  "meet",
  "let's chat",
  "set up a time",
  "availability",
  "demo",
];

const INTERESTED_KEYWORDS = [
  "interested",
  "discuss",
  "evaluating",
  "send over",
  "details",
  "tell me more",
  "sounds good",
  "would love",
  "open to",
  "let's explore",
];

/**
 * @param {string} bodyText  - The email snippet / body text (lowercased by caller or here)
 * @returns {"interested"|"meeting"|"not-interested"|"replies"}
 */
export function classifyEmail(bodyText = "") {
  const text = bodyText.toLowerCase();

  if (NOT_INTERESTED_KEYWORDS.some((kw) => text.includes(kw))) {
    return "not-interested";
  }
  if (MEETING_KEYWORDS.some((kw) => text.includes(kw))) {
    return "meeting";
  }
  if (INTERESTED_KEYWORDS.some((kw) => text.includes(kw))) {
    return "interested";
  }
  return "replies";
}
