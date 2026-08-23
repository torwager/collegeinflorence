/*
 * Firebase configuration for College in Florence chat + verified registration.
 *
 * GitHub Pages is static hosting, so chat and email verification run on
 * Firebase's free tier (Authentication + Cloud Firestore).
 *
 * SETUP (one time, ~10 minutes — see README.md for full steps):
 *   1. Create a project at https://console.firebase.google.com
 *   2. Add a Web App, and paste its config object below (replace null).
 *   3. Authentication → Sign-in method → enable "Email link (passwordless)".
 *   4. Authentication → Settings → Authorized domains → add
 *      torwager.github.io
 *   5. Create a Cloud Firestore database, then paste firestore.rules
 *      (in this repo) into Firestore → Rules.
 *
 * Until this is configured, the chat pages show a "coming soon" notice.
 */
window.CIF_FIREBASE_CONFIG = null;

/* Example — replace null above with your own values:
window.CIF_FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "collegeinflorence.firebaseapp.com",
  projectId: "collegeinflorence",
  storageBucket: "collegeinflorence.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
