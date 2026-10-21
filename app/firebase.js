import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAOMScCoEsyoGFvNGaNtRlZg1ZYnsl0kZ4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "turnero-c651b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "turnero-c651b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "turnero-c651b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "384466203676",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:384466203676:web:a1a0ac56d7b62334ec9bd9",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
