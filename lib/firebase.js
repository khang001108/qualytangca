// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

let analytics = null;

// 🔹 Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC7ZP0D6abx8L_wmLrRWqgaxOzLd865ecA",
  authDomain: "timework-faf59.firebaseapp.com",
  projectId: "timework-faf59",
  storageBucket: "timework-faf59.firebasestorage.app",
  messagingSenderId: "345529944919",
  appId: "1:345529944919:web:7b6d9138fe252c0febcc12",
  measurementId: "G-7VYZ5ZZMLC"
};

// ✅ Khởi tạo app (chỉ 1 lần)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Khởi tạo Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Khởi tạo Analytics trên client nếu được hỗ trợ
if (typeof window !== "undefined") {
  import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
    if (await isSupported()) {
      analytics = getAnalytics(app);
      console.log("✅ Firebase Analytics enabled");
    } else {
      console.log("⚠️ Firebase Analytics not supported in this browser");
    }
  });
}

export { app, analytics };
