import { useEffect, useState } from "react";
import { CheckCircle, Edit, Trash2, X } from "lucide-react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { createNotification } from "../services/notificationService";

function TaskSection({
  companyId,
  highlightedItem,
}) {
  const storageKey = `flluxo_tasks_${companyId}`;
  const migrationKey = `flluxo_tasks_${companyId}_migrated`;

  const [tasks, setTasks] = useState([]);
  const [companyName, setCompanyName] =
    useState("Empresa não identificada");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingTaskId, setEditingTaskId] =
    useState(null);

  const [permissions, setPermissions] = useState({});
  const [userRole, setUserRole] =
    useState("collaborator");

  const [form, setForm] = useState({
    title: "",
    responsible: "",
    dueDate: "",
    priority: "Média",
    status: "Pendente",
  });

  useEffect(() => {
    async function loadPermissions() {
      try {
        const user = auth.currentUser;

        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setPermissions(data.permissions || {});
          setUserRole(data.role || "collaborator");
          return;
        }

        const emailQuery = query(
          collection(db, "users"),
          where("email", "==", user.email)
        );

        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          const data = emailSnapshot.docs[0].data();

          setPermissions(data.permissions || {});
          setUserRole(data.role || "collaborator");
        }
      } catch (error) {
        console.error("Erro ao carregar permissões:", error);
      }
    }

    loadPermissions();
  }, []);

  useEffect(() => {
    async function loadCompany() {
      if (!companyId) return;

      const companyRef = doc(
        db,
        "companies",
        companyId
      );

      const companySnap =
        await getDoc(companyRef);

      if (companySnap.exists()) {
        setCompanyName(
          companySnap.data().name ||
            "Empresa não identificada"
        );
      }
    }

    loadCompany();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    migrateLocalTasks();

    const q = query(
      collection(
        db,
        "companies",
        companyId,
        "tasks"
      ),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        setTasks(list);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Erro ao carregar tarefas:",
          error
        );

        alert(
          "Erro ao carregar tarefas em tempo real."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const isAdmin = userRole === "admin";

  const canCreateTask =
    isAdmin || permissions?.taskCreate === true;

  const canEditTask =
    isAdmin || permissions?.taskEdit === true;

  const canDeleteTask =
    isAdmin || permissions?.taskDelete === true;

  async function migrateLocalTasks() {
    try {
      const migrated =
        localStorage.getItem(
          migrationKey
        );

      if (migrated === "true") return;

      const localTasks = JSON.parse(
        localStorage.getItem(
          storageKey
        ) || "[]"
      );

      if (localTasks.length === 0) {
        localStorage.setItem(
          migrationKey,
          "true"
        );

        return;
      }

      for (const task of localTasks) {
        await addDoc(
          collection(
            db,
            "companies",
            companyId,
            "tasks"
          ),
          {
            title: task.title || "",
            responsible:
              task.responsible || "",

            dueDate:
              task.dueDate || "",

            priority:
              task.priority || "Média",

            status:
              task.status || "Pendente",

            createdAt:
              task.createdAt ||
              new Date().toISOString(),

            migratedFromLocalStorage:
              true,
          }
        );
      }

      localStorage.setItem(
        migrationKey,
        "true"
      );

      console.log(
        "Tarefas migradas com sucesso!"
      );
    } catch (error) {
      console.error(
        "Erro ao migrar tarefas:",
        error
      );
    }
  }

  const sortedTasks = [...tasks].sort(
    (a, b) => {
      const aCompleted =
        a.status === "Concluída";

      const bCompleted =
        b.status === "Concluída";

      if (aCompleted && !bCompleted)
        return 1;

      if (!aCompleted && bCompleted)
        return -1;

      const aDate =
        a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(
              a.createdAt || 0
            );

      const bDate =
        b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(
              b.createdAt || 0
            );

      return aDate - bDate;
    }
  );

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  }

  function resetForm() {
    setForm({
      title: "",
      responsible: "",
      dueDate: "",
      priority: "Média",
      status: "Pendente",
    });

    setEditingTaskId(null);
  }

  function handleEditTask(task) {
    if (!canEditTask) {
      alert(
        "Você não possui permissão para editar tarefas."
      );

      return;
    }

    setEditingTaskId(task.id);

    setForm({
      title: task.title || "",
      responsible:
        task.responsible || "",

      dueDate:
        task.dueDate || "",

      priority:
        task.priority || "Média",

      status:
        task.status || "Pendente",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (editingTaskId && !canEditTask) {
      alert(
        "Você não possui permissão para editar tarefas."
      );

      return;
    }

    if (!editingTaskId && !canCreateTask) {
      alert(
        "Você não possui permissão para criar tarefas."
      );

      return;
    }

    if (!form.title.trim()) {
      alert(
        "Informe o nome da tarefa"
      );

      return;
    }

    try {
      setSaving(true);

      if (editingTaskId) {
        const taskRef = doc(
          db,
          "companies",
          companyId,
          "tasks",
          editingTaskId
        );

        await updateDoc(taskRef, {
          ...form,
          updatedAt:
            serverTimestamp(),
        });

        await createNotification({
          title:
            "Tarefa atualizada",

          message: `${form.title} em ${companyName} foi atualizada.`,

          type: "task-status",

          companyId,

          taskId:
            editingTaskId,

          targetUrl: `/empresas/${companyId}#task-${editingTaskId}`,
        });

        resetForm();

        alert(
          "Tarefa atualizada com sucesso!"
        );

        return;
      }

      const taskRef = await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "tasks"
        ),
        {
          ...form,
          createdAt:
            serverTimestamp(),
        }
      );

      await createNotification({
        title:
          "Nova tarefa criada",

        message: `${form.title} foi criada em ${companyName}.`,

        type: "task",

        companyId,

        taskId: taskRef.id,

        targetUrl: `/empresas/${companyId}#task-${taskRef.id}`,
      });

      resetForm();

      alert(
        "Tarefa cadastrada com sucesso!"
      );
    } catch (error) {
      console.error(
        "Erro ao salvar tarefa:",
        error
      );

      alert(
        "Erro ao salvar tarefa no Firebase."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(taskId) {
    if (!canEditTask) {
      alert(
        "Você não possui permissão para alterar status das tarefas."
      );

      return;
    }

    const taskFound = tasks.find(
      (task) => task.id === taskId
    );

    if (!taskFound) return;

    const newStatus =
      taskFound.status ===
      "Concluída"
        ? "Pendente"
        : "Concluída";

    try {
      const taskRef = doc(
        db,
        "companies",
        companyId,
        "tasks",
        taskId
      );

      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt:
          serverTimestamp(),
      });

      await createNotification({
        title:
          newStatus ===
          "Concluída"
            ? "Tarefa concluída"
            : "Tarefa reaberta",

        message: `${taskFound.title} em ${companyName} foi marcada como ${newStatus}.`,

        type: "task-status",

        companyId,

        taskId,

        targetUrl: `/empresas/${companyId}#task-${taskId}`,
      });
    } catch (error) {
      console.error(
        "Erro ao atualizar tarefa:",
        error
      );

      alert(
        "Erro ao atualizar tarefa."
      );
    }
  }

  async function deleteTask(task) {
    if (!canDeleteTask) {
      alert(
        "Você não possui permissão para apagar tarefas."
      );

      return;
    }

    const confirmDelete =
      window.confirm(
        `Deseja apagar a tarefa "${task.title}"?`
      );

    if (!confirmDelete) return;

    try {
      await deleteDoc(
        doc(
          db,
          "companies",
          companyId,
          "tasks",
          task.id
        )
      );

      if (
        editingTaskId === task.id
      ) {
        resetForm();
      }

      await createNotification({
        title:
          "Tarefa apagada",

        message: `${task.title} foi apagada em ${companyName}.`,

        type: "task-status",

        companyId,

        taskId: task.id,

        targetUrl: `/empresas/${companyId}`,
      });

      alert(
        "Tarefa apagada com sucesso!"
      );
    } catch (error) {
      console.error(
        "Erro ao apagar tarefa:",
        error
      );

      alert(
        "Erro ao apagar tarefa."
      );
    }
  }

  function getPriorityColor(
    priority
  ) {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-700";

      case "Baixa":
        return "bg-emerald-100 text-emerald-700";

      default:
        return "bg-fuchsia-100 text-fuchsia-700";
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "Concluída":
        return "bg-emerald-100 text-emerald-700";

      case "Em andamento":
        return "bg-orange-100 text-orange-700";

      default:
        return "bg-fuchsia-100 text-fuchsia-700";
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8 border border-purple-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#1b1028]">
          Tarefas e Checklist
        </h2>

        {editingTaskId && (
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <X size={16} />
            Cancelar edição
          </button>
        )}
      </div>

      {(canCreateTask || editingTaskId) ? (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8"
        >
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Tarefa
            </label>

            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Ex: Enviar boleto"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Responsável
            </label>

            <input
              type="text"
              name="responsible"
              value={form.responsible}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Nome"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Prazo
            </label>

            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Prioridade
            </label>

            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option>Baixa</option>
              <option>Média</option>
              <option>Alta</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Status
            </label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option>Pendente</option>
              <option>Em andamento</option>
              <option>Concluída</option>
            </select>
          </div>

          <div className="md:col-span-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : editingTaskId
                ? "Salvar Alterações"
                : "Salvar Tarefa"}
            </button>

            {editingTaskId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
          <p className="text-slate-600 text-sm">
            Você pode visualizar as tarefas, mas não possui permissão para criar novas tarefas.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
          <p className="text-slate-500">
            Carregando tarefas...
          </p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
          <p className="text-slate-500">
            Nenhuma tarefa cadastrada para esta empresa.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTasks.map((task) => (
            <div
              id={`task-${task.id}`}
              key={task.id}
              className={`border rounded-xl p-5 flex items-center justify-between gap-4 transition-all duration-500 scroll-mt-32 ${
                highlightedItem === task.id
                  ? "border-fuchsia-600 bg-fuchsia-100 shadow-[0_0_30px_rgba(192,38,211,0.45)] scale-[1.01]"
                  : editingTaskId === task.id
                  ? "border-fuchsia-300 bg-purple-50"
                  : "border-purple-100 hover:bg-purple-50"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {task.status ===
                    "Concluída" && (
                    <CheckCircle
                      size={20}
                      className="text-emerald-600"
                    />
                  )}

                  <h3
                    className={`font-bold text-lg ${
                      task.status ===
                      "Concluída"
                        ? "text-emerald-700"
                        : "text-[#1b1028]"
                    }`}
                  >
                    {task.title}
                  </h3>
                </div>

                <p className="text-slate-600 text-sm mt-1">
                  Responsável:{" "}
                  {task.responsible ||
                    "Não informado"}
                </p>

                <p className="text-slate-600 text-sm">
                  Prazo:{" "}
                  {task.dueDate ||
                    "Sem prazo"}
                </p>

                <p className="text-slate-600 text-sm">
                  Status: {task.status}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>

                {canEditTask && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleTask(task.id)
                    }
                    className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    {task.status ===
                    "Concluída"
                      ? "Reabrir"
                      : "Concluir"}
                  </button>
                )}

                {canEditTask && (
                  <button
                    type="button"
                    onClick={() =>
                      handleEditTask(task)
                    }
                    className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                )}

                {canDeleteTask && (
                  <button
                    type="button"
                    onClick={() =>
                      deleteTask(task)
                    }
                    className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <Trash2 size={16} />
                    Apagar
                  </button>
                )}

                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                    task.status
                  )}`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskSection;