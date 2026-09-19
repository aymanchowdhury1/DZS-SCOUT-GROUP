/* ==========================================================
   FIREBASE CONFIG — dzsscout-group
   ----------------------------------------------------------
   Fully filled in. Remaining steps (see SETUP.md for details):
     1. Build → Authentication → Get started → Sign-in method
        → enable "Email/Password"
     2. Build → Realtime Database → Create database
     3. Paste the Realtime Database rules from SETUP.md and
        database.rules.json into the Rules tab
     4. Sign up on the live site as your admin email to unlock
        Edit / Delete / New Post
========================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAwEmQCMRQ4zOdJ4OmeoxGRhyLPhvHlc9c",
  authDomain: "dzsscout-group.firebaseapp.com",
  databaseURL: "https://dzsscout-group-default-rtdb.firebaseio.com",
  projectId: "dzsscout-group",
  messagingSenderId: "735671429919",
  appId: "1:735671429919:web:f4264f1139611d60a21e2a",
  measurementId: "G-FHNBWZ6E5T"
};

// The one email allowed to see Edit / Delete / New Post controls.
// This MUST also be set as the admin in your Realtime Database &
// Realtime Database security rules (see SETUP.md) — the check here is
// cosmetic only and does not by itself protect your data.
const ADMIN_EMAIL = "aymanc366@gmail.com";
