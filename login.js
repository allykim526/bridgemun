/* =====================================================================
   login.js — logging in

   What this file does:
   Runs the login page. A student who already has a delegate account
   signs in here and is sent to the board — the platform's home page
   once signed in.

   Passwords are handled entirely by Firebase Authentication — this code
   never sees, stores, or sends a password anywhere else.
===================================================================== */

import { auth, isConfigured } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { DEBATE_TOPIC, DEBATE_SDG } from "./debate-script.js";

// The pieces of the page this file controls.
const loginForm = document.getElementById("loginForm");
const notice    = document.getElementById("notice");

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
  if (code.includes("invalid-email")) return "That does not look like a valid email address.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Email or password is incorrect.";
  if (code.includes("user-not-found")) return "No account found with that email.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
  return "Something went wrong: " + (error.message || code);
}

/* ---------------------------------------------------------------------
   LOGGING IN
--------------------------------------------------------------------- */
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearNotice();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Logging in…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("board.html");
  } catch (error) {
    showNotice(friendlyError(error), "error");
    button.disabled = false;
    button.textContent = "Log in";
  }
});

/* ---------------------------------------------------------------------
   PAGE START
   If Firebase has not been set up yet, say so here rather than letting
   the delegate press a button that cannot possibly work.
--------------------------------------------------------------------- */
// The subtitle under the title: the platform's focus topic, read from
// debate-script.js so it matches every other page.
document.getElementById("authTopic").textContent = DEBATE_SDG.goal + " · " + DEBATE_TOPIC;

if (!isConfigured) {
  showNotice("Firebase is not connected yet. Open firebase-config.js and add your project settings (see SETUP.md).", "error");
}
