/* =====================================================================
   post.js — a single post

   What this file does:
   Runs the post detail page. It reads which post to show from the
   page's own URL (the "?id=…" part), fetches just that one post from
   Firestore, and displays it in full. If the post belongs to whoever is
   logged in, a Delete button is shown too.
===================================================================== */

import { db } from "./firebase-config.js";
import { flagFor, findCountry } from "./countries.js";
import { requireLogin, attachNav } from "./session.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const postDetail = document.getElementById("postDetail");

/* Turns a stored timestamp into a readable date and time. */
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "Just now";
  return timestamp.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* Draws the post once it has been fetched. isMine controls whether the
   Delete button appears — only the delegate who wrote a post can
   remove it. */
function renderPost(id, post, isMine) {
  const seat = findCountry(post.country);
  const isAI = post.type === "ai" || (seat && seat.type === "ai");

  postDetail.innerHTML =
    '<div class="post-detail-head">' +
      '<span class="avatar' + (isAI ? ' is-ai' : '') + '"></span>' +
      '<div>' +
        '<h1 class="post-detail-title"></h1>' +
        '<div class="post-detail-meta">' +
          '<span class="post-detail-country"></span>' +
          '<span class="tag' + (isAI ? ' is-ai' : '') + '"></span>' +
          '<span class="post-detail-author"></span>' +
          '<span class="post-detail-date"></span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<p class="post-detail-body"></p>' +
    (isMine ?
      '<div class="post-detail-actions">' +
        '<button class="btn btn-danger" id="deleteButton" type="button">Delete this post</button>' +
      '</div>'
      : '');

  // Everything a delegate wrote is placed as plain text, so a post can
  // never affect how the page itself behaves.
  postDetail.querySelector(".avatar").textContent = flagFor(post.country);
  postDetail.querySelector(".post-detail-title").textContent = post.title;
  postDetail.querySelector(".post-detail-country").textContent = post.country;
  postDetail.querySelector(".tag").textContent = isAI ? "AI Delegate" : "Human Delegate";
  postDetail.querySelector(".post-detail-author").textContent = isAI ? "" : post.name;
  postDetail.querySelector(".post-detail-date").textContent = formatDate(post.createdAt);
  postDetail.querySelector(".post-detail-body").textContent = post.body;

  if (isMine) {
    document.getElementById("deleteButton").addEventListener("click", async function () {
      const confirmed = window.confirm('Delete "' + post.title + '"? This cannot be undone.');
      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "posts", id));
        window.location.replace("board.html");
      } catch (error) {
        window.alert("Could not delete this post: " + error.message);
      }
    });
  }
}

/* Shows a plain message in place of the post — used when the id in the
   URL is missing, or does not match any post. */
function renderMissing(message) {
  postDetail.innerHTML = '<p class="record-hint is-error"></p>';
  postDetail.querySelector(".record-hint").textContent = message;
}

/* =====================================================================
   STARTING THE PAGE
===================================================================== */
requireLogin().then(async function (delegate) {
  attachNav(delegate);
  document.body.classList.remove("is-loading");

  // Which post to show, read from this page's own address.
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissing("No post was specified.");
    return;
  }

  const snapshot = await getDoc(doc(db, "posts", id));

  if (!snapshot.exists()) {
    renderMissing("This post could not be found. It may have been the wrong link.");
    return;
  }

  const post = snapshot.data();
  renderPost(id, post, post.uid === delegate.uid);
});
