/* =====================================================================
   forums.js — My meetings

   What this file does:
   Fills in the "My meetings" page with one card per meeting this delegate
   has been part of, newest first:
     - saved meetings the delegate chaired (their role is "Chair"),
     - saved meetings the delegate was in as a student ("Delegate"; only
       meetings saved after this feature was added remember who was in the
       room),
     - meetings that are running right now and that the delegate is in
       (status "Active", with a Return button).
   A finished meeting's "View results" button opens its results page.
   Nothing here changes any data; it only reads.
===================================================================== */

import { db } from "./firebase-config.js";
import { requireLogin, attachNav } from "./session.js";
import { watchLiveMeetings } from "./meeting.js";
import { DEBATE_TOPIC } from "./debate-script.js";
import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const forumList = document.getElementById("forumList");

// What each source has found so far; render() merges them into one list.
const chaired = new Map();    // saved meetings this delegate chaired
const attended = new Map();   // saved meetings this delegate was a student in
let running = [];             // live meetings this delegate is in

/* A timestamp as YYYY-MM-DD, the way the cards show dates. */
function isoDate(millis) {
  const d = new Date(millis);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function millisOf(timestamp) {
  return timestamp && timestamp.toMillis ? timestamp.toMillis() : Date.now();
}

/* One meeting card: date and status, topic, the delegate's role, and the
   button on the right. Everything is set as plain text. */
function buildCard(item) {
  const card = document.createElement("li");
  card.className = "forum-item";
  card.innerHTML =
    '<div class="forum-item-info">' +
      '<p class="forum-item-meta"><span class="forum-item-date"></span><span class="forum-item-status"></span></p>' +
      '<p class="forum-item-title"></p>' +
      '<p class="forum-item-role"></p>' +
    '</div>' +
    '<a class="btn btn-quiet"></a>';

  card.querySelector(".forum-item-date").textContent = "Scheduled " + item.date;

  const status = card.querySelector(".forum-item-status");
  status.textContent = item.active ? "Active" : "Closed";
  status.classList.add(item.active ? "is-active" : "is-closed");

  card.querySelector(".forum-item-title").textContent = item.title;
  card.querySelector(".forum-item-role").textContent = item.role;

  const button = card.querySelector("a");
  button.href = item.active
    ? "debate.html?meeting=" + encodeURIComponent(item.id)
    : "results.html?log=" + encodeURIComponent(item.id);
  button.textContent = item.active ? "Return ›" : "View results ›";

  return card;
}

/* Merges the three sources and redraws the list. */
function render() {
  const items = [];

  running.forEach(function (meeting) {
    items.push({
      id: meeting.id, active: true, sort: meeting.startedAt,
      date: meeting.scheduledDate || isoDate(meeting.startedAt),
      title: (meeting.topic || DEBATE_TOPIC) + (meeting.subtopic ? " — " + meeting.subtopic : ""),
      role: meeting.hostUid === currentUid ? "Chair" : "Delegate"
    });
  });

  function addSaved(map, role) {
    map.forEach(function (data, id) {
      if (role === "Delegate" && chaired.has(id)) return; // already listed as Chair
      items.push({
        id: id, active: false, sort: millisOf(data.createdAt),
        date: data.scheduledDate || isoDate(millisOf(data.createdAt)),
        title: (data.topic || DEBATE_TOPIC) + (data.subtopic ? " — " + data.subtopic : ""),
        role: role
      });
    });
  }
  addSaved(chaired, "Chair");
  addSaved(attended, "Delegate");

  items.sort(function (a, b) { return b.sort - a.sort; });

  forumList.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "seat-empty";
    empty.textContent = "You have not been in a meeting yet. Create or join one from the home page.";
    forumList.appendChild(empty);
    return;
  }
  items.forEach(function (item) { forumList.appendChild(buildCard(item)); });
}

function showError(error) {
  forumList.innerHTML = "";
  const message = document.createElement("li");
  message.className = "seat-empty";
  message.textContent = "Could not load your meetings: " + error.message;
  forumList.appendChild(message);
}

let currentUid = null;

requireLogin().then(function (delegate) {
  currentUid = delegate.uid;
  attachNav(delegate);

  onSnapshot(query(collection(db, "debateLogs"), where("uid", "==", delegate.uid)), function (snapshot) {
    chaired.clear();
    snapshot.forEach(function (docSnap) { chaired.set(docSnap.id, docSnap.data()); });
    render();
  }, showError);

  onSnapshot(query(collection(db, "debateLogs"), where("memberUids", "array-contains", delegate.uid)), function (snapshot) {
    attended.clear();
    snapshot.forEach(function (docSnap) { attended.set(docSnap.id, docSnap.data()); });
    render();
  }, showError);

  watchLiveMeetings(function (meetings) {
    running = meetings.filter(function (m) {
      return m.hostUid === delegate.uid || (m.members && m.members[delegate.uid]);
    });
    render();
  }, function () { /* the saved meetings above still show */ });

  document.body.classList.remove("is-loading");
});
