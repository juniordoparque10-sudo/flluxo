import { useEffect, useRef, useState } from "react";

import {
  Activity,
  BellRing,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileSearch,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UserCircle2,
  X,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { signOut } from "firebase/auth";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";

import { auth, db } from "../firebase/config";

import NotificationBell from "../components/notifications/NotificationBell";

function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [user] = useAuthState(auth);

  const [userProfile, setUserProfile] =
    useState(null);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [userMenuOpen, setUserMenuOpen] =
    useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    const userRef = doc(
      db,
      "users",
      user.uid
    );

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
          where(
            "email",
            "==",
            user.email
          )
        );

        const emailSnapshot =
          await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          const firstUser =
            emailSnapshot.docs[0];

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
        console.error(
          "Erro ao carregar perfil:",
          error
        );

        setUserProfile(null);
        setLoadingProfile(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  function isActive(path) {
    return location.pathname.startsWith(
      path
    );
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/");
  }

  function canAccess(permission) {
    if (!userProfile) return false;

    if (userProfile.role === "admin")
      return true;

    return (
      userProfile.permissions?.[
        permission
      ] === true
    );
  }

  const menuClass = (path) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
      isActive(path)
        ? "bg-fuchsia-600 text-white shadow-lg"
        : "text-slate-200 hover:bg-fuchsia-600/20 hover:text-white"
    }`;

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f4f0ff] flex">
      {mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky z-50 lg:z-auto top-0 left-0 h-screen max-h-screen w-72 bg-[#1b1028] text-white px-5 py-5 shadow-2xl flex flex-col transition-transform duration-300 overflow-hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between shrink-0 mb-5">
          <img
            src="/logo-flluxo.png"
            alt="Flluxo"
            className="w-44 max-h-24 object-contain drop-shadow-xl"
          />

          <button
            type="button"
            onClick={closeMobileMenu}
            className="lg:hidden text-white"
          >
            <X size={26} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {loadingProfile ? (
            <p className="text-slate-400 text-sm px-3">
              Carregando permissões...
            </p>
          ) : (
            <>
              {canAccess("dashboard") && (
                <Link
                  to="/dashboard"
                  className={menuClass(
                    "/dashboard"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <Home size={18} />
                  Dashboard
                </Link>
              )}

              {canAccess(
                "globalSearch"
              ) && (
                <Link
                  to="/pesquisa"
                  className={menuClass(
                    "/pesquisa"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <FileSearch size={18} />
                  Pesquisa Global
                </Link>
              )}

              {canAccess("companies") && (
                <Link
                  to="/empresas"
                  className={menuClass(
                    "/empresas"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <Building2 size={18} />
                  Empresas
                </Link>
              )}

              {canAccess(
                "documents"
              ) && (
                <Link
                  to="/documentos"
                  className={menuClass(
                    "/documentos"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <FileText size={18} />
                  Documentos
                </Link>
              )}

              {canAccess("agenda") && (
                <Link
                  to="/agenda"
                  className={menuClass(
                    "/agenda"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <CalendarDays size={18} />
                  Agenda
                </Link>
              )}

              {canAccess("tasks") && (
                <Link
                  to="/tarefas"
                  className={menuClass(
                    "/tarefas"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <CheckSquare size={18} />
                  Tarefas
                </Link>
              )}

              {canAccess(
                "quickRegister"
              ) && (
                <Link
                  to="/registro-rapido"
                  className={menuClass(
                    "/registro-rapido"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <BellRing size={18} />
                  Registro Rápido
                </Link>
              )}

              {canAccess(
                "collaborators"
              ) && (
                <Link
                  to="/colaboradores"
                  className={menuClass(
                    "/colaboradores"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <Users size={18} />
                  Colaboradores
                </Link>
              )}

              {canAccess(
                "activityLogs"
              ) && (
                <Link
                  to="/logs"
                  className={menuClass(
                    "/logs"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <Activity size={18} />
                  Logs de Atividades
                </Link>
              )}

              {userProfile?.role ===
                "admin" && (
                <Link
                  to="/gestao-acessos"
                  className={menuClass(
                    "/gestao-acessos"
                  )}
                  onClick={
                    closeMobileMenu
                  }
                >
                  <ShieldCheck size={18} />
                  Gestão de Acessos
                </Link>
              )}
            </>
          )}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <header className="flex items-center justify-between p-4 lg:p-8 pb-0 gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="lg:hidden bg-white border border-purple-100 p-3 rounded-xl shadow"
            >
              <Menu
                size={22}
                className="text-[#1b1028]"
              />
            </button>

            <div>
              <p className="text-sm text-slate-500">
                Painel Flluxo
              </p>

              <h2 className="text-xl lg:text-2xl font-bold text-[#1b1028]">
                Gestão inteligente
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div
              className="relative"
              ref={dropdownRef}
            >
              <button
                type="button"
                onClick={() =>
                  setUserMenuOpen(
                    !userMenuOpen
                  )
                }
                className="flex items-center gap-3 bg-white border border-purple-100 hover:border-fuchsia-300 rounded-2xl px-4 py-2 shadow-sm transition"
              >
                {userProfile?.photoURL ? (
                  <img
                    src={
                      userProfile.photoURL
                    }
                    alt="Avatar"
                    className="w-11 h-11 rounded-full object-cover border-2 border-fuchsia-500"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-fuchsia-100 flex items-center justify-center">
                    <UserCircle2 className="text-fuchsia-600" />
                  </div>
                )}

                <div className="hidden md:block text-left">
                  <p className="font-semibold text-[#1b1028] text-sm">
                    {userProfile?.name ||
                      "Usuário"}
                  </p>

                  <p className="text-xs text-slate-500">
                    {userProfile?.role ===
                    "admin"
                      ? "Gestor"
                      : "Colaborador"}
                  </p>
                </div>

                <ChevronDown
                  size={18}
                  className="text-slate-500"
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-[110%] w-72 bg-white border border-purple-100 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-5 border-b border-purple-100">
                    <div className="flex items-center gap-3">
                      {userProfile?.photoURL ? (
                        <img
                          src={
                            userProfile.photoURL
                          }
                          alt="Avatar"
                          className="w-14 h-14 rounded-full object-cover border-2 border-fuchsia-500"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-fuchsia-100 flex items-center justify-center">
                          <UserCircle2 className="text-fuchsia-600" />
                        </div>
                      )}

                      <div>
                        <p className="font-bold text-[#1b1028]">
                          {userProfile?.name ||
                            "Usuário"}
                        </p>

                        <p className="text-sm text-slate-500 break-all">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <Link
                      to="/perfil"
                      onClick={() =>
                        setUserMenuOpen(
                          false
                        )
                      }
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 transition text-[#1b1028]"
                    >
                      <Settings size={18} />
                      Meu Perfil
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition"
                    >
                      <LogOut size={18} />
                      Sair do sistema
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">
          {children}
        </div>

        <footer className="text-center py-5 border-t border-purple-100 bg-white px-4">
          <p className="text-sm text-slate-500">
            Desenvolvido por{" "}
            <span className="font-semibold text-fuchsia-600">
              Park Solutions
            </span>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default AppLayout;