import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  CalendarDays,
  FileText,
  ClipboardList,
  MessageSquareMore,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase/config";

function NotificationBell() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setNotifications(list);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  async function markAsRead(notificationId) {
    try {
      const notificationRef = doc(
        db,
        "notifications",
        notificationId
      );

      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (error) {
      console.error("Erro ao marcar notificação:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const batch = writeBatch(db);

      notifications.forEach((notification) => {
        const notificationRef = doc(
          db,
          "notifications",
          notification.id
        );

        batch.update(notificationRef, {
          read: true,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao marcar todas:", error);
    }
  }

  async function clearAllNotifications() {
    const confirmClear = window.confirm(
      "Deseja limpar todas as notificações?"
    );

    if (!confirmClear) return;

    try {
      const batch = writeBatch(db);

      notifications.forEach((notification) => {
        const notificationRef = doc(
          db,
          "notifications",
          notification.id
        );

        batch.delete(notificationRef);
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  }

  async function deleteNotification(notificationId) {
    try {
      const notificationRef = doc(
        db,
        "notifications",
        notificationId
      );

      await deleteDoc(notificationRef);
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
    }
  }

  function getNotificationTarget(notification) {
    if (notification.targetUrl) {
      return notification.targetUrl;
    }

    // DOCUMENTOS
    if (notification.documentId && notification.companyId) {
      return `/empresas/${notification.companyId}#document-${notification.documentId}`;
    }

    // TAREFAS
    if (notification.taskId && notification.companyId) {
      return `/empresas/${notification.companyId}#task-${notification.taskId}`;
    }

    // AGENDA
    if (
      notification.type?.startsWith("agenda")
    ) {
      return "/agenda";
    }

    // REGISTRO RÁPIDO
    if (notification.type === "quick-register") {
      return "/registro-rapido";
    }

    // EMPRESA
    if (notification.companyId) {
      return `/empresas/${notification.companyId}`;
    }

    // DASHBOARD
    return "/dashboard";
  }

  async function openNotification(notification) {
    try {
      if (!notification.read) {
        await markAsRead(notification.id);
      }

      const target = getNotificationTarget(notification);

      setOpen(false);

      if (target) {
        navigate(target);
      }
    } catch (error) {
      console.error("Erro ao abrir notificação:", error);
    }
  }

  function getTypeBadge(notification) {
    if (
      notification.type === "document" ||
      notification.type === "document-status"
    ) {
      return "Documento";
    }

    if (
      notification.type === "task" ||
      notification.type === "task-status"
    ) {
      return "Tarefa";
    }

    if (notification.type === "quick-register") {
      return "Registro";
    }

    if (
      notification.type?.startsWith("agenda")
    ) {
      return "Agenda";
    }

    return "Sistema";
  }

  function getTypeColor(notification) {
    if (
      notification.type === "document" ||
      notification.type === "document-status"
    ) {
      return "bg-fuchsia-100 text-fuchsia-700";
    }

    if (
      notification.type === "task" ||
      notification.type === "task-status"
    ) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (notification.type === "quick-register") {
      return "bg-orange-100 text-orange-700";
    }

    if (
      notification.type?.startsWith("agenda")
    ) {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  function getTypeIcon(notification) {
    if (
      notification.type === "document" ||
      notification.type === "document-status"
    ) {
      return (
        <FileText
          size={18}
          className="text-fuchsia-600"
        />
      );
    }

    if (
      notification.type === "task" ||
      notification.type === "task-status"
    ) {
      return (
        <ClipboardList
          size={18}
          className="text-emerald-600"
        />
      );
    }

    if (notification.type === "quick-register") {
      return (
        <MessageSquareMore
          size={18}
          className="text-orange-600"
        />
      );
    }

    if (
      notification.type?.startsWith("agenda")
    ) {
      return (
        <CalendarDays
          size={18}
          className="text-blue-600"
        />
      );
    }

    return (
      <Bell
        size={18}
        className="text-slate-600"
      />
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative bg-white border border-purple-100 rounded-xl p-3 shadow hover:bg-purple-50 transition"
      >
        <Bell size={22} className="text-[#1b1028]" />

        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[440px] bg-white border border-purple-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-purple-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[#1b1028]">
                Notificações
              </h3>

              <p className="text-xs text-slate-500">
                Clique para abrir diretamente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="bg-purple-50 hover:bg-purple-100 text-[#1b1028] p-2 rounded-lg transition"
                  title="Marcar todas"
                >
                  <CheckCheck size={17} />
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition"
                  title="Limpar todas"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[500px] overflow-auto">
            {notifications.length === 0 ? (
              <p className="text-slate-500 p-4">
                Nenhuma notificação.
              </p>
            ) : (
              notifications.map((notification) => {
                const target =
                  getNotificationTarget(notification);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-purple-50 transition ${
                      notification.read
                        ? "bg-white"
                        : "bg-purple-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openNotification(notification)
                      }
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getTypeIcon(notification)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-[#1b1028]">
                                {notification.title}
                              </h4>

                              <p className="text-sm text-slate-600 mt-1">
                                {notification.message}
                              </p>
                            </div>

                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getTypeColor(
                                notification
                              )}`}
                            >
                              {getTypeBadge(notification)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-2">
                            {notification.createdAt?.toDate
                              ? notification.createdAt
                                  .toDate()
                                  .toLocaleString(
                                    "pt-BR"
                                  )
                              : ""}
                          </p>

                          {target && (
                            <p className="text-xs text-fuchsia-600 font-semibold mt-2">
                              Abrir local da notificação
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-4 mt-4 ml-8">
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() =>
                            markAsRead(notification.id)
                          }
                          className="text-xs text-fuchsia-600 font-semibold"
                        >
                          Marcar como lida
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deleteNotification(notification.id)
                        }
                        className="text-xs text-red-600 font-semibold"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;