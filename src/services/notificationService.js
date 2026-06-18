import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

export async function createNotification({
  title,
  message,
  type = "info",
  companyId = "",
  documentId = "",
  taskId = "",
  agendaEventId = "",
  targetUrl = "",
  targetUserId = "",
  targetUserEmail = "",
  excludeUserId = "",
}) {
  const user = auth.currentUser;
  const creatorUserId = user?.uid || "";
  const resolvedExcludeUserId = excludeUserId || creatorUserId;

  await addDoc(collection(db, "notifications"), {
    title,
    message,
    type,

    companyId,
    documentId,
    taskId,
    agendaEventId,
    targetUrl,

    targetUserId,
    targetUserEmail,
    excludeUserId: resolvedExcludeUserId,

    createdByUserId: creatorUserId,
    createdByEmail: user?.email || "Sistema",

    readBy: [],
    deletedBy: [],

    createdAt: serverTimestamp(),
  });

  await createLog({
    action: title,
    description: message,
    type,
    companyId,
    documentId,
    taskId,
    agendaEventId,
    targetUrl,
  });
}

export async function createLog({
  action,
  description,
  type = "info",
  companyId = "",
  documentId = "",
  taskId = "",
  agendaEventId = "",
  targetUrl = "",
}) {
  const user = auth.currentUser;

  await addDoc(collection(db, "logs"), {
    action,
    description,
    type,

    companyId,
    documentId,
    taskId,
    agendaEventId,
    targetUrl,

    userEmail: user?.email || "Sistema",
    userId: user?.uid || "",

    createdAt: serverTimestamp(),
  });
}
