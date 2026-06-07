import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

function PermissionRoute({ permission, children }) {
  const [user, loadingUser] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setLoadingProfile(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      async (userSnap) => {
        if (userSnap.exists()) {
          setUserProfile({
            id: userSnap.id,
            ...userSnap.data(),
          });

          setLoadingProfile(false);
          return;
        }

        const emailQuery = query(
          collection(db, "users"),
          where("email", "==", user.email)
        );

        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          const firstUser = emailSnapshot.docs[0];

          setUserProfile({
            id: firstUser.id,
            ...firstUser.data(),
          });
        } else {
          setUserProfile(null);
        }

        setLoadingProfile(false);
      },
      (error) => {
        console.error("Erro ao verificar permissões:", error);
        setUserProfile(null);
        setLoadingProfile(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loadingUser || loadingProfile) {
    return (
      <div className="min-h-screen bg-[#f4f0ff] flex items-center justify-center">
        <p className="text-[#1b1028] font-semibold">
          Verificando permissões...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (userProfile?.role === "admin") {
    return children;
  }

  if (userProfile?.permissions?.[permission] === true) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#f4f0ff] flex items-center justify-center p-6">
      <div className="bg-white border border-purple-100 rounded-2xl shadow p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#1b1028]">
          Acesso não liberado
        </h1>

        <p className="text-slate-600 mt-3">
          Seu usuário ainda não possui permissão para acessar este módulo.
        </p>

        <p className="text-sm text-slate-500 mt-3">
          Solicite a liberação ao gestor do sistema.
        </p>
      </div>
    </div>
  );
}

export default PermissionRoute;