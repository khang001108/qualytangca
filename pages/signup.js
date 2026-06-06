import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { UserPlus, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: email });
      await setDoc(doc(db, "users", cred.user.uid), {
        email, displayName: email, approved: false, role: "user",
        createdAt: new Date().toISOString(),
      });
      await signOut(auth);
      setDone(true);
    } catch (err) {
      const msg = {
        "auth/email-already-in-use": "Email đã được sử dụng",
        "auth/weak-password": "Mật khẩu phải có ít nhất 6 ký tự",
        "auth/invalid-email": "Email không hợp lệ",
      }[err.code] || "Đăng ký thất bại";
      setError(msg);
    }
    setLoading(false);
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="card max-w-sm w-full text-center animate-scale-in">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đăng ký thành công!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tài khoản đang chờ quản trị viên duyệt. Bạn sẽ nhận thông báo qua email.
        </p>
        <a href="/login" className="btn-indigo w-full inline-block text-center">Về trang đăng nhập</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🕒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tạo tài khoản</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Đăng ký để sử dụng hệ thống</p>
        </div>
        <div className="card">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
              </div>
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9 pr-10" type={showPw ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự" required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-indigo w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                       : <UserPlus size={16} />}
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Đã có tài khoản?{" "}
            <a href="/login" className="text-indigo-500 font-semibold hover:underline">Đăng nhập</a>
          </p>
        </div>
      </div>
    </div>
  );
}
