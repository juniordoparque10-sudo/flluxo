import {
  getMessaging,
  getToken,
  onMessage,
} from "firebase/messaging";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/config";

const vapidKey =
  "BOLplglzIBbLzU8d9vxSEETVWMEJcMBVlUhFWTB3sAxOpb6hxcgkb_R1GcfBJm-yfkNTgkrsOeePAqWTJpzxOx4";

export async function enablePushNotifications() {
  try {
    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      return null;
    }

    const messaging =
      getMessaging();

    const token =
      await getToken(messaging, {
        vapidKey,
      });

    if (!token) return null;

    const user =
      auth.currentUser;

    if (!user) return null;

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    await updateDoc(userRef, {
      pushToken: token,
    });

    console.log(
      "Push token salvo:",
      token
    );

    return token;
  } catch (error) {
    console.error(
      "Erro push:",
      error
    );

    return null;
  }
}

export function listenForegroundMessages() {
  const messaging =
    getMessaging();

  onMessage(
    messaging,
    (payload) => {
      console.log(
        "Push recebido:",
        payload
      );

      if (
        Notification.permission ===
        "granted"
      ) {
        new Notification(
          payload.notification.title,
          {
            body: payload.notification.body,
            icon: "/favicon.png",
          }
        );
      }
    }
  );
}