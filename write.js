/* =====================================================================
   write.js — writing a post

   What this file does:
   Runs the write page. A delegate types (or dictates, with the record
   button) a title and a body, and publishing saves it to Firestore in
   the "posts" collection — the same collection the board reads from.
   Once saved, the delegate is sent straight to the post's own page.
===================================================================== */

import { db } from "./firebase-config.js";
import { requireLogin, attachNav } from "./session.js";
import { createRecorder, speechSupported } from "./speech.js";
import {
  collection,
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
const composerWho  = document.getElementById("composerWho");

// Filled in once we know who is logged in.
let me = null;

/* =====================================================================
   PUBLISHING A POST
   Saves the post to Firestore, then sends the delegate to that post's
   own page so they can see it right away.
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
  postButton.textContent = "Publishing…";

  try {
    const newPost = await addDoc(collection(db, "posts"), {
      uid: me.uid,
      name: me.name,
      country: me.country,
      type: "human",
      title: title,
      body: body,
      createdAt: serverTimestamp()
    });

    // Straight to the post's own page.
    window.location.replace("post.html?id=" + encodeURIComponent(newPost.id));
  } catch (error) {
    recordHint.className = "record-hint is-error";
    recordHint.textContent = "Could not publish: " + error.message;
    postButton.textContent = "Publish post";
    updatePostButton();
  }
});

/* =====================================================================
   SPEAKING INSTEAD OF TYPING
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

  document.body.classList.remove("is-loading");
});
