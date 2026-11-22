/* =====================================================================
   forum.js — the forum panels on the meeting screen

   What this file does:
   Draws and runs the four panels around the debate on the meeting screen
   (debate.html), the ones that used to make up the old board page:
     1. "Your delegation" — the logged-in delegate's own card,
     2. "AI Delegate & Empty Seats" and "Delegations" — every seat in the
        committee and who holds it: a student, the AI delegate, or nobody.
        Each empty seat has an AI ON/OFF switch and a Generate button,
     3. the discussion feed — every post, newest first, with Read aloud,
        and Edit / Delete on a delegate's own posts.

   debate.js starts all of this by calling startForum() once it knows who
   is logged in. Posts are stored in Firestore ("posts"); which empty seats
   have the AI on is stored in "seats". Both are shared, so every delegate
   sees the same thing.
===================================================================== */

import { db } from "./firebase-config.js";
import { COUNTRIES, flagFor, findCountry } from "./countries.js";
import { DEBATE_SCRIPT } from "./debate-script.js";
import {
  collection,
  doc,
  setDoc,
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
const seatStrip      = document.getElementById("seatStrip");
const delegateCount  = document.getElementById("delegateCount");
const headerSeats    = document.getElementById("headerSeats");
const postList       = document.getElementById("postList");
const postCount      = document.getElementById("postCount");

// Filled in once we know who is logged in.
let me = null;

// Which empty seats have the AI switched on (country -> true), read live
// from the "seats" collection, and which seats' opening statements have
// already been delivered this visit.
let aiSeats = {};
const deliveredSeats = new Set();

// Who holds which seat right now, kept so the meeting's votes can tell
// which delegations are AI-held (they vote by themselves) and which have a
// student behind them. Updated every time the seats are drawn.
let rosterState = { aiCountries: [], humanByCountry: {} };

/* The seats as last drawn: countries the AI holds, and for each country a
   student holds, that student's name. */
export function getRosterState() {
  return rosterState;
}

/* The AI delegate's prepared opening speech. There is no real AI behind
   this yet — the text is written in advance. When an AI service is
   connected later, this is the one value that gets replaced by its
   response; everything else on the page stays exactly as it is.

   It is on the platform's focus topic (digital inclusion for older
   persons). The United States is not one of the researched delegations,
   so this is a general placeholder that deliberately makes no claim
   about real US policy — it should be replaced once that research
   exists. */
const AI_OPENING_SPEECH =
  "The United States thanks the Chair. As services, healthcare, and " +
  "everyday life move online, older persons risk being left behind, and " +
  "a gap in access and know-how can mean isolation. Our delegation " +
  "believes digital inclusion must be treated as a matter of equality " +
  "between generations: accessible design, practical digital-literacy " +
  "support, and the sharing of best practices between states. We look " +
  "forward to working with all delegations on measures that help older " +
  "persons take a full part in a digital society.";

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
  seatStrip.innerHTML = "";
  let claimed = 0;
  const aiCountries = [];

  COUNTRIES.forEach(function (seat) {
    const takenBy = seated[seat.country];
    // A seat is AI-held if it is the platform's permanent AI seat, or if
    // someone switched the AI on for a seat no student has taken. A
    // student who takes the seat always wins over the AI.
    const isAI = seat.type === "ai" || (aiSeats[seat.country] === true && !takenBy);
    const isMe = me && seat.country === me.country;

    if (isAI || takenBy) claimed++;
    if (isAI) aiCountries.push(seat.country);

    // Every seat appears in "Delegations"; only seats with no student in
    // them — held by the AI, or still vacant — also appear under "AI
    // Delegate & Empty Seats".
    delegateList.appendChild(buildSeatCard(seat, isAI, takenBy, isMe, false));
    if (isAI || !takenBy) seatStrip.appendChild(buildSeatCard(seat, isAI, takenBy, false, true));
  });

  rosterState = { aiCountries: aiCountries, humanByCountry: seated };

  delegateCount.textContent = claimed + " of " + COUNTRIES.length + " seated";
  if (headerSeats) headerSeats.textContent = COUNTRIES.length + " delegations";
}

/* Builds one seat card: the flag, the country, who holds the seat, and a
   label saying whether that holder is a human or the AI — this platform
   never hides which. A vacant seat is faded, so the empty chairs are
   obvious. */
function buildSeatCard(seat, isAI, takenBy, isMe, withControls) {
  // The line under the country name: who holds this seat.
  let roleLabel;
  if (isAI) roleLabel = "AI Delegate";
  else if (takenBy) roleLabel = takenBy;
  else roleLabel = "Waiting for a delegate";

  const card = document.createElement("div");
  card.className =
    "seat-card" +
    (isAI ? " is-ai" : "") +
    (!isAI && !takenBy ? " is-vacant" : "") +
    (isMe ? " is-me" : "");

  card.innerHTML =
    '<span class="flag-tile"></span>' +
    '<span class="delegate-info">' +
      '<span class="delegate-country"></span>' +
      '<span class="delegate-role' + (isAI ? ' is-ai' : '') + '"></span>' +
    '</span>' +
    (isAI || takenBy ? '<span class="tag' + (isAI ? ' is-ai' : '') + '"></span>' : '') +
    (isMe ? '<span class="you-tag">You</span>' : '');

  // Set as plain text, so a name typed by a student can never be
  // mistaken for page code.
  card.querySelector(".flag-tile").textContent = seat.flag;
  card.querySelector(".delegate-country").textContent = seat.country;
  card.querySelector(".delegate-role").textContent = roleLabel;

  const tag = card.querySelector(".tag");
  if (tag) tag.textContent = isAI ? "AI Delegate" : "Human Delegate";

  // In the "AI Delegate & Empty Seats" strip, each card also gets the AI
  // switch and the button that has the AI deliver this seat's statement.
  if (withControls) card.appendChild(buildSeatControls(seat, isAI));

  return card;
}

/* The AI ON/OFF switch and the Generate button for one empty seat. The
   platform's permanent AI seat is always on, so its switch is locked; for
   any other empty seat the switch turns the AI on or off for everyone, and
   Generate only works while the AI is on. */
function buildSeatControls(seat, isAI) {
  const permanent = seat.type === "ai";

  const controls = document.createElement("div");
  controls.className = "seat-controls";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "seat-btn" + (isAI ? " is-on" : "");
  toggle.textContent = isAI ? "AI ON" : "AI OFF";
  toggle.disabled = permanent;
  toggle.title = permanent ? "This seat is always held by the AI delegate." : "Switch the AI delegate on or off for this seat.";
  toggle.addEventListener("click", function () { toggleAiSeat(seat, isAI); });

  const generate = document.createElement("button");
  generate.type = "button";
  generate.className = "seat-btn is-generate";
  generate.disabled = !isAI || deliveredSeats.has(seat.country);
  generate.textContent = deliveredSeats.has(seat.country) ? "Delivered" : "Generate";
  generate.addEventListener("click", function () { generateStatement(seat, generate); });

  controls.append(toggle, generate);
  return controls;
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
  row.className = "post-row" + (isMine ? " is-mine" : "") + (isAI ? " is-ai" : "");
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
    post.country + " · " + (isAI ? "AI Delegate" : post.name) + " · " + formatDate(post.createdAt) +
    (post.editedAt ? " (edited)" : "");
  row.querySelector(".post-row-snippet").textContent = post.body;

  item.appendChild(row);

  // The buttons beside the post, kept outside the link — a button cannot
  // sit inside a link and still work reliably. Everyone can have a post
  // read aloud; only the delegate who wrote a post can edit or delete it,
  // and the AI's posts and other delegates' posts never show those two.
  const actions = document.createElement("div");
  actions.className = "post-row-actions";

  if ("speechSynthesis" in window) {
    const readButton = document.createElement("button");
    readButton.className = "post-row-btn post-row-read";
    readButton.type = "button";
    readButton.textContent = "Read aloud";
    readButton.addEventListener("click", function () { readAloud(readButton, post); });
    actions.appendChild(readButton);
  }

  if (isMine) {
    const editLink = document.createElement("a");
    editLink.className = "post-row-btn";
    editLink.textContent = "Edit";
    editLink.href = "write.html?edit=" + encodeURIComponent(id);
    actions.appendChild(editLink);

    const deleteButton = document.createElement("button");
    deleteButton.className = "post-row-btn post-row-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deletePost(id, post.title);
    });
    actions.appendChild(deleteButton);
  }

  if (actions.children.length > 0) item.appendChild(actions);

  postList.appendChild(item);
}

/* Reads a post aloud with the browser's own text-to-speech (free, nothing
   is sent anywhere). Pressing the button again, or another post's button,
   stops it. */
function readAloud(button, post) {
  const wasReadingThis = button.dataset.reading === "1";

  window.speechSynthesis.cancel();
  document.querySelectorAll(".post-row-read").forEach(function (other) {
    other.textContent = "Read aloud";
    other.dataset.reading = "0";
  });

  if (wasReadingThis) return;

  const speech = new SpeechSynthesisUtterance(post.title + ". " + post.body);
  speech.lang = "en-US";
  speech.onend = speech.onerror = function () {
    button.textContent = "Read aloud";
    button.dataset.reading = "0";
  };

  button.textContent = "Stop";
  button.dataset.reading = "1";
  window.speechSynthesis.speak(speech);
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
   AI DELEGATES ON EMPTY SEATS
   Any seat no student has taken can have the AI delegate switched on, and
   then deliver an opening statement as a post — the same gap-filling the
   whole platform is built around. Which seats have the AI on is saved in
   Firestore (collection "seats"), so every delegate sees the same thing.
===================================================================== */

/* The statement the AI delivers for a seat. Nothing here is generated: it
   is the platform's placeholder for the permanent AI seat; the researched
   opening speech for a delegation that has one in debate-script.js; or,
   for any other country, the placeholder reworded for that country — which
   makes no claim about that country's real policy. */
function aiStatementFor(seat) {
  if (seat.type === "ai") return AI_OPENING_SPEECH;

  const researched = DEBATE_SCRIPT.find(function (step) {
    return step.kind === "speech" && step.country === seat.country;
  });
  if (researched) return researched.formal;

  return AI_OPENING_SPEECH.replace(
    "The United States thanks the Chair.",
    "The delegation of " + seat.country + " thanks the Chair."
  );
}

/* Publishes the AI's statement for one seat as a post, labelled as an AI
   delegate like every other AI post. */
async function generateStatement(seat, button) {
  button.disabled = true;
  button.textContent = "Speaking…";

  try {
    await addDoc(collection(db, "posts"), {
      uid: "ai-delegate",
      name: "AI Delegate",
      country: seat.country,
      type: "ai",
      title: "Opening Statement",
      body: aiStatementFor(seat),
      createdAt: serverTimestamp()
    });
    deliveredSeats.add(seat.country);
    button.textContent = "Delivered";
  } catch (error) {
    button.disabled = false;
    button.textContent = "Generate";
    window.alert("Could not post the AI statement: " + error.message);
  }
}

/* Switches the AI on or off for an empty seat. */
async function toggleAiSeat(seat, currentlyOn) {
  try {
    await setDoc(doc(db, "seats", seat.country), {
      ai: !currentlyOn,
      by: me.uid,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    window.alert(
      "Could not change the AI for " + seat.country + ": " + error.message +
      "\n\nIf this mentions permissions, publish the updated Firestore rules from SETUP.md."
    );
  }
}

/* Listens for AI switches being flipped (by anyone) and redraws the seats. */
function watchSeats() {
  onSnapshot(collection(db, "seats"), function (snapshot) {
    aiSeats = {};
    snapshot.forEach(function (docSnap) { aiSeats[docSnap.id] = docSnap.data().ai === true; });
    renderRoster().catch(function () { /* the first draw already reports a failure */ });
  }, function () {
    // Without permission to read "seats" the AI switches simply stay off.
  });
}

/* =====================================================================
   STARTING THE FORUM
   Called by debate.js once the logged-in delegate is known.
===================================================================== */
export async function startForum(delegate) {
  me = delegate;

  // The "Your delegation" card.
  document.getElementById("youFlag").textContent = flagFor(delegate.country);
  document.getElementById("youCountry").textContent = delegate.country;
  document.getElementById("youName").textContent = delegate.name;

  // If the delegations cannot be loaded, say so in place of the strip
  // rather than leaving the whole page hidden.
  try {
    await renderRoster();
  } catch (error) {
    delegateList.textContent = "Could not load delegations: " + error.message;
  }
  watchPosts();
  watchSeats();
}
