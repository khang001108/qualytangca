// pages/_app.js — Cleaned, no duplicate buttons
import "../styles/globals.css";
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";
import { Sun, Moon, Download, MoreVertical, X, RefreshCcw, UserCog } from "lucide-react";
import Head from "next/head";
import { auth } from "../lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

export default function MyApp({ Component, pageProps }) {
  const [showMenu, setShowMenu]       = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [dark, setDark]               = useState(false);

  // Load theme
  useEffect(() => {
    const saved       = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled     = saved === "dark" || (!saved && prefersDark);
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  // PWA install
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!installPrompt) { alert("Thiết bị không hỗ trợ cài ứng dụng!"); return; }
    installPrompt.prompt();
    const res = await installPrompt.userChoice;
    if (res.outcome === "accepted") setInstallPrompt(null);
    setShowMenu(false);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (!e.target.closest("[data-fab]")) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <>
      <Head>
        <title>Quản Lý Tăng Ca</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/campus-lease-64.ico" />
      </Head>

      <Tooltip.Provider>
        <Component {...pageProps} />

        {/* FAB floating action button */}
        <div data-fab className="fixed bottom-5 left-4 z-[9999] flex flex-col-reverse items-center gap-3">
          {/* Toggle button */}
          <button
            onClick={() => setShowMenu((p) => !p)}
            className="w-11 h-11 rounded-2xl bg-white/40 dark:bg-gray-700/40 backdrop-blur-xl border border-white/20 dark:border-gray-600/20 shadow-lg text-gray-700 dark:text-gray-200 hover:bg-white/60 transition flex items-center justify-center"
          >
            {showMenu ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
          </button>

          {/* Sub-buttons */}
          {showMenu && (
            <>
              <button onClick={toggleDark} title={dark ? "Chế độ sáng" : "Chế độ tối"}
                className="w-10 h-10 rounded-xl bg-white/40 dark:bg-gray-700/40 backdrop-blur-xl border border-white/20 shadow text-gray-700 dark:text-gray-200 hover:bg-white/60 transition flex items-center justify-center animate-fadeSlideUp">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => window.location.reload()} title="Tải lại"
                className="w-10 h-10 rounded-xl bg-white/40 dark:bg-gray-700/40 backdrop-blur-xl border border-white/20 shadow text-gray-700 dark:text-gray-200 hover:bg-white/60 transition flex items-center justify-center animate-fadeSlideUp">
                <RefreshCcw className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowAccount(true); setShowMenu(false); }} title="Tài khoản"
                className="w-10 h-10 rounded-xl bg-white/40 dark:bg-gray-700/40 backdrop-blur-xl border border-white/20 shadow text-gray-700 dark:text-gray-200 hover:bg-white/60 transition flex items-center justify-center animate-fadeSlideUp">
                <UserCog className="w-4 h-4" />
              </button>
              {installPrompt && (
                <button onClick={installApp} title="Cài ứng dụng"
                  className="w-10 h-10 rounded-xl bg-indigo-500/80 backdrop-blur-xl border border-indigo-300/20 shadow text-white hover:bg-indigo-500 transition flex items-center justify-center animate-fadeSlideUp">
                  <Download className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {showAccount && <AccountPopup onClose={() => setShowAccount(false)} />}
      </Tooltip.Provider>
    </>
  );
}

// ─── Account popup ──────────────────────────────────────────────
function AccountPopup({ onClose }) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    setMessage(""); setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { setMessage("Bạn cần đăng nhập lại."); return; }
      const credential = EmailAuthProvider.credential(user.email, oldPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      setMessage("✅ Đổi mật khẩu thành công!");
      setOldPass(""); setNewPass("");
    } catch (err) {
      if (err.code === "auth/wrong-password") setMessage("❌ Sai mật khẩu cũ!");
      else if (err.code === "auth/requires-recent-login") setMessage("⚠️ Phiên hết hạn, đăng nhập lại.");
      else if (err.code === "auth/weak-password") setMessage("⚠️ Mật khẩu mới quá yếu (≥6 ký tự).");
      else setMessage("Lỗi: " + err.code);
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Bạn chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác!")) return;
    try {
      await auth.currentUser.delete();
      window.location.href = "/login";
    } catch (err) {
      setMessage("⚠️ Phiên hết hạn. Đăng nhập lại rồi thử.");
    }
  };

  return (
    <div className="fixed inset-0 glass-overlay flex items-end sm:items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 animate-fadeSlideUp">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">⚙️ Tài khoản</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"><X size={18} /></button>
        </div>

        <div className="space-y-3 mb-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Đổi mật khẩu</p>
          <input type="password" placeholder="Mật khẩu cũ" value={oldPass} onChange={(e) => setOldPass(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none text-sm border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-400" />
          <input type="password" placeholder="Mật khẩu mới (≥ 6 ký tự)" value={newPass} onChange={(e) => setNewPass(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none text-sm border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-400" />
          <button onClick={handleChangePassword} disabled={loading || !oldPass || !newPass}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl transition text-sm font-medium">
            {loading ? "Đang xử lý…" : "Đổi mật khẩu"}
          </button>
        </div>

        {message && <p className="text-center text-sm text-gray-700 dark:text-gray-300 mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-xl">{message}</p>}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-semibold text-red-500 mb-2">Vùng nguy hiểm</p>
          <button onClick={handleDeleteAccount} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition text-sm">Xóa tài khoản</button>
        </div>

        <button onClick={onClose} className="mt-3 w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm transition">Đóng</button>
      </div>
    </div>
  );
}
