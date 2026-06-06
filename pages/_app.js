import "../styles/globals.css";
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  const [installPrompt, setInstallPrompt] = useState(null);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Expose installApp globally so index.js can call it
  useEffect(() => {
    window.__spendyInstallApp = async () => {
      if (!installPrompt) { alert("Thiết bị không hỗ trợ cài ứng dụng hoặc đã cài rồi!"); return; }
      installPrompt.prompt();
      const res = await installPrompt.userChoice;
      if (res.outcome === "accepted") setInstallPrompt(null);
    };
  }, [installPrompt]);

  return (
    <>
      <Head>
        <title>Quản Lý Tăng Ca</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/campus-lease-64.ico" />
      </Head>
      <Tooltip.Provider>
        <Component {...pageProps} />
      </Tooltip.Provider>
    </>
  );
}
