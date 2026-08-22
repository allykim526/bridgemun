/* =====================================================================
   session.js — who is logged in

   What this file does:
   Every page except the login page needs to know three things: is
   somebody logged in, which delegation are they, and how do they log
   out. This file answers all three, so the committee page and the
   board page do not each have to work it out themselves.

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
    onAuthStateChanged(auth, async function (user) {
      if (!user) {
        window.location.replace("login.html");
        return;
      }

      // Fetch the delegate's profile — the delegation they represent and
      // the name shown on their speeches.
      const snapshot = await getDoc(doc(db, "users", user.uid));

      if (!snapshot.exists()) {
        // Signed in, but with no profile. This should not normally
        // happen; sending them back to sign-up lets them finish.
        window.location.replace("login.html");
        return;
      }

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
