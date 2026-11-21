// How a height turns up in a URL: "720p", "res_1080p", "1280x720", "DASH_720".
// Another way of writing one is another entry.
export const HEIGHT_PATTERNS: readonly RegExp[] = [
  /(\d{3,4})p(?![a-z])/i,
  /\d{3,4}x(\d{3,4})/,
  /[_-](\d{3,4})(?=[._/-]|$)/,
];
