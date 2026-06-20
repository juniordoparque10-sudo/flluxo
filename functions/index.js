const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");

admin.initializeApp();

const APP_URL = "https://flluxo-429x.vercel.app";

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
      const targetUrl = notification.targetUrl || "/dashboard";
      const webLink = new URL(targetUrl, APP_URL).toString();

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
            link: webLink,
          },
        },
        data: {
          notificationId: event.params.notificationId,
          targetUrl,
          type: notification.type || "info",
        },
      });

      logger.info("Push enviado:", {
        notificationId: event.params.notificationId,
        type: notification.type || "info",
        targetUrl: webLink,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      logger.error("Erro ao enviar push:", error);
    }
  }
);

exports.sendDueAgendaReminders = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    const firestore = admin.firestore();
    const now = new Date();
    const snapshot = await firestore
      .collection("agendaEvents")
      .get();
    let remindersSent = 0;
    const skipped = {
      alreadyNotified: 0,
      completed: 0,
      missingSchedule: 0,
      invalidSchedule: 0,
      future: 0,
    };

    for (const eventDoc of snapshot.docs) {
      const agendaEvent = eventDoc.data();

      if (agendaEvent.notified === true) {
        skipped.alreadyNotified += 1;
        continue;
      }
      if (agendaEvent.status === "Concluído") {
        skipped.completed += 1;
        continue;
      }
      if (!agendaEvent.date || !agendaEvent.time) {
        skipped.missingSchedule += 1;
        continue;
      }

      const normalizedTime =
        agendaEvent.time.length === 5
          ? `${agendaEvent.time}:00`
          : agendaEvent.time;
      const dueAt = new Date(
        `${agendaEvent.date}T${normalizedTime}-03:00`
      );

      if (Number.isNaN(dueAt.getTime())) {
        skipped.invalidSchedule += 1;
        continue;
      }
      if (dueAt > now) {
        skipped.future += 1;
        continue;
      }

      try {
        const reminderCreated = await firestore.runTransaction(async (transaction) => {
          const freshEventDoc = await transaction.get(eventDoc.ref);

          if (!freshEventDoc.exists) return false;

          const freshEvent = freshEventDoc.data();

          if (freshEvent.notified === true) return false;
          if (freshEvent.status === "Concluído") return false;

          const creatorUserId = freshEvent.createdByUserId || "";
          const notificationRef = firestore.collection("notifications").doc();

          transaction.update(eventDoc.ref, {
            notified: true,
            notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          transaction.set(notificationRef, {
            title: "Compromisso agendado",
            message: `${freshEvent.title || "Compromisso"} está acontecendo agora.`,
            type: "agenda-reminder",
            companyId: freshEvent.companyId || "",
            documentId: "",
            taskId: "",
            agendaEventId: eventDoc.id,
            targetUrl: "/agenda",
            targetUserId: "",
            targetUserEmail: "",
            excludeUserId: creatorUserId,
            createdByUserId: creatorUserId,
            createdByEmail: freshEvent.createdByEmail || "Sistema",
            readBy: [],
            deletedBy: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          return true;
        });

        if (reminderCreated) {
          remindersSent += 1;
          logger.info("Lembrete da agenda criado:", {
            agendaEventId: eventDoc.id,
            scheduledFor: `${agendaEvent.date} ${agendaEvent.time}`,
            targetUrl: `${APP_URL}/agenda`,
          });
        }
      } catch (error) {
        logger.error("Erro ao processar lembrete da agenda:", {
          agendaEventId: eventDoc.id,
          error,
        });
      }
    }

    logger.info("Agenda verificada:", {
      eventCount: snapshot.size,
      remindersSent,
      skipped,
    });
  }
);
