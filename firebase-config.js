import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATUoZ0ZSPiIAiUU3m1FpYX0ihPebbkSLU",
  authDomain: "suntalk-a8592.firebaseapp.com",
  projectId: "suntalk-a8592",
  storageBucket: "suntalk-a8592.firebasestorage.app",
  messagingSenderId: "778271075452",
  appId: "1:778271075452:web:7b7c5c7a2571a42e22edf9",
  measurementId: "G-TTZLLWNYLP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);