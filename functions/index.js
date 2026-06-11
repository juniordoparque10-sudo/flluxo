const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
});

exports.sendPushOnNotificationCreated = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    try {
      const notification = event.data.data();

      if (!notification) {
        logger.info("Notificação vazia.");
        return;
      }

      const title = notification.title || "Nova notificação";
      const body = notification.message || "Você recebeu uma nova atualização.";

      const targetUserId = notification.targetUserId || "";
      const targetUserEmail = notification.targetUserEmail || "";
      const excludeUserId = notification.excludeUserId || "";
      const createdByUserId = notification.createdByUserId || "";

      let usersSnapshot;

      if (targetUserId) {
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(targetUserId)
          .get();

        if (!userDoc.exists) {
          logger.info("Usuário alvo não encontrado:", targetUserId);
          return;
        }

        usersSnapshot = {
          docs: [userDoc],
        };
      } else if (targetUserEmail) {
        usersSnapshot = await admin
          .firestore()
          .collection("users")
          .where("email", "==", targetUserEmail)
          .get();
      } else {
        usersSnapshot = await admin
          .firestore()
          .collection("users")
          .get();
      }

      const tokens = [];

      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();

        if (userDoc.id === excludeUserId) return;
        if (userDoc.id === createdByUserId) return;

        if (userData.pushToken) {
          tokens.push(userData.pushToken);
        }

        if (Array.isArray(userData.pushTokens)) {
          userData.pushTokens.forEach((token) => {
            if (token) tokens.push(token);
          });
        }
      });

      const uniqueTokens = [...new Set(tokens)];

      if (uniqueTokens.length === 0) {
        logger.info("Nenhum token push encontrado.");
        return;
      }

      const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        notification: {
          title,
          body,
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "/favicon.png",
            badge: "/favicon.png",
          },
          fcmOptions: {
            link: notification.targetUrl || "/dashboard",
          },
        },
        data: {
          notificationId: event.params.notificationId,
          targetUrl: notification.targetUrl || "/dashboard",
          type: notification.type || "info",
        },
      });

      logger.info("Push enviado:", {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      logger.error("Erro ao enviar push:", error);
    }
  }
);