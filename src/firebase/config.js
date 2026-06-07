import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyBvCsUiJVRSKjqlPZiqJmeBXX0h2V9gDGU",
  authDomain: "flluxo-fbf31.firebaseapp.com",
  projectId: "flluxo-fbf31",
  storageBucket: "flluxo-fbf31.firebasestorage.app",
  messagingSenderId: "983247555408",
  appId: "1:983247555408:web:4426b7e33b4e1df50aba55",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;