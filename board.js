/* =====================================================================
   board.js — the home page

   What this file does:
   Runs the home page, the first page a delegate sees once signed in. It
     1. checks the visitor is logged in,
     2. shows the focus topic (read from debate-script.js so it matches
        every other page),
     3. opens the "Create New Meeting" popup (Meeting Details), whose choices
        (date, length, countries, which ones the AI plays) are handed to the
        meeting screen in the address,
     4. lists meetings other delegates are running right now, each with a
        Join button that opens that meeting (or a note when none are),
     5. lists how the most recent meetings ended, from the meeting logs the
        meeting screen saves.

   "My meetings" (in the header) and the username link open their own pages
   (forums.html and profile.html).

   The meeting itself, and joining one, happen on debate.html.
===================================================================== */

import { db } from "./firebase-config.js";
import { requireLogin, attachNav } from "./session.js";
import { DEBATE_TOPIC } from "./debate-script.js";
import { COUNTRIES } from "./countries.js";
import { watchLiveMeetings } from "./meeting.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const liveList    = document.getElementById("liveList");
const liveCount   = document.getElementById("liveCount");
const sessionList = document.getElementById("sessionList");

/* Turns a stored timestamp into a short readable date. */
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "Just now";
  return timestamp.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* A one-line message in a list, for "nothing yet" and for errors. */
function listMessage(list, text) {
  list.innerHTML = "";
  const item = document.createElement("li");
  item.className = "seat-empty";
  item.textContent = text;
  list.appendChild(item);
}

/* =====================================================================
   MEETINGS IN PROGRESS
   One row per meeting that is running: who is chairing it, who is
   taking part, how many students are in it, and a Join button.
===================================================================== */
function watchMeetings(me) {
  watchLiveMeetings(function (meetings) {
    liveCount.textContent = meetings.length + " live";

    if (meetings.length === 0) {
      listMessage(liveList, "No meetings are running right now. Create one above.");
      return;
    }

    liveList.innerHTML = "";
    meetings.forEach(function (meeting) {
      const members = Object.keys(meeting.members || {}).length;

      // One row: when it started · topic · who is in it, and a Join button.
      const row = document.createElement("li");
      row.className = "session-row";
      row.innerHTML =
        '<div><div class="session-date"></div><div class="session-topic"></div><div class="session-meta"></div></div>' +
        '<a class="btn btn-gold"></a>';

      // The date the Chair chose in the popup, or when it started if none.
      row.querySelector(".session-date").textContent =
        (meeting.scheduledDate || formatDate({ toDate: function () { return new Date(meeting.startedAt); } })) +
        " · Chaired by " + meeting.hostName;
      row.querySelector(".session-topic").textContent =
        (meeting.topic || DEBATE_TOPIC) + (meeting.subtopic ? " — " + meeting.subtopic : "");
      const countries = meeting.countries || meeting.participants || [];
      row.querySelector(".session-meta").textContent =
        countries.length + " countries · " + countries.join(", ") +
        " · " + members + (members === 1 ? " student" : " students") + " in the room";

      const join = row.querySelector("a");
      join.href = "debate.html?meeting=" + encodeURIComponent(meeting.id);
      join.textContent = meeting.hostUid === me.uid ? "Return" : "Join";

      liveList.appendChild(row);
    });
  }, function (error) {
    liveCount.textContent = "";
    listMessage(liveList, "Could not load meetings: " + error.message +
      " — if this mentions permissions, publish the updated Firestore rules from SETUP.md.");
  });
}

/* =====================================================================
   RECENT RESULTS
   How the most recent meetings ended: when, who took part, and whether a
   resolution was adopted.
===================================================================== */
function watchRecentSessions() {
  const recentQuery = query(collection(db, "debateLogs"), orderBy("createdAt", "desc"), limit(5));

  onSnapshot(recentQuery, function (snapshot) {
    if (snapshot.empty) {
      listMessage(sessionList, "No meetings have finished yet.");
      return;
    }

    sessionList.innerHTML = "";
    snapshot.forEach(function (docSnap) {
      const data = docSnap.data();
      const row = document.createElement("li");
      row.className = "session-row";
      row.innerHTML =
        '<div><div class="session-date"></div><div class="session-meta"></div></div>' +
        '<span class="outcome-badge"></span>';

      row.querySelector(".session-date").textContent = formatDate(data.createdAt);
      row.querySelector(".session-meta").textContent =
        (data.participants || []).join(", ") + " · " + (data.entries || []).length + " log entries";

      const badge = row.querySelector(".outcome-badge");
      if (data.resolution) {
        badge.textContent = (data.resolution.passed ? "Adopted" : "Failed") + " — " + data.resolution.title;
        badge.classList.add(data.resolution.passed ? "is-adopted" : "is-failed");
      } else {
        badge.textContent = "No resolution vote";
      }

      sessionList.appendChild(row);
    });
  }, function (error) {
    listMessage(sessionList, "Could not load recent results: " + error.message);
  });
}

/* =====================================================================
   MEETING DETAILS POPUP
   The "Create New Meeting" button opens this popup over the home page. In
   it the Chair sets the date, length, and which countries take part and
   which of those the AI plays. "Save Meeting & Continue" carries all of it
   to the meeting screen in the address (?length=…&countries=…&ai=…), where
   debate.js picks it up. Nothing is saved to the database until the
   meeting is actually started there.

   The countries come from countries.js (the one list of delegations). The
   United States is an AI-only seat there, so it is always AI-played here.
===================================================================== */
function setupCreatePopup() {
  const modal       = document.getElementById("createModal");
  const dateInput   = document.getElementById("modalDate");
  const subtopic    = document.getElementById("modalSubtopic");
  const countSlider = document.getElementById("modalCount");
  const searchBox   = document.getElementById("modalSearch");
  const chipBox     = document.getElementById("modalChips");
  const saveButton  = document.getElementById("modalCreate");

  // What the popup currently holds.
  let duration = "30";
  const picked = [];          // names of the chosen countries, in the order chosen
  const aiOn = new Set();     // names of chosen countries the AI plays

  document.getElementById("modalTopic").value = DEBATE_TOPIC;

  // Today's date as YYYY-MM-DD, the form a date field wants.
  function todayText() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function maxCountries() { return Number(countSlider.value); }

  // A country that is AI-only in countries.js can never be switched off.
  function isFixedAi(name) {
    const found = COUNTRIES.find(function (c) { return c.country === name; });
    return Boolean(found && found.type === "ai");
  }

  // Picks n countries at random (used at the start, by Random, and when
  // the slider or a preset changes how many are wanted).
  function pickRandom(n) {
    const pool = COUNTRIES.map(function (c) { return c.country; });
    picked.length = 0;
    while (picked.length < n && pool.length > 0) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    aiOn.clear();
    picked.forEach(function (name) { if (isFixedAi(name)) aiOn.add(name); });
  }

  // Redraws everything that depends on the choices: the chips, the
  // counters, the hint, and whether Save is allowed.
  function redraw() {
    const max = maxCountries();
    const query = searchBox.value.trim().toLowerCase();

    chipBox.innerHTML = "";
    COUNTRIES.forEach(function (c) {
      if (query && c.country.toLowerCase().indexOf(query) === -1) return;
      const isPicked = picked.indexOf(c.country) !== -1;

      const chip = document.createElement("div");
      chip.className = "country-chip" + (isPicked ? " is-picked" : "");
      chip.innerHTML = '<button type="button" class="chip-name"></button><button type="button" class="chip-ai"></button>';

      // Set as plain text, so nothing here is ever mistaken for page code.
      chip.querySelector(".chip-name").textContent = c.flag + " " + c.country;

      chip.querySelector(".chip-name").addEventListener("click", function () {
        const at = picked.indexOf(c.country);
        if (at !== -1) {
          picked.splice(at, 1);
          aiOn.delete(c.country);
        } else if (picked.length < maxCountries()) {
          picked.push(c.country);
          if (isFixedAi(c.country)) aiOn.add(c.country);
        }
        redraw();
      });

      const aiButton = chip.querySelector(".chip-ai");
      if (isPicked) {
        aiButton.textContent = aiOn.has(c.country) ? "AI" : "—";
        aiButton.classList.toggle("is-on", aiOn.has(c.country));
        aiButton.title = isFixedAi(c.country) ? "Always played by the AI" : "Switch the AI delegate for this country";
        aiButton.disabled = isFixedAi(c.country);
        aiButton.addEventListener("click", function () {
          if (aiOn.has(c.country)) aiOn.delete(c.country); else aiOn.add(c.country);
          redraw();
        });
      } else {
        aiButton.classList.add("is-hidden");
      }

      chipBox.appendChild(chip);
    });

    document.getElementById("modalCountValue").textContent = String(max);
    document.getElementById("modalCountries").textContent = "(" + picked.length + "/" + max + ")";
    document.getElementById("modalAiCount").textContent =
      "AI enabled countries: " + aiOn.size + "/" + picked.length;
    document.getElementById("modalMaxHint").classList.toggle("is-hidden", picked.length < max);

    document.querySelectorAll("#modalPresets .seg-btn").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-value") === String(max));
    });

    // Save needs a date and at least two countries (a debate needs two sides).
    saveButton.disabled = !(dateInput.value && picked.length >= 2);
  }

  // Slider and preset buttons set how many countries are wanted; the
  // chosen list is trimmed, or topped up at random, to fit.
  function setCount(n) {
    countSlider.value = String(n);
    while (picked.length > n) aiOn.delete(picked.pop());
    if (picked.length < n) {
      COUNTRIES.map(function (c) { return c.country; })
        .filter(function (name) { return picked.indexOf(name) === -1; })
        .sort(function () { return Math.random() - 0.5; })
        .slice(0, n - picked.length)
        .forEach(function (name) { picked.push(name); if (isFixedAi(name)) aiOn.add(name); });
    }
    redraw();
  }

  function openModal() {
    dateInput.value = todayText();
    subtopic.value = "";
    searchBox.value = "";
    setCount(Math.min(5, COUNTRIES.length));
    pickRandom(maxCountries());
    redraw();
    modal.classList.remove("is-hidden");
  }
  function closeModal() { modal.classList.add("is-hidden"); }

  document.getElementById("createButton").addEventListener("click", openModal);
  document.getElementById("modalClose").addEventListener("click", closeModal);

  // Clicking the dark area outside the card, or pressing Escape, also closes it.
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeModal();
  });

  document.getElementById("modalDuration").addEventListener("click", function (event) {
    const button = event.target.closest(".seg-btn");
    if (!button) return;
    duration = button.getAttribute("data-value");
    document.querySelectorAll("#modalDuration .seg-btn").forEach(function (b) {
      b.classList.toggle("is-on", b === button);
    });
  });

  countSlider.addEventListener("input", function () { setCount(maxCountries()); });
  document.getElementById("modalPresets").addEventListener("click", function (event) {
    const button = event.target.closest(".seg-btn");
    if (button) setCount(Number(button.getAttribute("data-value")));
  });

  searchBox.addEventListener("input", redraw);
  dateInput.addEventListener("input", redraw);
  document.getElementById("modalRandom").addEventListener("click", function () {
    pickRandom(maxCountries());
    redraw();
  });
  document.getElementById("modalAiAllOn").addEventListener("click", function () {
    picked.forEach(function (name) { aiOn.add(name); });
    redraw();
  });
  document.getElementById("modalAiAllOff").addEventListener("click", function () {
    aiOn.clear();
    picked.forEach(function (name) { if (isFixedAi(name)) aiOn.add(name); });
    redraw();
  });

  saveButton.addEventListener("click", function () {
    const params = new URLSearchParams();
    params.set("length", duration);
    params.set("date", dateInput.value);
    if (subtopic.value.trim()) params.set("subtopic", subtopic.value.trim());
    params.set("countries", picked.join(","));
    params.set("ai", Array.from(aiOn).join(","));
    window.location.href = "debate.html?" + params.toString();
  });
}

/* =====================================================================
   STARTING THE PAGE
   Nothing above runs until we know who is logged in — requireLogin
   sends anyone who is not straight to the login page.
===================================================================== */
requireLogin().then(function (delegate) {
  attachNav(delegate);

  document.getElementById("boardTopic").textContent = DEBATE_TOPIC;

  setupCreatePopup();
  watchMeetings(delegate);
  watchRecentSessions();

  document.body.classList.remove("is-loading");
});
