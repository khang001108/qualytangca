// pages/_app.js
import '../styles/globals.css';
import "react-datepicker/dist/react-datepicker.css";
import * as Tooltip from '@radix-ui/react-tooltip';

export default function MyApp({ Component, pageProps }) {
  return (
    <Tooltip.Provider>
      <Component {...pageProps} />
    </Tooltip.Provider>
  );
}
