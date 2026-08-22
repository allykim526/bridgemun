/* =====================================================================
   login.js — signing up and logging in

   What this file does:
   Runs the login page. A student can either create a delegate account
   (choosing the delegation they will represent) or log back into one
   they already have. Once either succeeds, they are sent into the
   committee room.

   Passwords are handled entirely by Firebase Authentication — this code
   never sees, stores, or sends a password anywhere else.
===================================================================== */

import { auth, db, isConfigured } from "./firebase-config.js";
import { COUNTRIES } from "./countries.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// The pieces of the page this file controls.
const tabLogin     = document.getElementById("tabLogin");
const tabSignup    = document.getElementById("tabSignup");
const loginForm    = document.getElementById("loginForm");
const signupForm   = document.getElementById("signupForm");
const countrySelect = document.getElementById("signupCountry");
const notice       = document.getElementById("notice");

/* Shows a message to the delegate — an error, or a note that something
   worked. Keeping this in one function means every message on the page
   looks and behaves the same. */
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
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Email or password is incorrect.";
  if (code.includes("user-not-found")) return "No account found with that email.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
  return "Something went wrong: " + (error.message || code);
}

/* ---------------------------------------------------------------------
   THE DELEGATION DROPDOWN
   Built from the shared country list, so the sign-up form and the
   committee roster can never disagree about which seats exist. The AI
   delegate's seat is left out — a student cannot claim it.
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
   SWITCHING BETWEEN THE TWO FORMS
--------------------------------------------------------------------- */
function showTab(which) {
  clearNotice();
  const isLogin = which === "login";

  tabLogin.classList.toggle("is-active", isLogin);
  tabSignup.classList.toggle("is-active", !isLogin);
  loginForm.classList.toggle("is-hidden", !isLogin);
  signupForm.classList.toggle("is-hidden", isLogin);
}

tabLogin.addEventListener("click", function () { showTab("login"); });
tabSignup.addEventListener("click", function () { showTab("signup"); });

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

    // Straight into the committee room.
    window.location.replace("index.html");
  } catch (error) {
    showNotice(friendlyError(error), "error");
    button.disabled = false;
    button.textContent = "Create delegate account";
  }
});

/* ---------------------------------------------------------------------
   LOGGING BACK IN
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
    window.location.replace("index.html");
  } catch (error) {
    showNotice(friendlyError(error), "error");
    button.disabled = false;
    button.textContent = "Log in";
  }
});

/* ---------------------------------------------------------------------
   PAGE START
--------------------------------------------------------------------- */
fillCountryOptions();

// If Firebase has not been set up yet, say so here rather than letting
// the delegate press buttons that cannot possibly work.
if (!isConfigured) {
  showNotice("Firebase is not connected yet. Open firebase-config.js and add your project settings (see SETUP.md).", "error");
}
