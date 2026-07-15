import { getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase web configuration identifies the public client application. Access is
// enforced by Firebase Authentication, Storage Security Rules, and optional App Check.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCv8g15BMQqWTsUyqDR0bM_y6luBEemRE8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "shamba-ai-fe407.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "shamba-ai-fe407",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "shamba-ai-fe407.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1083824372427",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1083824372427:web:ea62af677ed657894bb94e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-E40Y1BQNYQ",
};

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
if (typeof window !== "undefined" && appCheckSiteKey) {
  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Hot reload can evaluate this module after App Check is already initialized.
  }
}
