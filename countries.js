/* =====================================================================
   countries.js — the committee's seats

   What this file does:
   Holds the list of delegations in this committee. It is the single
   source of truth: the sign-up page builds its country dropdown from
   this list, and the delegate roster is drawn from it too.

   To change which countries are in the committee, edit ONLY this file.

   "type" is either:
     "human" — a seat a student can claim by signing up
     "ai"    — a seat the AI delegate holds, which no student can take
===================================================================== */

export const COUNTRIES = [
  { country: "Republic of Korea",  flag: "🇰🇷", type: "human" },
  { country: "France",             flag: "🇫🇷", type: "human" },
  { country: "United States",      flag: "🇺🇸", type: "ai"    },
  { country: "United Kingdom",     flag: "🇬🇧", type: "human" },
  { country: "China",              flag: "🇨🇳", type: "human" },
  { country: "Russian Federation", flag: "🇷🇺", type: "human" },
  { country: "Brazil",             flag: "🇧🇷", type: "human" }
];

/* Finds one delegation by name. Used whenever a stored post names a
   country and the page needs its flag, or needs to know whether that
   seat is AI-held. */
export function findCountry(name) {
  return COUNTRIES.find(function (c) { return c.country === name; });
}

/* The flag for a country, with a plain white flag as a fallback so an
   unknown country name never leaves an empty gap on screen. */
export function flagFor(name) {
  const found = findCountry(name);
  return found ? found.flag : "🏳️";
}
