import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBMEO0mnAiH-fh0cfkmBeTEuQGYlbUxvFs",
  authDomain: "finlay-bear-tracker-f8ec1.firebaseapp.com",
  projectId: "finlay-bear-tracker-f8ec1",
  storageBucket: "finlay-bear-tracker-f8ec1.firebasestorage.app",
  messagingSenderId: "461822871592",
  appId: "1:461822871592:web:92cd9bb13edd5dc35d8d1d"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);