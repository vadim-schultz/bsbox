import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AppChakraProvider } from "./app/providers/ChakraProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppChakraProvider>
      <App />
    </AppChakraProvider>
  </React.StrictMode>
);
