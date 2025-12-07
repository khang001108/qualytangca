// pages/_app.js
import "../styles/globals.css";
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Download,
  MoreVertical,
  X,
  RefreshCcw,
  UserCog,
} from "lucide-react";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  const [dark, setDark] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showAccount, setShowAccount] = useState(false);

  // Load theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Toggle Dark Mode
  const toggleDark = () => {
    setDark((prev) => {
      const newTheme = !prev;
      document.documentElement.classList.toggle("dark", newTheme);
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      alert("Thiết bị không hỗ trợ cài ứng dụng!");
      return;
    }
    installPrompt.prompt();
    const res = await installPrompt.userChoice;
    if (res.outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <>
      <Head>
        <title>Quản Lý Tăng Ca</title>

        {/* Favicon riêng của Tăng Ca (để icon nào tùy cậu) */}
        <link rel="icon" href="/campus-lease-64.ico" />
        {/* <link rel="icon" href="/check-work.ico" /> */}
        {/* <link rel="icon" href="/shift-clock-64.ico" /> */}
      </Head>

      <Tooltip.Provider>
        {/* NÚT MỞ MENU - ICON TRẦN KHÔNG NỀN */}
        <button
          onClick={() => setShowMenu((p) => !p)}
          className="
            fixed bottom-5 left-5 z-[9999]
            text-gray-600 dark:text-gray-300
            hover:text-indigo-400 dark:hover:text-indigo-300
            transition-all
          "
        >
          {showMenu ? (
            <X className="w-7 h-7" />
          ) : (
            <MoreVertical className="w-7 h-7" />
          )}
        </button>

        {/* MENU ICON XỔ RA */}
        {/* NÚT MỞ MENU - BONG BÓNG MỜ */}
        <button
          onClick={() => setShowMenu((p) => !p)}
          className="
    fixed bottom-5 left-5 z-[9999]
    p-3 rounded-2xl
    bg-white/30 dark:bg-gray-700/30
    backdrop-blur-xl border border-white/20 dark:border-gray-600/20
    shadow-lg
    text-gray-700 dark:text-gray-200
    hover:bg-white/40 dark:hover:bg-gray-700/40
    transition-all
  "
        >
          {showMenu ? (
            <X className="w-6 h-6" />
          ) : (
            <MoreVertical className="w-6 h-6" />
          )}
        </button>

        {/* MENU ICON XỔ RA - BONG BÓNG MỜ */}
        {showMenu && (
          <div
            className="
      fixed bottom-24 left-5 z-[9999]
      flex flex-col gap-4 p-4
      bg-white/20 dark:bg-gray-800/30
      backdrop-blur-xl border border-white/20 dark:border-gray-700/20
      rounded-2xl shadow-2xl
      animate-scaleIn
    "
          >
            {/* Đổi nền */}
            <button
              onClick={toggleDark}
              className="
        p-2 rounded-xl
        bg-white/30 dark:bg-gray-700/30
        backdrop-blur-xl border border-white/10 dark:border-gray-600/10
        text-gray-700 dark:text-gray-200
        hover:bg-white/50 dark:hover:bg-gray-700/50
        transition-all shadow
      "
            >
              {dark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Cài App */}
            <button
              onClick={installApp}
              className="
        p-2 rounded-xl
        bg-white/30 dark:bg-gray-700/30
        backdrop-blur-xl border border-white/10 dark:border-gray-600/10
        text-gray-700 dark:text-gray-200
        hover:bg-white/50 dark:hover:bg-gray-700/50
        transition-all shadow
      "
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Reload */}
            <button
              onClick={() => window.location.reload()}
              className="
        p-2 rounded-xl
        bg-white/30 dark:bg-gray-700/30
        backdrop-blur-xl border border-white/10 dark:border-gray-600/10
        text-gray-700 dark:text-gray-200
        hover:bg-white/50 dark:hover:bg-gray-700/50
        transition-all shadow
      "
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            {/* Account */}
            <button
              onClick={() => setShowAccount(true)}
              className="
        p-2 rounded-xl
        bg-white/30 dark:bg-gray-700/30
        backdrop-blur-xl border border-white/10 dark:border-gray-600/10
        text-gray-700 dark:text-gray-200
        hover:bg-white/50 dark:hover:bg-gray-700/50
        transition-all shadow
      "
            >
              <UserCog className="w-5 h-5" />
            </button>
          </div>
        )}

        <Component {...pageProps} />
        {showAccount && <AccountPopup onClose={() => setShowAccount(false)} />}
      </Tooltip.Provider>
    </>
  );
}

import { auth } from "../lib/firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

function AccountPopup({ onClose }) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [message, setMessage] = useState("");

  const handleChangePassword = async () => {
    setMessage("");

    try {
      const user = auth.currentUser;

      if (!user) {
        setMessage("Bạn cần đăng nhập lại.");
        return;
      }

      // Tạo credential từ mật khẩu cũ
      const credential = EmailAuthProvider.credential(
        user.email,
        oldPass
      );

      // Yêu cầu xác thực lại
      await reauthenticateWithCredential(user, credential);

      // Cập nhật mật khẩu mới
      await updatePassword(user, newPass);

      setMessage("Đổi mật khẩu thành công!");
    } catch (err) {
      console.error("PASSWORD ERROR:", err);

      if (err.code === "auth/wrong-password") {
        setMessage("❌ Sai mật khẩu cũ!");
      } else if (err.code === "auth/requires-recent-login") {
        setMessage("⚠️ Phiên đăng nhập đã quá hạn. Vui lòng đăng nhập lại.");
      } else {
        setMessage("Lỗi: " + err.code);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Bạn chắc chắn muốn xóa tài khoản?")) return;

    try {
      await auth.currentUser.delete();
      alert("Tài khoản đã bị xóa!");
      window.location.href = "/login";
    } catch (err) {
      console.error("DELETE ERROR:", err);
      setMessage("⚠️ Phiên đăng nhập hết hạn. Hãy đăng nhập lại rồi thử xóa.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-xl border border-gray-300 dark:border-gray-700">
        
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          ⚙️ Thông Tin Tài Khoản
        </h2>

        {/* Đổi mật khẩu */}
        <div className="space-y-3 mb-6">
          <p className="font-semibold text-gray-700 dark:text-gray-300">Đổi mật khẩu</p>

          <input
            type="password"
            placeholder="Mật khẩu cũ"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
          />

          <input
            type="password"
            placeholder="Mật khẩu mới"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
          />

          <button
            onClick={handleChangePassword}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Đổi mật khẩu
          </button>
        </div>

        {/* Xóa tài khoản */}
        <div className="mb-4">
          <p className="font-semibold text-red-500 mb-2">Xóa tài khoản</p>
          <button
            onClick={handleDeleteAccount}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Xóa tài khoản
          </button>
        </div>

        {message && (
          <p className="text-center text-sm mt-2 text-gray-800 dark:text-gray-200">
            {message}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
