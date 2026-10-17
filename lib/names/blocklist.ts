// Server-side moderation for player names. Import this only from server code
// so the word list is never shipped to the browser.
//
// This is a STARTER list, not a complete one: no blocklist can be. It is
// deliberately conservative, because a long list of short words rejects real
// names (the Scunthorpe problem) and this site's players include names such as
// Kshitij, Nazia, Randhir and Bhosale. Matching is therefore split by how
// risky a word is:
//   substring  long, unambiguous words, blocked anywhere in the name
//   edge       blocked only at the start or end of the name
//   exact      blocked only when they are the whole name
// Anything that slips through is handled by the admin "clear name" action.

const SUBSTRING = [
  "fuck",
  "bitch",
  "nigger",
  "nigga",
  "faggot",
  "whore",
  "slut",
  "asshole",
  "bastard",
  "retard",
  "rapist",
  "hitler",
  "dickhead",
  "bullshit",
  "motherfuck",
  // romanised Hindi
  "madarchod",
  "behenchod",
  "bhenchod",
  "bhosdike",
  "bhosdi",
  "chutiya",
  "chutiye",
  "haramzada",
  "haramkhor",
];

const EDGE = ["shit", "dick", "porn", "cunt", "pussy", "gandu", "harami"];

const EXACT = ["ass", "sex", "nazi", "rape", "anal", "penis", "vagina", "null", "undefined", "nan"];

// Names that could pass for staff or the site itself.
const RESERVED_PREFIX = ["admin", "moderator", "staff", "official", "support", "guessthe", "system", "anonymous"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" };

// "fuuuck" and "fuck" should look the same.
const collapse = (s: string) => s.replace(/(.)\1+/g, "$1");

const terms = {
  substring: SUBSTRING.map(collapse),
  edge: EDGE.map(collapse),
  exact: EXACT.map(collapse),
  reserved: RESERVED_PREFIX.map(collapse),
};

// Two readings of a name: digits standing in for letters ("sh1t"), and digits
// slipped in between letters ("f1u2c3k").
function readings(name: string): string[] {
  const lower = name.toLowerCase();
  const leet = lower.replace(/[0-9]/g, (d) => LEET[d] ?? d);
  const stripped = lower.replace(/[0-9]/g, "");
  return [collapse(leet), collapse(stripped)];
}

export function isNameAllowed(name: string): boolean {
  for (const v of readings(name)) {
    if (terms.substring.some((t) => v.includes(t))) return false;
    if (terms.edge.some((t) => v.startsWith(t) || v.endsWith(t))) return false;
    if (terms.exact.includes(v)) return false;
    if (terms.reserved.some((t) => v.startsWith(t))) return false;
  }
  return true;
}
