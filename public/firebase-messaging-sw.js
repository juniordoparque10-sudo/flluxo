importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBvCsUiJVRSKjqlPZiqJmeBXX0h2V9gDGU",
  authDomain: "flluxo-fbf31.firebaseapp.com",
  projectId: "flluxo-fbf31",
  storageBucket: "flluxo-fbf31.firebasestorage.app",
  messagingSenderId: "983247555408",
  appId: "1:983247555408:web:4426b7e33b4e1df50aba55",
});

const messaging =
  firebase.messaging();

messaging.onBackgroundMessage(
  (payload) => {
    self.registration.showNotification(
      payload.notification.title,
      {
        body: payload.notification.body,
        icon: "/favicon.png",
      }
    );
  }
);