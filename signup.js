/* =====================================================================
   signup.js — creating a delegate account

   What this file does:
   Runs the signup page. A student picks a name and a delegation, then
   Firebase creates their login. Once that succeeds, we also save their
   profile (name + delegation) in Firestore, and send them into the
   board — the platform's home page once signed in.

   Passwords are handled entirely by Firebase Authentication — this code
   never sees, stores, or sends a password anywhere else.
===================================================================== */

import { auth, db, isConfigured } from "./firebase-config.js";
import { COUNTRIES } from "./countries.js";
import { DEBATE_TOPIC, DEBATE_SDG } from "./debate-script.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// The pieces of the page this file controls.
const signupForm    = document.getElementById("signupForm");
const countrySelect = document.getElementById("signupCountry");
const notice        = document.getElementById("notice");

/* Shows a message to the delegate — an error, or a note that something
   worked. */
function showNotice(message, kind) {
  notice.textContent = message;
  notice.className = "notice is-visible " + (kind === "error" ? "is-error" : "is-info");
}

function clearNotice() {
  notice.className = "notice";
  notice.textContent = "";
}

/* Firebase's error codes are written for programmers. This turns the
   common ones into something a high school student can act on. */
function friendlyError(error) {
  const code = error.code || "";
  if (code.includes("email-already-in-use")) return "That email already has an account. Try logging in instead.";
  if (code.includes("invalid-email")) return "That does not look like a valid email address.";
  if (code.includes("weak-password")) return "Please choose a password of at least 6 characters.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
  return "Something went wrong: " + (error.message || code);
}

/* ---------------------------------------------------------------------
   THE DELEGATION DROPDOWN
   Built from the shared country list, so this form and the roster can
   never disagree about which seats exist. The AI delegate's seat is
   left out — a student cannot claim it.
--------------------------------------------------------------------- */
function fillCountryOptions() {
  COUNTRIES
    .filter(function (c) { return c.type === "human"; })
    .forEach(function (c) {
      const option = document.createElement("option");
      option.value = c.country;
      option.textContent = c.flag + "  " + c.country;
      countrySelect.appendChild(option);
    });
}

/* ---------------------------------------------------------------------
   CREATING A DELEGATE ACCOUNT
   Two steps: Firebase creates the login, then we save the delegate's
   profile (their name and delegation) in Firestore under their user id.
--------------------------------------------------------------------- */
signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearNotice();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const country = countrySelect.value;

  if (!name || !email || !password || !country) {
    showNotice("Please fill in every field.", "error");
    return;
  }

  const button = signupForm.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Creating account…";

  try {
    // Step 1: the login itself.
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Step 2: the profile. Stored under the user's own id, so each
    // delegate can only ever read and write their own profile.
    await setDoc(doc(db, "users", credential.user.uid), {
      name: name,
      country: country,
      email: email,
      createdAt: serverTimestamp()
    });

    // Straight into the board — the platform's home page once signed in.
    window.location.replace("board.html");
  } catch (error) {
    showNotice(friendlyError(error), "error");
    button.disabled = false;
    button.textContent = "Create delegate account";
  }
});

/* ---------------------------------------------------------------------
   PAGE START
--------------------------------------------------------------------- */
fillCountryOptions();

// The subtitle under the title: the platform's focus topic, read from
// debate-script.js so it matches every other page.
document.getElementById("authTopic").textContent = DEBATE_SDG.goal + " · " + DEBATE_TOPIC;

// If Firebase has not been set up yet, say so here rather than letting
// the delegate press a button that cannot possibly work.
if (!isConfigured) {
  showNotice("Firebase is not connected yet. Open firebase-config.js and add your project settings (see SETUP.md).", "error");
}
