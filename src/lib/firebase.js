import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const db = getFirestore(app, "interviewly");
const googleProvider = new GoogleAuthProvider();

function encodeDocumentPath(pathSegments) {
  return pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
}

function toFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)]),
        ),
      },
    };
  }

  return { stringValue: String(value ?? "") };
}

async function patchFirestoreDocument(pathSegments, data, idToken) {
  const updateMask = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const query = updateMask ? `?${updateMask}` : "";
  const documentPath = encodeDocumentPath(pathSegments);
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/interviewly/documents/${documentPath}${query}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]),
        ),
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Firestore REST write failed.");
  }

  return response.json();
}

async function saveUserResumeViaRest(uid, resumeText, resumeFilename, idToken) {
  return patchFirestoreDocument(
    ["users", uid],
    {
      resumeText,
      resumeFilename,
      updatedAt: new Date(),
    },
    idToken,
  );
}

async function clearUserResumeViaRest(uid, idToken) {
  return patchFirestoreDocument(
    ["users", uid],
    {
      resumeText: "",
      resumeFilename: "",
      updatedAt: new Date(),
    },
    idToken,
  );
}

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

export {
  app,
  auth,
  db,
  firebaseConfig,
  saveUserResumeViaRest,
  clearUserResumeViaRest,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
};
