import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

async function signOutUser() {
  return signOut(auth);
}

export { app, auth, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser };
