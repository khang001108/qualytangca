import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi" suppressHydrationWarning>
      <Head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Quản Lý Tăng Ca" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        {/* Anti-FOUC dark mode */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (dark) document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
