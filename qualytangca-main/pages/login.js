// pages/login.js
// Trang đăng nhập cho ứng dụng Quản lý tăng ca

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/router";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Nếu đã đăng nhập → chuyển về trang chủ
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsubscribe();
  }, [router]);

  // Xử lý đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const ref = doc(db, "users", userCredential.user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists() || !snap.data().approved) {
        alert("⏳ Tài khoản chưa được duyệt. Vui lòng chờ quản trị viên xác nhận.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      router.push("/");
    } catch (err) {
      console.error(err);
      setError("❌ Sai email hoặc mật khẩu!");
    } finally {
      setLoading(false);
    }
  };

  // Tự điền email nếu đã nhớ
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div
      className="
        min-h-screen flex items-center justify-center
        bg-gray-100 dark:bg-gray-900
        transition-colors
      "
    >
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          p-8 rounded-2xl shadow-xl
          w-[95%] max-w-md
          transition-colors
        "
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="
              p-3 rounded-full shadow-lg
              bg-blue-600 text-white
              dark:bg-blue-500
            "
          >
            <LogIn className="w-6 h-6" />
          </div>

          <h2
            className="
              text-2xl font-bold mt-3
              text-gray-800 dark:text-gray-100
            "
          >
            Quản lý tăng ca
          </h2>

          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Đăng nhập hệ thống
          </p>
        </div>

        {/* Lỗi */}
        {error && (
          <div
            className="
              bg-red-50 dark:bg-red-900/20
              border border-red-200 dark:border-red-700
              text-red-600 dark:text-red-300
              text-sm p-2 mb-3 rounded-lg
            "
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full pl-10 pr-3 py-2
                border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-700
                text-gray-800 dark:text-gray-100
                rounded-lg
                focus:border-blue-500 dark:focus:border-blue-400
                focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500
                outline-none transition
              "
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 w-5 h-5" />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                w-full pl-10 pr-10 py-2
                border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-700
                text-gray-800 dark:text-gray-100
                rounded-lg
                focus:border-blue-500 dark:focus:border-blue-400
                focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500
                outline-none transition
              "
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="
                absolute right-3 top-2.5
                text-gray-500 dark:text-gray-400
                hover:text-gray-700 dark:hover:text-gray-200
              "
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-blue-500 dark:accent-blue-400"
            />
            Ghi nhớ tài khoản
          </label>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              flex justify-center items-center gap-2
              bg-blue-600 hover:bg-blue-700
              dark:bg-blue-500 dark:hover:bg-blue-600
              text-white p-2 rounded-lg transition font-medium
              ${loading ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        {/* Signup link */}
        <p className="text-center mt-5 text-gray-600 dark:text-gray-400 text-sm">
          Chưa có tài khoản?{" "}
          <a
            href="/signup"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
}
