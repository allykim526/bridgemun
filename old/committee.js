/* =====================================================================
   committee.js — the committee room

   What this file does:
   Runs the main page of BridgeMUN: the live debate. It
     1. checks the visitor is logged in, and finds out which delegation
        they represent,
     2. draws the roster of seats, showing which are taken by students
        and which are held by the AI delegate,
     3. shows every statement made in committee, updating live as other
        delegates speak,
     4. lets the delegate write a statement — by typing, or by pressing
        record and speaking it,
     5. lets the AI delegate deliver its opening speech.

   Statements are stored in Firestore, in a collection called
   "messages", so they survive a refresh and every delegate in the
   committee sees the same debate.
===================================================================== */

import { db } from "./firebase-config.js";
import { COUNTRIES, flagFor, findCountry } from "./countries.js";
import { requireLogin, attachNav } from "./session.js";
import { createRecorder, speechSupported } from "./speech.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// The parts of the page this file writes into.
const delegateList   = document.getElementById("delegateList");
const delegateCount  = document.getElementById("delegateCount");
const headerSeats    = document.getElementById("headerSeats");
const feed           = document.getElementById("feed");
const messageCount   = document.getElementById("messageCount");
const composer       = document.getElementById("composer");
const speechInput    = document.getElementById("speechInput");
const recordButton   = document.getElementById("recordButton");
const recordHint     = document.getElementById("recordHint");
const sendButton     = document.getElementById("sendButton");
const composerWho    = document.getElementById("composerWho");
const aiSpeechButton = document.getElementById("aiSpeechButton");

// Filled in once we know who is logged in.
let me = null;

/* The AI delegate's prepared opening speech. There is no real AI behind
   this yet — the text is written in advance. When an AI service is
   connected later, this is the one value that gets replaced by its
   response; everything else on the page stays exactly as it is. */
const AI_OPENING_SPEECH =
  "The United States thanks the Chair. Autonomous weapons systems are " +
  "advancing faster than the rules meant to govern them. Our delegation " +
  "believes regulation must be binding but realistic: meaningful human " +
  "control over the use of force, shared standards for testing and " +
  "accountability, and transparency between states. We look forward to " +
  "working with all delegations toward a framework this body can support.";

/* Turns a stored timestamp into a short clock time like "10:04".
   Firestore fills the time in on the server, so a message sent a moment
   ago may briefly have no timestamp yet — hence the fallback. */
function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "…";
  return timestamp.toDate().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =====================================================================
   THE ROSTER
   Shows every seat in the committee. A seat is either held by the AI,
   claimed by a student who has signed up for it, or still vacant —
   and a vacant seat is exactly the gap BridgeMUN's AI delegate exists
   to fill.
===================================================================== */
async function renderRoster() {
  // Who has signed up, and for which delegation.
  const seated = {};
  const snapshot = await getDocs(collection(db, "users"));
  snapshot.forEach(function (docSnap) {
    const profile = docSnap.data();
    if (profile.country) seated[profile.country] = profile.name;
  });

  delegateList.innerHTML = "";
  let claimed = 0;

  COUNTRIES.forEach(function (seat) {
    const isAI = seat.type === "ai";
    const takenBy = seated[seat.country];
    const isMe = me && seat.country === me.country;

    if (isAI || takenBy) claimed++;

    // The line under the country name: who holds this seat.
    let roleLabel;
    if (isAI) roleLabel = "AI Delegate";
    else if (takenBy) roleLabel = takenBy;
    else roleLabel = "Seat vacant";

    const item = document.createElement("li");
    item.className =
      "delegate" +
      (isAI ? " is-ai" : "") +
      (!isAI && !takenBy ? " is-vacant" : "") +
      (isMe ? " is-me" : "");

    item.innerHTML =
      '<span class="flag-tile"></span>' +
      '<span class="delegate-info">' +
        '<span class="delegate-country"></span>' +
        '<span class="delegate-role' + (isAI ? ' is-ai' : '') + '"></span>' +
      '</span>' +
      (isMe ? '<span class="you-tag">You</span>' : '');

    // Set as plain text, so a name typed by a student can never be
    // mistaken for page code.
    item.querySelector(".flag-tile").textContent = seat.flag;
    item.querySelector(".delegate-country").textContent = seat.country;
    item.querySelector(".delegate-role").textContent = roleLabel;

    delegateList.appendChild(item);
  });

  delegateCount.textContent = claimed + " of " + COUNTRIES.length + " seated";
  headerSeats.textContent = COUNTRIES.length + " delegations";
}

/* =====================================================================
   THE DISCUSSION FEED
   Draws one statement. Every message on the page comes through here, so
   they are all built the same way and look the same.
===================================================================== */
function renderMessage(message) {
  const seat = findCountry(message.country);
  const isAI = message.type === "ai" || (seat && seat.type === "ai");
  const isMine = me && message.uid === me.uid;

  const item = document.createElement("li");
  item.className = "message" + (isMine ? " is-mine" : "");
  item.innerHTML =
    '<span class="avatar' + (isAI ? ' is-ai' : '') + '"></span>' +
    '<div class="message-body">' +
      '<div class="message-meta">' +
        '<span class="message-country"></span>' +
        '<span class="tag' + (isAI ? ' is-ai' : '') + '"></span>' +
        '<span class="message-author"></span>' +
        '<span class="message-time"></span>' +
      '</div>' +
      '<div class="bubble' + (isAI ? ' is-ai' : '') + '"></div>' +
    '</div>';

  item.querySelector(".avatar").textContent = flagFor(message.country);
  item.querySelector(".message-country").textContent = message.country;
  item.querySelector(".tag").textContent = isAI ? "AI Delegate" : "Human Delegate";
  item.querySelector(".message-author").textContent = isAI ? "" : (message.name || "");
  item.querySelector(".message-time").textContent = formatTime(message.createdAt);
  item.querySelector(".bubble").textContent = message.text;

  feed.appendChild(item);
}

/* Listens to the "messages" collection and redraws the feed whenever
   anything changes. This is what makes the debate live: when another
   delegate speaks, their statement appears here without a refresh. */
function watchMessages() {
  const messagesQuery = query(collection(db, "messages"), orderBy("createdAt", "asc"));

  onSnapshot(messagesQuery, function (snapshot) {
    feed.innerHTML = "";

    if (snapshot.empty) {
      feed.innerHTML =
        '<li class="feed-empty">No statements have been made yet. ' +
        'The floor is open.</li>';
      messageCount.textContent = "0 statements";
      return;
    }

    snapshot.forEach(function (docSnap) {
      renderMessage(docSnap.data());
    });

    const total = snapshot.size;
    messageCount.textContent = total + (total === 1 ? " statement" : " statements");

    // Keep the newest statement in view.
    feed.scrollTop = feed.scrollHeight;
  });
}

/* =====================================================================
   MAKING A STATEMENT
   Saves what the delegate wrote to Firestore. The feed above is
   listening, so the new statement appears by itself — this function
   does not have to draw anything.
===================================================================== */
async function sendStatement(text, options) {
  const settings = options || {};

  await addDoc(collection(db, "messages"), {
    uid: settings.isAI ? "ai-delegate" : me.uid,
    name: settings.isAI ? "AI Delegate" : me.name,
    country: settings.isAI ? settings.country : me.country,
    type: settings.isAI ? "ai" : "human",
    text: text,
    createdAt: serverTimestamp()
  });
}

/* The Send button is only usable when there is something to send. */
speechInput.addEventListener("input", function () {
  sendButton.disabled = speechInput.value.trim().length === 0;
});

composer.addEventListener("submit", async function (event) {
  event.preventDefault();

  const text = speechInput.value.trim();
  if (!text) return;

  sendButton.disabled = true;
  sendButton.textContent = "Sending…";

  try {
    await sendStatement(text);
    speechInput.value = "";
  } catch (error) {
    recordHint.textContent = "Could not send: " + error.message;
    recordHint.className = "record-hint is-error";
  }

  sendButton.textContent = "Send to committee";
  sendButton.disabled = speechInput.value.trim().length === 0;
});

/* =====================================================================
   SPEAKING INSTEAD OF TYPING
   Wires the record button to the speech-to-text helper. Pressing it
   once starts listening; pressing it again stops. Recognised words are
   written into the same box the delegate would otherwise type in, so
   they can still edit before sending.
===================================================================== */
const recorder = createRecorder(
  speechInput,

  // Called when recording starts or stops, so the button can show which.
  function (state) {
    const recording = state === "recording";
    recordButton.classList.toggle("is-recording", recording);
    recordButton.querySelector(".record-label").textContent = recording ? "Stop" : "Record";
    recordHint.className = "record-hint";
    recordHint.textContent = recording
      ? "Listening… speak your statement, then press Stop."
      : "";
  },

  // Called when something goes wrong.
  function (message) {
    recordHint.className = "record-hint is-error";
    recordHint.textContent = message;
  }
);

recordButton.addEventListener("click", function () {
  recorder.toggle();
});

// If the browser cannot do speech recognition, say so up front rather
// than letting a delegate press a button that cannot work.
if (!speechSupported) {
  recordButton.disabled = true;
  recordHint.className = "record-hint is-error";
  recordHint.textContent = "Voice input needs Google Chrome. You can still type your statement.";
}

/* =====================================================================
   THE AI DELEGATE'S OPENING SPEECH
   Shows a short "preparing remarks" pause, then posts the speech into
   the committee like any other statement.
===================================================================== */
aiSpeechButton.addEventListener("click", async function () {
  aiSpeechButton.disabled = true;
  aiSpeechButton.textContent = "Delegate is speaking…";

  // Which seat the AI holds, taken from the shared country list rather
  // than written in twice.
  const aiSeat = COUNTRIES.find(function (c) { return c.type === "ai"; });

  // A temporary line standing in for the delegate rising to speak.
  const waiting = document.createElement("li");
  waiting.className = "message";
  waiting.innerHTML =
    '<span class="avatar is-ai">' + aiSeat.flag + '</span>' +
    '<div class="message-body"><div class="bubble is-ai thinking">' +
      aiSeat.country + ' is preparing remarks<span></span><span></span><span></span>' +
    '</div></div>';
  feed.appendChild(waiting);
  feed.scrollTop = feed.scrollHeight;

  setTimeout(async function () {
    waiting.remove();
    try {
      await sendStatement(AI_OPENING_SPEECH, { isAI: true, country: aiSeat.country });
      aiSpeechButton.textContent = "Opening Speech Delivered";
    } catch (error) {
      aiSpeechButton.disabled = false;
      aiSpeechButton.textContent = "Generate AI Opening Speech";
    }
  }, 1400);
});

/* =====================================================================
   STARTING THE PAGE
   Nothing above runs until we know who is logged in — requireLogin
   sends anyone who is not straight to the login page.
===================================================================== */
requireLogin().then(async function (delegate) {
  me = delegate;

  attachNav(delegate);
  composerWho.textContent = delegate.country;

  await renderRoster();
  watchMessages();

  // The room is ready; reveal it.
  document.body.classList.remove("is-loading");
});
