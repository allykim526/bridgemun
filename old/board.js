/* =====================================================================
   board.js — the committee board

   What this file does:
   Runs the board page: longer written posts that sit outside the live
   debate — draft resolutions, position papers, notices from the chair.
   A delegate writes a title and a body, and can dictate the body with
   the record button instead of typing it.

   Posts are stored in Firestore in a collection called "posts", newest
   first, and appear live for every delegate.
===================================================================== */

import { db } from "./firebase-config.js";
import { flagFor } from "./countries.js";
import { requireLogin, attachNav } from "./session.js";
import { createRecorder, speechSupported } from "./speech.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// The parts of the page this file writes into.
const postForm     = document.getElementById("postForm");
const postTitle    = document.getElementById("postTitle");
const postBody     = document.getElementById("postBody");
const postButton   = document.getElementById("postButton");
const recordButton = document.getElementById("recordButton");
const recordHint   = document.getElementById("recordHint");
const postList     = document.getElementById("postList");
const postCount    = document.getElementById("postCount");
const composerWho  = document.getElementById("composerWho");

// Filled in once we know who is logged in.
let me = null;

/* Turns a stored timestamp into a readable date and time. Firestore
   fills the time in on the server, so a post made a second ago may
   briefly have none yet — hence the fallback. */
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
   DRAWING ONE POST
   Every post on the page is built here, so they all look the same.
===================================================================== */
function renderPost(post) {
  const item = document.createElement("article");
  item.className = "post" + (me && post.uid === me.uid ? " is-mine" : "");

  item.innerHTML =
    '<header class="post-head">' +
      '<span class="avatar"></span>' +
      '<div class="post-byline">' +
        '<span class="post-title"></span>' +
        '<span class="post-meta">' +
          '<span class="post-country"></span>' +
          '<span class="post-author"></span>' +
          '<span class="post-date"></span>' +
        '</span>' +
      '</div>' +
    '</header>' +
    '<p class="post-body"></p>';

  // Everything a delegate wrote is placed as plain text, so no post can
  // ever affect how the page itself behaves.
  item.querySelector(".avatar").textContent = flagFor(post.country);
  item.querySelector(".post-title").textContent = post.title;
  item.querySelector(".post-country").textContent = post.country;
  item.querySelector(".post-author").textContent = post.name;
  item.querySelector(".post-date").textContent = formatDate(post.createdAt);
  item.querySelector(".post-body").textContent = post.body;

  postList.appendChild(item);
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
        '<p class="feed-empty">No posts yet. Be the first delegation to submit one.</p>';
      postCount.textContent = "0 posts";
      return;
    }

    snapshot.forEach(function (docSnap) {
      renderPost(docSnap.data());
    });

    const total = snapshot.size;
    postCount.textContent = total + (total === 1 ? " post" : " posts");
  });
}

/* =====================================================================
   WRITING A POST
   Saves the post to Firestore. The board above is listening, so the new
   post appears by itself.
===================================================================== */
function updatePostButton() {
  postButton.disabled =
    postTitle.value.trim().length === 0 || postBody.value.trim().length === 0;
}

postTitle.addEventListener("input", updatePostButton);
postBody.addEventListener("input", updatePostButton);

postForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const title = postTitle.value.trim();
  const body = postBody.value.trim();
  if (!title || !body) return;

  postButton.disabled = true;
  postButton.textContent = "Posting…";

  try {
    await addDoc(collection(db, "posts"), {
      uid: me.uid,
      name: me.name,
      country: me.country,
      title: title,
      body: body,
      createdAt: serverTimestamp()
    });

    postTitle.value = "";
    postBody.value = "";
  } catch (error) {
    recordHint.className = "record-hint is-error";
    recordHint.textContent = "Could not post: " + error.message;
  }

  postButton.textContent = "Publish post";
  updatePostButton();
});

/* =====================================================================
   SPEAKING INSTEAD OF TYPING
   The record button dictates into the post body, the same way it works
   in the committee room — one shared piece of code, so voice input
   behaves identically everywhere on the platform.
===================================================================== */
const recorder = createRecorder(
  postBody,

  function (state) {
    const recording = state === "recording";
    recordButton.classList.toggle("is-recording", recording);
    recordButton.querySelector(".record-label").textContent = recording ? "Stop" : "Record";
    recordHint.className = "record-hint";
    recordHint.textContent = recording ? "Listening… speak your post, then press Stop." : "";
    updatePostButton();
  },

  function (message) {
    recordHint.className = "record-hint is-error";
    recordHint.textContent = message;
  }
);

recordButton.addEventListener("click", function () {
  recorder.toggle();
});

if (!speechSupported) {
  recordButton.disabled = true;
  recordHint.className = "record-hint is-error";
  recordHint.textContent = "Voice input needs Google Chrome. You can still type your post.";
}

/* =====================================================================
   STARTING THE PAGE
===================================================================== */
requireLogin().then(function (delegate) {
  me = delegate;

  attachNav(delegate);
  composerWho.textContent = delegate.country;

  watchPosts();
  document.body.classList.remove("is-loading");
});
