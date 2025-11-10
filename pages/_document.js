// pages/_document.js
// Tùy chỉnh tài liệu HTML cơ bản cho ứng dụng Next.js


import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        {/* Script khởi tạo dark mode sớm */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try{
                  const theme = localStorage.getItem('theme');
                  if(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)){
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
