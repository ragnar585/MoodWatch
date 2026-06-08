import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsRMgfyBLSl1Wq5mFiNzCNRhKSD12bkGE",
  authDomain: "moodwatch-1a537.firebaseapp.com",
  projectId: "moodwatch-1a537",
  storageBucket: "moodwatch-1a537.firebasestorage.app",
  messagingSenderId: "16014180675",
  appId: "1:16014180675:web:5546fefa2cfa7863112ff6",
  measurementId: "G-Q3VKGKJNMG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);