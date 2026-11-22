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
import { DEBATE_TOPIC } from "./debate-script.js";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
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

// If this page was opened from a post's Edit button (write.html?edit=<id>),
// the id of the post being edited. Null when writing a brand-new post.
let editingId = null;

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
  postButton.textContent = editingId ? "Saving…" : "Publishing…";

  try {
    // Editing: change the title and body of the existing post and note when
    // it was edited. Everything else about the post stays as it was.
    if (editingId) {
      await updateDoc(doc(db, "posts", editingId), {
        title: title,
        body: body,
        editedAt: serverTimestamp()
      });
      window.location.replace("post.html?id=" + encodeURIComponent(editingId));
      return;
    }

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
    recordHint.textContent = (editingId ? "Could not save: " : "Could not publish: ") + error.message;
    postButton.textContent = editingId ? "Save changes" : "Publish post";
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
   EDITING AN EXISTING POST
   If the address carries ?edit=<post id>, load that post into the form —
   but only if it is the logged-in delegate's own, human-written post.
   Anything else falls back to writing a new post, with a note saying why.
===================================================================== */
async function loadPostForEditing() {
  const id = new URLSearchParams(window.location.search).get("edit");
  if (!id) return;

  try {
    const snapshot = await getDoc(doc(db, "posts", id));
    const post = snapshot.exists() ? snapshot.data() : null;

    if (!post || post.uid !== me.uid || post.type === "ai") {
      recordHint.className = "record-hint is-error";
      recordHint.textContent = "That post can't be edited from this account, so you are writing a new one.";
      return;
    }

    editingId = id;
    postTitle.value = post.title;
    postBody.value = post.body;
    document.getElementById("writeHeading").textContent = "Edit a Post";
    document.getElementById("writePanelTitle").textContent = "Edit Post";
    postButton.textContent = "Save changes";
    updatePostButton();
  } catch (error) {
    recordHint.className = "record-hint is-error";
    recordHint.textContent = "Could not load that post: " + error.message;
  }
}

/* =====================================================================
   STARTING THE PAGE
===================================================================== */
requireLogin().then(async function (delegate) {
  me = delegate;

  attachNav(delegate);
  composerWho.textContent = delegate.country;
  document.getElementById("writeTopic").textContent = DEBATE_TOPIC;

  await loadPostForEditing();

  document.body.classList.remove("is-loading");
});
