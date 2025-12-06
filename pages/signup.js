// pages/signup.js
// Trang đăng ký tài khoản cho hệ thống Quản lý tăng ca

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Không dùng tên hiển thị → gán displayName = email
      await updateProfile(userCredential.user, {
        displayName: email,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        approved: false,
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);

      alert("🎉 Đăng ký thành công! Vui lòng chờ quản trị viên duyệt tài khoản.");
      router.push("/login");

    } catch (err) {
      console.error(err);
      setError("Tạo tài khoản thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen flex items-center justify-center
        bg-gray-100 dark:bg-gray-900 transition
      "
    >
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          p-8 rounded-2xl shadow-xl
          w-[95%] max-w-md
          transition
        "
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="
              bg-blue-600 dark:bg-blue-500 
              text-white p-3 rounded-full shadow-lg
            "
          >
            <UserPlus className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-3">
            Đăng ký tài khoản
          </h2>

          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Hệ thống quản lý tăng ca
          </p>
        </div>

        {/* Error */}
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
        <form onSubmit={handleSignup} className="flex flex-col gap-4">

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="email"
              placeholder="Email đăng nhập"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full pl-10 pr-3 py-2
                bg-white dark:bg-gray-700
                border border-gray-300 dark:border-gray-600
                text-gray-800 dark:text-gray-100
                rounded-lg
                focus:border-blue-500 dark:focus:border-blue-400
                focus:ring-blue-400 dark:focus:ring-blue-500 focus:ring-1
                outline-none transition
              "
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                w-full pl-10 pr-3 py-2
                bg-white dark:bg-gray-700
                border border-gray-300 dark:border-gray-600
                text-gray-800 dark:text-gray-100
                rounded-lg
                focus:border-blue-500 dark:focus:border-blue-400
                focus:ring-blue-400 dark:focus:ring-blue-500 focus:ring-1
                outline-none transition
              "
              required
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              flex justify-center items-center gap-2
              bg-blue-600 hover:bg-blue-700
              dark:bg-blue-500 dark:hover:bg-blue-600
              text-white p-2 rounded-lg transition font-medium
              ${loading ? "opacity-70 cursor-not-allowed" : ""}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" /> Đang xử lý...
              </>
            ) : (
              "Đăng ký"
            )}
          </button>
        </form>

        {/* Link login */}
        <p className="text-center mt-5 text-gray-600 dark:text-gray-400 text-sm">
          Đã có tài khoản?{" "}
          <a
            href="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Đăng nhập
          </a>
        </p>
      </div>
    </div>
  );
}
