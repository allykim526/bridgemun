/* =====================================================================
   results.js — the saved voting results page

   What this file does:
   Opens one saved meeting (results.html?log=<id>) and shows how its
   resolution vote went, using the same results screen as inside a live
   meeting (results-view.js): the resolution, the outcome, the aggregate
   tally and a row for each country. A meeting that never held a
   resolution vote shows the screen's empty state instead.
===================================================================== */

import { db } from "./firebase-config.js";
import { requireLogin, attachNav } from "./session.js";
import { COUNTRIES } from "./countries.js";
import { DEBATE_PARTICIPANTS, DEBATE_TOPIC } from "./debate-script.js";
import { renderResultsView } from "./results-view.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const resultsBody = document.getElementById("resultsBody");

/* The flag for a country name, from either list of delegations. */
function flagOf(country) {
  const seat = COUNTRIES.find(function (c) { return c.country === country; }) ||
               DEBATE_PARTICIPANTS.find(function (p) { return p.country === country; });
  return seat ? seat.flag : "🏳️";
}

/* A short message in place of the results (no meeting chosen, not found,
   or a load error). */
function showMessage(text) {
  resultsBody.innerHTML = "";
  const message = document.createElement("p");
  message.className = "rv-empty";
  message.textContent = text;
  resultsBody.appendChild(message);
}

/* Turns a saved meeting into what results-view.js draws. */
function dataFromLog(log) {
  const resolution = log.resolution;

  if (!resolution) {
    return {
      title: "No resolution vote was held",
      text: "This meeting ended without a final vote on a resolution.",
      submittedBy: log.name, coSponsors: "",
      tally: { yes: 0, no: 0, abstain: 0 }, rows: []
    };
  }

  return {
    title: resolution.title,
    text: resolution.text,
    submittedBy: resolution.submittedBy || log.country,
    coSponsors: resolution.coSponsors || "",
    tally: { yes: resolution.yes, no: resolution.no, abstain: resolution.abstain },
    rows: (resolution.ballots || []).map(function (ballot) {
      const isAi = ballot.by === "AI delegate";
      return {
        flag: flagOf(ballot.country),
        country: ballot.country,
        kind: isAi ? "ai" : "human",
        delegate: ballot.name || (isAi ? "AI delegate" : "Student"),
        choice: ballot.choice
      };
    })
  };
}

requireLogin().then(async function (delegate) {
  attachNav(delegate);
  document.getElementById("resultsAgenda").textContent = DEBATE_TOPIC;

  const logId = new URLSearchParams(window.location.search).get("log");
  if (!logId) {
    showMessage("No meeting was chosen. Open one from My meetings.");
  } else {
    try {
      const snapshot = await getDoc(doc(db, "debateLogs", logId));
      if (snapshot.exists()) {
        renderResultsView(resultsBody, dataFromLog(snapshot.data()));
      } else {
        showMessage("That meeting could not be found.");
      }
    } catch (error) {
      showMessage("Could not load the results: " + error.message);
    }
  }

  document.body.classList.remove("is-loading");
});
