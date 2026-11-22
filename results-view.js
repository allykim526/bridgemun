/* =====================================================================
   results-view.js — the "Voting outcome" screen's contents

   What this file does:
   Draws the body of the voting-results screen: the resolution card
   (title, text, who submitted it), a one-line outcome summary, the
   aggregate tally (Yes / No / Abstain, each with a count, a percentage and
   a bar), and the country breakdown table (country, delegate, vote).

   It is used in two places so they always look identical: the pop-over
   inside the live meeting (debate.js, opened by "View Results"), and the
   saved-results page that "View results" on My meetings opens
   (results.html / results.js). Each of those supplies its own header and
   buttons; this file only fills in the middle.

   Everything written into the page goes in as plain text, never as HTML,
   so a delegate's name or a resolution typed by a student can never act
   as page code.
===================================================================== */

/* Draws the results into "container" (replacing whatever was there).
   data = {
     title, text, submittedBy, coSponsors,       -- the resolution card
     tally: { yes, no, abstain },                 -- counts of ballots cast
     rows: [{ flag, country, delegate, kind, choice }]
       kind is "ai" or "human"; choice is "yes", "no", "abstain", or
       anything else (including null) for "has not voted"
   } */
export function renderResultsView(container, data) {
  container.innerHTML = "";

  const tally = data.tally || { yes: 0, no: 0, abstain: 0 };
  const total = tally.yes + tally.no + tally.abstain;

  /* A small helper: one element with a class and plain text. */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // -- The resolution itself: title, text, who put it forward. --------
  const resolution = el("section", "rv-card rv-resolution");
  resolution.appendChild(el("h3", "rv-resolution-title", data.title || "Resolution"));
  resolution.appendChild(el("p", "rv-resolution-text", data.text || "No resolution text was written."));

  const chips = el("div", "rv-chips");
  chips.appendChild(el("span", "rv-chip", "Submitted by: " + (data.submittedBy || "the Chair")));
  chips.appendChild(el("span", "rv-chip", "Co-sponsors: " + (data.coSponsors || "none")));
  resolution.appendChild(chips);
  container.appendChild(resolution);

  // -- Outcome summary: says nothing is decided until Yes/No ballots exist.
  const summary = el("section", "rv-card rv-summary");
  if (tally.yes + tally.no === 0) {
    summary.textContent = "No decisive Yes/No combination yet. Totals will appear here once delegates cast ballots.";
  } else if (tally.yes > tally.no) {
    summary.textContent = "Resolution ADOPTED — " + tally.yes + " in favour, " + tally.no + " against, " +
      tally.abstain + " abstaining.";
    summary.classList.add("is-adopted");
  } else {
    summary.textContent = "Resolution FAILS to pass — " + tally.yes + " in favour, " + tally.no + " against, " +
      tally.abstain + " abstaining.";
    summary.classList.add("is-failed");
  }
  container.appendChild(summary);

  // -- Aggregate tally: one bar per option, as a share of ballots cast. --
  const aggregate = el("section", "rv-card");
  aggregate.appendChild(el("h3", "rv-heading", "Aggregate tally"));

  [
    ["Yes (For)", tally.yes, "is-yes"],
    ["No (Against)", tally.no, "is-no"],
    ["Abstain", tally.abstain, "is-abstain"]
  ].forEach(function (option) {
    const percent = total > 0 ? option[1] / total * 100 : 0;

    const line = el("div", "rv-tally-line");
    line.appendChild(el("span", "rv-tally-label", option[0]));
    line.appendChild(el("span", "rv-tally-count",
      option[1] + (option[1] === 1 ? " vote" : " votes") + " (" + percent.toFixed(1) + "%)"));
    aggregate.appendChild(line);

    const track = el("div", "rv-track");
    const fill = el("div", "rv-fill " + option[2]);
    fill.style.width = percent + "%";
    track.appendChild(fill);
    aggregate.appendChild(track);
  });
  container.appendChild(aggregate);

  // -- Country breakdown: one row per delegation that was in the vote. --
  const breakdown = el("section", "rv-card");
  breakdown.appendChild(el("h3", "rv-heading", "Country breakdown"));
  breakdown.appendChild(el("p", "rv-sub", "One row per delegation that took part in this vote"));

  const rows = data.rows || [];
  if (rows.length === 0) {
    breakdown.appendChild(el("p", "rv-empty", "No participants recorded for this session."));
  } else {
    const table = el("table", "rv-table");
    const head = el("tr");
    ["Country", "Delegate", "Vote"].forEach(function (name) { head.appendChild(el("th", "", name)); });
    table.appendChild(el("thead")).appendChild(head);

    const body = el("tbody");
    rows.forEach(function (row) {
      const line = el("tr");
      line.appendChild(el("td", "", (row.flag || "") + " " + row.country));

      const who = el("td");
      who.appendChild(document.createTextNode(row.delegate || (row.kind === "ai" ? "AI delegate" : "Student")));
      who.appendChild(el("span", "tag" + (row.kind === "ai" ? " is-ai" : ""),
        row.kind === "ai" ? "AI Delegate" : "Human Delegate"));
      line.appendChild(who);

      const vote = row.choice === "yes" ? "Yes" : row.choice === "no" ? "No" : row.choice === "abstain" ? "Abstain" : "Not voted";
      line.appendChild(el("td", "rv-vote" + (vote === "Not voted" ? "" : " is-" + vote.toLowerCase()), vote));
      body.appendChild(line);
    });
    table.appendChild(body);
    breakdown.appendChild(table);
  }
  container.appendChild(breakdown);
}
