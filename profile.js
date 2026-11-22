/* =====================================================================
   profile.js — the profile page

   What this file does:
   Shows the delegate's login email (display only — it cannot be changed
   here), lets them change their display name, and lists two records:
     - Debate history: the posts they have written to the discussion feed,
     - Voting history: the resolution votes they cast in saved meetings.
   The display name is the one saved in the delegate's profile in
   Firestore, so it is what shows from now on in meetings and on new
   posts; posts already written keep the name they were written under.
   Only resolution votes of meetings saved from now on carry who cast
   each ballot, so older meetings do not appear in Voting history.
===================================================================== */

import { db } from "./firebase-config.js";
import { requireLogin, attachNav } from "./session.js";
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const nameInput = document.getElementById("profileName");
const hint = document.getElementById("profileHint");
const saveButton = document.getElementById("profileSave");

/* A timestamp as a short readable date. */
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "Just now";
  return timestamp.toDate().toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

/* Fills one history list: a count in the heading, then a row per record —
   or the "nothing yet" sentence when there are none. rows are
   { text, detail, href } and are set as plain text. */
function fillHistory(listId, countId, rows, emptyText) {
  const list = document.getElementById(listId);
  document.getElementById(countId).textContent = String(rows.length);
  list.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("li");
    empty.className = "seat-empty";
    empty.textContent = emptyText;
    list.appendChild(empty);
    return;
  }

  rows.forEach(function (row) {
    const item = document.createElement("li");
    item.className = "session-row";
    item.innerHTML = '<div><div class="session-date"></div><div class="session-meta"></div></div>';
    const title = item.querySelector(".session-date");
    if (row.href) {
      const link = document.createElement("a");
      link.href = row.href;
      link.textContent = row.text;
      title.appendChild(link);
    } else {
      title.textContent = row.text;
    }
    item.querySelector(".session-meta").textContent = row.detail;
    list.appendChild(item);
  });
}

/* The posts this delegate wrote: their "speeches". */
async function loadDebateHistory(uid) {
  try {
    const snapshot = await getDocs(query(collection(db, "posts"), where("uid", "==", uid)));
    const posts = [];
    snapshot.forEach(function (docSnap) { posts.push({ id: docSnap.id, data: docSnap.data() }); });
    posts.sort(function (a, b) {
      const at = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
      const bt = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
      return bt - at;
    });
    fillHistory("debateList", "debateCount", posts.map(function (p) {
      return { text: p.data.title, detail: formatDate(p.data.createdAt), href: "post.html?id=" + encodeURIComponent(p.id) };
    }), "You haven't spoken in any forum yet.");
  } catch (error) {
    fillHistory("debateList", "debateCount", [], "Could not load your debate history: " + error.message);
  }
}

/* The resolution ballots this delegate cast, found in the most recent
   saved meetings. */
async function loadVotingHistory(uid) {
  try {
    const snapshot = await getDocs(query(collection(db, "debateLogs"), orderBy("createdAt", "desc"), limit(50)));
    const rows = [];
    snapshot.forEach(function (docSnap) {
      const log = docSnap.data();
      const ballots = (log.resolution && log.resolution.ballots) || [];
      ballots.forEach(function (ballot) {
        if (ballot.uid !== uid || ballot.choice === "none") return;
        const choice = ballot.choice === "yes" ? "Yes" : ballot.choice === "no" ? "No" : "Abstain";
        rows.push({
          text: log.resolution.title,
          detail: formatDate(log.createdAt) + " · You voted " + choice + " for " + ballot.country,
          href: "results.html?log=" + encodeURIComponent(docSnap.id)
        });
      });
    });
    fillHistory("votingList", "votingCount", rows, "You haven't cast a ballot yet.");
  } catch (error) {
    fillHistory("votingList", "votingCount", [], "Could not load your voting history: " + error.message);
  }
}

requireLogin().then(function (delegate) {
  attachNav(delegate);

  // The email is shown as text, never as a field — it belongs to the login
  // account and cannot be changed here.
  document.getElementById("profileEmail").textContent = delegate.email;
  nameInput.value = delegate.name;

  saveButton.addEventListener("click", async function () {
    const newName = nameInput.value.trim();
    if (!newName) {
      hint.className = "record-hint is-error";
      hint.textContent = "A display name cannot be empty.";
      return;
    }

    saveButton.disabled = true;
    try {
      await updateDoc(doc(db, "users", delegate.uid), { name: newName });
      delegate.name = newName;
      document.getElementById("navDelegateName").textContent = newName;
      hint.className = "record-hint";
      hint.textContent = "Saved. Your new name will show in meetings you start or join from now on.";
    } catch (error) {
      hint.className = "record-hint is-error";
      hint.textContent = "Could not save: " + error.message;
    }
    saveButton.disabled = false;
  });

  loadDebateHistory(delegate.uid);
  loadVotingHistory(delegate.uid);

  document.body.classList.remove("is-loading");
});
