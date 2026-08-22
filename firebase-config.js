/* =====================================================================
   firebase-config.js — the platform's connection to Firebase

   What this file does:
   Connects BridgeMUN to your Firebase project once, and hands the two
   services the rest of the app needs to every other file:
     - auth : who is logged in (sign up, log in, log out)
     - db   : Firestore, where delegates' posts are stored

   Every other JavaScript file imports "auth" and "db" from here, so the
   connection is set up in exactly one place.

   >>> BEFORE THE APP WILL RUN <<<
   Replace the placeholder values below with your own Firebase project's
   settings. SETUP.md walks through where to find them, step by step.
   These values are not secrets — they are meant to be visible in the
   browser. What actually protects your data is the Firestore security
   rules, also in SETUP.md.
===================================================================== */

// Firebase is loaded straight from Google's servers, so there is nothing
// to install and no build step.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------------------------------------------------------------------
// YOUR PROJECT'S SETTINGS — replace all seven values.
// ---------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            "AIzaSyAG4gvGfhYJhqyCi2ojLSyiDQVfQ1bVAxE",
  authDomain:        "project-fbdd9.firebaseapp.com",
  projectId:         "project-fbdd9",
  storageBucket:     "project-fbdd9.firebasestorage.app",
  messagingSenderId: "582513846198",
  appId:             "1:582513846198:web:72d4a41f61473c7a088317"
};

// Starts the connection to Firebase.
const app = initializeApp(firebaseConfig);

// The two services the rest of the app uses.
export const auth = getAuth(app);
export const db = getFirestore(app);

/* A quick check so that, if the settings above have not been filled in
   yet, the browser says so plainly instead of failing with a confusing
   Firebase error message. */
export const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE_");

if (!isConfigured) {
  console.warn(
    "BridgeMUN: Firebase is not configured yet. " +
    "Open firebase-config.js and paste your project's settings. See SETUP.md."
  );
}
