// pages/_document.js
// Tùy chỉnh HTML và hỗ trợ PWA + Dark Mode

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        {/* ========== FAVICON ========== */}
        <link rel="icon" href="/worktime-64.png" />
        {/* Cậu có icon gì ở /public thì đổi tên đúng vào đây */}

        {/* ========== MANIFEST (PWA) ========== */}
        <link rel="manifest" href="/manifest.json" />

        {/* ========== PWA META ========== */}
        <meta name="theme-color" content="#1e40af" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Quản Lý Tăng Ca" />

        {/* iOS ICONS */}
        <link rel="apple-touch-icon" href="/worktime-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/worktime-512.png" />

        {/* ========== Chặn FOUC Dark Mode ========== */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e){}
              })();
            `,
          }}
        />
      </Head>

      <body className="transition-colors duration-300 bg-white dark:bg-gray-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
