import { useEffect, useRef, useState } from "react";

import {
  Bell,
  CheckCheck,
  Trash2,
  CalendarDays,
  FileText,
  ClipboardList,
  MessageSquareMore,
  X,
  Smartphone,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";

import {
  enablePushNotifications,
  disablePushNotifications,
  listenForegroundMessages,
} from "../../services/pushNotificationService";

function NotificationBell() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [liveToast, setLiveToast] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const initialized = useRef(false);
  const knownIds = useRef(new Set());

  const user = auth.currentUser;

  useEffect(() => {
    setPushEnabled(
      Notification?.permission === "granted"
    );
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((notification) => {
          const deletedBy = notification.deletedBy || [];

          if (deletedBy.includes(user.uid)) return false;

          if (!notification.targetUserId && !notification.targetUserEmail) {
            return true;
          }

          if (notification.targetUserId === user.uid) return true;
          if (notification.targetUserEmail === user.email) return true;

          return false;
        });

      if (!initialized.current) {
        list.forEach((item) => knownIds.current.add(item.id));
        initialized.current = true;
      } else {
        list.forEach((item) => {
          if (!knownIds.current.has(item.id)) {
            knownIds.current.add(item.id);
            setLiveToast(item);
            playNotificationSound();

            setTimeout(() => {
              setLiveToast(null);
            }, 5000);
          }
        });
      }

      setNotifications(list);
    });

    return () => unsubscribe();
  }, [user]);

  async function handleEnablePush() {
    const token = await enablePushNotifications();

    listenForegroundMessages();

    if (token) {
      setPushEnabled(true);
      alert("Push ativado neste dispositivo!");
    } else {
      alert("Não foi possível ativar o push.");
    }
  }

  async function handleDisablePush() {
    const confirmDisable = window.confirm(
      "Deseja desativar o push deste dispositivo?"
    );

    if (!confirmDisable) return;

    const disabled = await disablePushNotifications();

    if (disabled) {
      setPushEnabled(false);
      alert("Push desativado neste dispositivo.");
    } else {
      alert("Não foi possível desativar o push.");
    }
  }

  function playNotificationSound() {
    try {
      const audio = new Audio(
        "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
      );

      audio.volume = 0.35;
      audio.play();
    } catch (error) {
      console.error(error);
    }
  }

  function isNotificationRead(notification) {
    const readBy = notification.readBy || [];
    return readBy.includes(user?.uid);
  }

  const unreadCount = notifications.filter(
    (notification) => !isNotificationRead(notification)
  ).length;

  async function markAsRead(notificationId) {
    try {
      await updateDoc(
        doc(db, "notifications", notificationId),
        {
          readBy: arrayUnion(user.uid),
        }
      );
    } catch (error) {
      console.error("Erro ao marcar notificação:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const batch = writeBatch(db);

      notifications.forEach((notification) => {
        batch.update(
          doc(db, "notifications", notification.id),
          {
            readBy: arrayUnion(user.uid),
          }
        );
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao marcar todas:", error);
    }
  }

  async function clearAllNotifications() {
    const confirmClear = window.confirm(
      "Deseja limpar todas as notificações apenas para você?"
    );

    if (!confirmClear) return;

    try {
      const batch = writeBatch(db);

      notifications.forEach((notification) => {
        batch.update(
          doc(db, "notifications", notification.id),
          {
            deletedBy: arrayUnion(user.uid),
          }
        );
      });

      await batch.commit();

      setNotifications([]);
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  }

  async function deleteNotification(notificationId) {
    try {
      await updateDoc(
        doc(db, "notifications", notificationId),
        {
          deletedBy: arrayUnion(user.uid),
        }
      );

      setNotifications((prev) =>
        prev.filter((item) => item.id !== notificationId)
      );
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
    }
  }

  function getNotificationTarget(notification) {
    if (notification.targetUrl) return notification.targetUrl;

    if (notification.documentId && notification.companyId) {
      return `/empresas/${notification.companyId}#document-${notification.documentId}`;
    }

    if (notification.taskId && notification.companyId) {
      return `/empresas/${notification.companyId}#task-${notification.taskId}`;
    }

    if (notification.type?.startsWith("agenda")) return "/agenda";
    if (notification.type === "quick-register") return "/registro-rapido";
    if (notification.companyId) return `/empresas/${notification.companyId}`;

    return "/dashboard";
  }

  async function openNotification(notification) {
    try {
      if (!isNotificationRead(notification)) {
        await markAsRead(notification.id);
      }

      const target = getNotificationTarget(notification);

      setOpen(false);

      if (target) navigate(target);
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

    if (notification.type === "task" || notification.type === "task-status") {
      return "Tarefa";
    }

    if (notification.type === "quick-register") return "Registro";
    if (notification.type?.startsWith("agenda")) return "Agenda";

    return "Sistema";
  }

  function getTypeColor(notification) {
    if (
      notification.type === "document" ||
      notification.type === "document-status"
    ) {
      return "bg-fuchsia-100 text-fuchsia-700";
    }

    if (notification.type === "task" || notification.type === "task-status") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (notification.type === "quick-register") {
      return "bg-orange-100 text-orange-700";
    }

    if (notification.type?.startsWith("agenda")) {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  function getTypeIcon(notification) {
    if (
      notification.type === "document" ||
      notification.type === "document-status"
    ) {
      return <FileText size={18} className="text-fuchsia-600" />;
    }

    if (notification.type === "task" || notification.type === "task-status") {
      return <ClipboardList size={18} className="text-emerald-600" />;
    }

    if (notification.type === "quick-register") {
      return <MessageSquareMore size={18} className="text-orange-600" />;
    }

    if (notification.type?.startsWith("agenda")) {
      return <CalendarDays size={18} className="text-blue-600" />;
    }

    return <Bell size={18} className="text-slate-600" />;
  }

  return (
    <>
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
                <h3 className="font-bold text-[#1b1028]">Notificações</h3>

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
                  >
                    <CheckCheck size={17} />
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllNotifications}
                    className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 border-b border-purple-100">
              {pushEnabled ? (
                <button
                  type="button"
                  onClick={handleDisablePush}
                  className="w-full flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-xl font-semibold transition"
                >
                  <Smartphone size={18} />
                  Desativar push neste dispositivo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-3 rounded-xl font-semibold transition"
                >
                  <Smartphone size={18} />
                  Ativar push neste dispositivo
                </button>
              )}
            </div>

            <div className="max-h-[500px] overflow-auto">
              {notifications.length === 0 ? (
                <p className="text-slate-500 p-4">Nenhuma notificação.</p>
              ) : (
                notifications.map((notification) => {
                  const target = getNotificationTarget(notification);
                  const isRead = isNotificationRead(notification);

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-purple-50 transition ${
                        isRead ? "bg-white" : "bg-purple-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getTypeIcon(notification)}</div>

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
                                    .toLocaleString("pt-BR")
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
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-fuchsia-600 font-semibold"
                          >
                            Marcar como lida
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs text-red-600 font-semibold"
                        >
                          Excluir só para mim
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

      {liveToast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <div className="w-[380px] bg-white border border-purple-100 shadow-2xl rounded-2xl overflow-hidden">
            <div className="bg-fuchsia-600 h-1 w-full" />

            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getTypeIcon(liveToast)}</div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-[#1b1028]">
                        {liveToast.title}
                      </h4>

                      <p className="text-sm text-slate-600 mt-1">
                        {liveToast.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLiveToast(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openNotification(liveToast)}
                    className="mt-4 text-sm font-semibold text-fuchsia-600 hover:underline"
                  >
                    Abrir notificação
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationBell;