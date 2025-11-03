// pages/_app.js
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
