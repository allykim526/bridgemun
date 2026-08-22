/* =====================================================================
   board.js — the committee board

   What this file does:
   Runs the board page, the platform's home page once a delegate is
   signed in. It
     1. checks the visitor is logged in, and finds out which delegation
        they represent,
     2. draws the roster of seats, showing which are taken by students
        and which are held by the AI delegate,
     3. lists every post made so far, newest first, linking each one to
        its own page,
     4. lets the AI delegate publish its opening speech with one click,
     5. lets a delegate delete their own post.

   Posts are stored in Firestore, in a collection called "posts", so
   they survive a refresh and every delegate sees the same board.
===================================================================== */

import { db } from "./firebase-config.js";
import { COUNTRIES, flagFor, findCountry } from "./countries.js";
import { requireLogin, attachNav } from "./session.js";
import {
  collection,
  doc,
  deleteDoc,
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
const postList       = document.getElementById("postList");
const postCount      = document.getElementById("postCount");
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

/* Turns a stored timestamp into a short readable date. Firestore fills
   the time in on the server, so a post made a moment ago may briefly
   have none yet — hence the fallback. */
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "Just now";
  return timestamp.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
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
   THE POST LIST
   Draws one row: a title, who wrote it, and a short preview of the
   body. The row itself links to that post's own page. A delegate's own
   post also gets a Delete button, kept outside the link — a button
   cannot sit inside a link and still work reliably.
===================================================================== */
function renderPostRow(id, post) {
  const seat = findCountry(post.country);
  const isAI = post.type === "ai" || (seat && seat.type === "ai");
  const isMine = me && post.uid === me.uid;

  const item = document.createElement("li");
  item.className = "post-row-item";

  const row = document.createElement("a");
  row.className = "post-row" + (isMine ? " is-mine" : "");
  row.href = "post.html?id=" + encodeURIComponent(id);

  row.innerHTML =
    '<div class="post-row-head">' +
      '<span class="post-row-flag"></span>' +
      '<span class="post-row-title"></span>' +
      '<span class="tag' + (isAI ? ' is-ai' : '') + '"></span>' +
    '</div>' +
    '<div class="post-row-meta"></div>' +
    '<p class="post-row-snippet"></p>';

  // Everything a delegate wrote is placed as plain text, so a post can
  // never affect how the page itself behaves.
  row.querySelector(".post-row-flag").textContent = flagFor(post.country);
  row.querySelector(".post-row-title").textContent = post.title;
  row.querySelector(".tag").textContent = isAI ? "AI Delegate" : "Human Delegate";
  row.querySelector(".post-row-meta").textContent =
    post.country + " · " + (isAI ? "AI Delegate" : post.name) + " · " + formatDate(post.createdAt);
  row.querySelector(".post-row-snippet").textContent = post.body;

  item.appendChild(row);

  // Only the delegate who wrote a post can delete it — the AI's posts
  // and other delegates' posts never get this button.
  if (isMine) {
    const deleteButton = document.createElement("button");
    deleteButton.className = "post-row-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deletePost(id, post.title);
    });
    item.appendChild(deleteButton);
  }

  postList.appendChild(item);
}

/* Removes a post from Firestore for good, after the delegate confirms.
   The board is listening for changes, so the row disappears by itself
   once the deletion goes through. */
async function deletePost(id, title) {
  const confirmed = window.confirm('Delete "' + title + '"? This cannot be undone.');
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "posts", id));
  } catch (error) {
    window.alert("Could not delete this post: " + error.message);
  }
}

/* Listens to the "posts" collection and redraws the board whenever
   anything changes, so a post written by another delegate appears
   without a refresh. Newest posts sit at the top. */
function watchPosts() {
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(postsQuery, function (snapshot) {
    postList.innerHTML = "";

    if (snapshot.empty) {
      postList.innerHTML =
        '<li class="list-empty">No posts yet. Be the first delegation to publish one.</li>';
      postCount.textContent = "0 posts";
      return;
    }

    snapshot.forEach(function (docSnap) {
      renderPostRow(docSnap.id, docSnap.data());
    });

    const total = snapshot.size;
    postCount.textContent = total + (total === 1 ? " post" : " posts");
  });
}

/* =====================================================================
   THE AI DELEGATE'S OPENING SPEECH
   Publishes the AI's prepared speech as a post, exactly like a post a
   student would write, so it appears in the same list.
===================================================================== */
aiSpeechButton.addEventListener("click", async function () {
  aiSpeechButton.disabled = true;
  aiSpeechButton.textContent = "Delegate is speaking…";

  // Which seat the AI holds, taken from the shared country list rather
  // than written in twice.
  const aiSeat = COUNTRIES.find(function (c) { return c.type === "ai"; });

  try {
    await addDoc(collection(db, "posts"), {
      uid: "ai-delegate",
      name: "AI Delegate",
      country: aiSeat.country,
      type: "ai",
      title: "Opening Statement",
      body: AI_OPENING_SPEECH,
      createdAt: serverTimestamp()
    });
    aiSpeechButton.textContent = "Opening Speech Delivered";
  } catch (error) {
    aiSpeechButton.disabled = false;
    aiSpeechButton.textContent = "Generate AI Opening Speech";
  }
});

/* =====================================================================
   STARTING THE PAGE
   Nothing above runs until we know who is logged in — requireLogin
   sends anyone who is not straight to the login page.
===================================================================== */
requireLogin().then(async function (delegate) {
  me = delegate;

  attachNav(delegate);

  await renderRoster();
  watchPosts();

  // The board is ready; reveal it.
  document.body.classList.remove("is-loading");
});
