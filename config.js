// ─────────────────────────────────────────────────────────────
//  Site configuration — edit these values, then push to GitHub.
// ─────────────────────────────────────────────────────────────
window.PARTY_CONFIG = {
  // Paste your Google Apps Script web-app URL here (see README.md).
  // Leave empty to run in "demo mode": responses are saved only in
  // the visitor's own browser, which is handy for testing the layout.
  SCRIPT_URL: "",

  // The window of dates people can pick from (inclusive, YYYY-MM-DD).
  START_DATE: "2026-12-01",
  END_DATE: "2026-12-23",

  // Days of the week to grey out (0 = Sunday … 6 = Saturday).
  // Bar Lotus is closed on Mondays, so Mondays are disabled by default.
  DISABLED_WEEKDAYS: [1],
};
