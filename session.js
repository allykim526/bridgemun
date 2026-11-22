/* =====================================================================
   session.js — who is logged in

   What this file does:
   Every page except login and signup needs to know three things: is
   somebody logged in, which delegation are they, and how do they log
   out. This file answers all three, so the board, write, and post
   pages do not each have to work it out themselves.

   A delegate's identity lives in two places:
     - Firebase Auth holds their email and password (Firebase handles
       passwords; we never see or store them).
     - Firestore holds their profile: display name and delegation.
===================================================================== */

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ---------------------------------------------------------------------
   requireLogin
   Guards a page. If nobody is logged in, the visitor is sent to the
   login page. If somebody is, their profile is fetched and handed back
   so the page can start.

   Returns a promise that resolves with { uid, email, name, country }.
--------------------------------------------------------------------- */
export function requireLogin() {
  return new Promise(function (resolve) {
    // If Firebase never answers at all (no internet, or Authentication /
    // Firestore not set up in the console), explain after 10 seconds
    // rather than leaving the page blank forever.
    let finished = false;
    const watchdog = setTimeout(function () {
      if (finished) return;
      finished = true;
      showProfileProblem(
        "Firebase did not answer within 10 seconds. Check your internet " +
        "connection, and that Authentication and a Firestore Database " +
        "have both been created in the Firebase console."
      );
    }, 10000);

    onAuthStateChanged(auth, async function (user) {
      if (!user) {
        finished = true;
        clearTimeout(watchdog);
        window.location.replace("login.html");
        return;
      }

      // Fetch the delegate's profile — the delegation they represent and
      // the name shown on their posts. If this fails (most often because
      // the Firestore security rules in SETUP.md have not been published
      // yet), say so on screen instead of leaving a blank page.
      let snapshot;
      try {
        snapshot = await getDoc(doc(db, "users", user.uid));
      } catch (error) {
        if (!finished) showProfileProblem(error.message || String(error));
        finished = true;
        clearTimeout(watchdog);
        return;
      }

      if (!snapshot.exists()) {
        // Signed in, but with no saved profile — usually because saving it
        // failed during sign-up. Sending them to the login page would loop,
        // so explain it here instead.
        if (!finished) showProfileProblem("No delegate profile was found for this account.");
        finished = true;
        clearTimeout(watchdog);
        return;
      }

      finished = true;
      clearTimeout(watchdog);
      const profile = snapshot.data();

      resolve({
        uid: user.uid,
        email: user.email,
        name: profile.name,
        country: profile.country
      });
    });
  });
}

/* Replaces a page that is stuck waiting on the delegate's profile with a
   plain explanation and a log-out button, so a setup problem (like
   Firestore rules not being published) is visible rather than a blank
   screen. The page itself stays hidden behind it. */
function showProfileProblem(detail) {
  const box = document.createElement("div");
  box.className = "notice is-visible is-error";
  box.style.maxWidth = "640px";
  box.style.margin = "40px auto";

  const title = document.createElement("strong");
  title.textContent = "Signed in, but your delegate profile could not be loaded.";

  const reason = document.createElement("p");
  reason.textContent = detail;

  const hint = document.createElement("p");
  hint.textContent =
    "If this mentions permissions, publish the Firestore rules from " +
    "SETUP.md (Part 2) in the Firebase console, then log out and back in.";

  const button = document.createElement("button");
  button.className = "btn btn-quiet";
  button.type = "button";
  button.textContent = "Log out";
  button.addEventListener("click", logout);

  box.append(title, reason, hint, button);
  document.body.appendChild(box);
}

/* Logs the delegate out and returns them to the login page. */
export async function logout() {
  await signOut(auth);
  window.location.replace("login.html");
}

/* ---------------------------------------------------------------------
   attachNav
   Fills in the bar at the top of every page: which delegate is signed
   in, and the log-out button. Called once each page has its delegate.
--------------------------------------------------------------------- */
export function attachNav(delegate) {
  const nameSlot = document.getElementById("navDelegateName");
  const countrySlot = document.getElementById("navDelegateCountry");
  const logoutButton = document.getElementById("navLogout");

  if (nameSlot) nameSlot.textContent = delegate.name;
  if (countrySlot) countrySlot.textContent = delegate.country;
  if (logoutButton) logoutButton.addEventListener("click", logout);
}
