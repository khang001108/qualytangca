// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDu0zTlfhQ6swsRxzsaYCZX-iu_Kb1vqZ4",
  authDomain: "quanlychitieu-17fff.firebaseapp.com",
  projectId: "quanlychitieu-17fff",
  storageBucket: "quanlychitieu-17fff.firebasestorage.app",
  messagingSenderId: "98380812271",
  appId: "1:98380812271:web:8fb497f631c1bd1729f01a",
  measurementId: "G-QCC030XPH9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);