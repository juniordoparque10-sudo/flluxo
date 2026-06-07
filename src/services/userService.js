import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function createUserProfile(user) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) return;

  const isFirstAdmin = user.email === "juniordoparque10@gmail.com";

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    role: isFirstAdmin ? "admin" : "collaborator",
    permissions: {
      dashboard: isFirstAdmin,
      companies: isFirstAdmin,
      agenda: true,
      quickRegister: true,
      collaborators: isFirstAdmin,
      documents: isFirstAdmin,
      tasks: true,
    },
    createdAt: new Date().toISOString(),
  });
}