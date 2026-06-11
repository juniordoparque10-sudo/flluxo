import { useEffect, useState } from "react";

import {
  X,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { createNotification } from "../../services/notificationService";
import TaskComments from "./TaskComments";
import TaskAttachments from "./TaskAttachments";

function TaskModal({
  open,
  onClose,
  task,
  companyId,
  companyName,
}) {
  const [collaborators, setCollaborators] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!open) return;

    const q = query(
      collection(db, "users"),
      orderBy("email", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setCollaborators(list);
    });

    return () => unsubscribe();
  }, [open]);

  if (!open || !task) return null;

  const isFollowing = task.followers?.includes(user?.uid);

  async function addHistory(description) {
    await updateDoc(
      doc(db, "companies", companyId, "tasks", task.id),
      {
        history: arrayUnion({
          description,
          userId: user?.uid || "",
          userEmail: user?.email || "Sistema",
          createdAt: new Date().toISOString(),
        }),
      }
    );
  }

  async function toggleFollow() {
    try {
      const taskRef = doc(
        db,
        "companies",
        companyId,
        "tasks",
        task.id
      );

      await updateDoc(taskRef, {
        followers: isFollowing
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      });

      await addHistory(
        isFollowing
          ? "parou de acompanhar esta tarefa"
          : "começou a acompanhar esta tarefa"
      );
    } catch (error) {
      console.error(error);
      alert("Erro ao alterar acompanhamento.");
    }
  }

  async function forwardTask() {
    if (!selectedUserId) {
      alert("Escolha um colaborador.");
      return;
    }

    const collaborator = collaborators.find(
      (item) => item.id === selectedUserId
    );

    if (!collaborator) return;

    try {
      setSaving(true);

      const taskRef = doc(
        db,
        "companies",
        companyId,
        "tasks",
        task.id
      );

      await updateDoc(taskRef, {
        responsibleUserId: collaborator.id,
        responsible: collaborator.name || collaborator.email,
        followers: arrayUnion(collaborator.id),
        updatedAt: serverTimestamp(),
      });

      await addHistory(
        `encaminhou a tarefa para ${
          collaborator.name || collaborator.email
        }`
      );

      await createNotification({
        title: "Tarefa encaminhada",
        message: `${task.title} foi encaminhada para você em ${companyName}.`,
        type: "task-status",
        companyId,
        taskId: task.id,
        targetUrl: `/empresas/${companyId}#task-${task.id}`,
        targetUserId: collaborator.id,
        targetUserEmail: collaborator.email || "",
        excludeUserId: user?.uid || "",
      });

      setSelectedUserId("");

      alert("Tarefa encaminhada com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao encaminhar tarefa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex justify-end">
      <div className="w-full max-w-4xl h-full bg-[#f4f0ff] overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-purple-100 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#1b1028]">
              {task.title}
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Empresa: {companyName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 p-3 rounded-xl"
          >
            <X />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow">
            <h3 className="text-xl font-bold text-[#1b1028] mb-4">
              Detalhes da tarefa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info
                label="Status"
                value={task.status || "Pendente"}
              />

              <Info
                label="Prioridade"
                value={task.priority || "Média"}
              />

              <Info
                label="Responsável"
                value={task.responsible || "Não informado"}
              />

              <Info
                label="Prazo"
                value={task.dueDate || "Sem prazo"}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow">
            <h3 className="text-xl font-bold text-[#1b1028] mb-4">
              Encaminhar tarefa
            </h3>

            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={selectedUserId}
                onChange={(e) =>
                  setSelectedUserId(e.target.value)
                }
                className="flex-1 border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="">
                  Escolha um colaborador
                </option>

                {collaborators.map((person) => (
                  <option
                    key={person.id}
                    value={person.id}
                  >
                    {person.name || person.email}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={forwardTask}
                disabled={saving}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <UserPlus size={18} />
                {saving ? "Encaminhando..." : "Encaminhar"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow">
            <h3 className="text-xl font-bold text-[#1b1028] mb-4">
              Acompanhamento
            </h3>

            <button
              type="button"
              onClick={toggleFollow}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium ${
                isFollowing
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isFollowing ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}

              {isFollowing
                ? "Parar de acompanhar"
                : "Acompanhar tarefa"}
            </button>
          </div>

          <TaskAttachments
            companyId={companyId}
            task={task}
          />

          <TaskComments
            companyId={companyId}
            companyName={companyName}
            task={task}
          />

          <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow">
            <h3 className="text-xl font-bold text-[#1b1028] mb-4">
              Histórico
            </h3>

            {task.history?.length > 0 ? (
              <div className="space-y-3">
                {[...task.history]
                  .reverse()
                  .map((item, index) => (
                    <div
                      key={index}
                      className="border border-purple-100 rounded-xl p-4"
                    >
                      <p className="font-medium text-[#1b1028]">
                        {item.userEmail} {item.description}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {item.createdAt
                          ? new Date(
                              item.createdAt
                            ).toLocaleString("pt-BR")
                          : ""}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-slate-500">
                Nenhuma movimentação registrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="font-bold text-[#1b1028] mt-1">
        {value}
      </p>
    </div>
  );
}

export default TaskModal;