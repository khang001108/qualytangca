// pages/_app.js
// Cấu trúc chính của ứng dụng Next.js với các provider toàn cục

import "../styles/globals.css";
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ToastProvider } from "../components/base/ToastContext";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Set favicon */}
        {/* <link rel="icon" href="/favicon (2).ico" /> */}
        {/* <link rel="icon" href="/check-work.ico" /> */}
        {/* <link rel="icon" href="/electric-card-recharge-64.ico" /> */}
        {/* <link rel="icon" href="/business-card-40-64.ico" /> */}
        <link rel="icon" href="/check-work-attendance-36-32.ico" />

        {/* Nếu muốn PNG thì bật dòng này */}
        {/* <link rel="icon" type="image/png" href="/favicon.png" /> */}

        {/* Title mặc định nếu cậu muốn */}
        <title>Quản Lý Tăng Ca</title>
      </Head>

      <Tooltip.Provider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </Tooltip.Provider>
    </>
  );
}
