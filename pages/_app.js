// pages/_app.js
// Cấu trúc chính của ứng dụng Next.js với các provider toàn cục



import "../styles/globals.css";
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ToastProvider } from "../components/base/ToastContext";

export default function MyApp({ Component, pageProps }) {
  return (
    <Tooltip.Provider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </Tooltip.Provider>
  );
}
