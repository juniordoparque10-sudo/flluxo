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
  targetUrl = "",
}) {
  const user = auth.currentUser;

  await addDoc(collection(db, "notifications"), {
    title,
    message,
    type,
    read: false,
    userEmail: user?.email || "Sistema",
    companyId,
    documentId,
    taskId,
    targetUrl,
    createdAt: serverTimestamp(),
  });

  await createLog({
    action: title,
    description: message,
    type,
    companyId,
    documentId,
    taskId,
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
    targetUrl,
    userEmail: user?.email || "Sistema",
    userId: user?.uid || "",
    createdAt: serverTimestamp(),
  });
}