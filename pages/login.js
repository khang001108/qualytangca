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

  // ✅ Nếu đã đăng nhập → chuyển về trang chủ
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsubscribe();
  }, [router]);

  // ✅ Đăng nhập
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
        alert(
          "⏳ Tài khoản của bạn chưa được duyệt. Vui lòng chờ quản trị viên xác nhận."
        );
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

  // ✅ Điền sẵn email nếu đã chọn “Ghi nhớ”
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl w-[95%] max-w-md border border-blue-100">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-500 text-white p-3 rounded-full shadow-lg">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-3">
            Đăng nhập tài khoản
          </h2>
          <p className="text-gray-500 text-sm">
            Quản lý chi tiêu dễ dàng và an toàn
          </p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-2 mb-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none"
              required
            />
          </div>

          {/* Mật khẩu */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Ghi nhớ */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-blue-500"
            />
            Ghi nhớ tài khoản
          </label>

          {/* Nút đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className={`flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition font-medium ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        {/* Link đăng ký */}
        <p className="text-center mt-5 text-gray-600 text-sm">
          Chưa có tài khoản?{" "}
          <a
            href="/signup"
            className="text-blue-600 hover:underline font-medium"
          >
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
}
