// pages/_app.js
import "../styles/globals.css";
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";
import { Sun, Moon, Download, MoreVertical, X } from "lucide-react";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  const [dark, setDark] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

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
          {showMenu ? <X className="w-7 h-7" /> : <MoreVertical className="w-7 h-7" />}
        </button>

        {/* MENU ICON XỔ RA */}
        {showMenu && (
          <div className="fixed bottom-20 left-6 z-[9999] flex flex-col gap-4">

            {/* ICON ĐỔI NỀN */}
            <button
              onClick={toggleDark}
              className="
                text-gray-600 dark:text-gray-300
                hover:text-yellow-400 dark:hover:text-yellow-200
                transition-all
              "
            >
              {dark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            {/* ICON TẢI APP */}
            <button
              onClick={installApp}
              className="
                text-gray-600 dark:text-gray-300
                hover:text-green-400 dark:hover:text-green-300
                transition-all
              "
            >
              <Download className="w-6 h-6" />
            </button>

          </div>
        )}

        <Component {...pageProps} />
      </Tooltip.Provider>
    </>
  );
}
