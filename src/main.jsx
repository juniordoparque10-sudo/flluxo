import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.jsx";

import {
  enablePushNotifications,
  listenForegroundMessages,
} from "./services/pushNotificationService";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      await enablePushNotifications();

      listenForegroundMessages();
    } catch (error) {
      console.error(
        "Erro ao iniciar push notification:",
        error
      );
    }
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);