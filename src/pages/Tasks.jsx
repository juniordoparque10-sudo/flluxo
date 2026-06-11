import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle,
  Clock3,
  ShieldAlert,
  Search,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

import TaskModal from "../components/tasks/TaskModal";
import KanbanBoard from "../components/tasks/KanbanBoard";
import CreateTaskModal from "../components/tasks/CreateTaskModal";

function Tasks() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("kanban");

  const [companies, setCompanies] = useState([]);
  const [companyTasks, setCompanyTasks] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  useEffect(() => {
    const companiesQuery = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc")
    );

    const taskUnsubscribes = [];

    const unsubscribeCompanies = onSnapshot(companiesQuery, (snapshot) => {
      const companyList = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setCompanies(companyList);
      setLoading(false);

      taskUnsubscribes.forEach((unsubscribe) => unsubscribe());
      taskUnsubscribes.length = 0;

      companyList.forEach((company) => {
        const tasksQuery = query(
          collection(db, "companies", company.id, "tasks"),
          orderBy("createdAt", "asc")
        );

        const unsubscribeTasks = onSnapshot(tasksQuery, (taskSnapshot) => {
          const tasks = taskSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
            companyId: company.id,
            companyName: company.name,
          }));

          setCompanyTasks((prev) => ({
            ...prev,
            [company.id]: tasks,
          }));

          setSelectedTask((current) => {
            if (!current) return current;

            const updatedTask = tasks.find(
              (task) =>
                task.id === current.id &&
                company.id === current.companyId
            );

            return updatedTask || current;
          });
        });

        taskUnsubscribes.push(unsubscribeTasks);
      });
    });

    return () => {
      unsubscribeCompanies();

      taskUnsubscribes.forEach((unsubscribe) =>
        unsubscribe()
      );
    };
  }, []);

  function openTaskModal(task) {
    setSelectedTask(task);
    setTaskModalOpen(true);
  }

  const allTasks = useMemo(() => {
    return companies.flatMap((company) => {
      return companyTasks[company.id] || [];
    });
  }, [companies, companyTasks]);

  const filteredTasks = allTasks.filter((task) => {
    const searchLower = search.toLowerCase();

    return (
      task.title?.toLowerCase().includes(searchLower) ||
      task.companyName?.toLowerCase().includes(searchLower) ||
      task.responsible?.toLowerCase().includes(searchLower)
    );
  });

  function getPriorityColor(priority) {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-700";

      case "Baixa":
        return "bg-emerald-100 text-emerald-700";

      default:
        return "bg-fuchsia-100 text-fuchsia-700";
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1028]">
            Central de Tarefas
          </h1>

          <p className="text-slate-600 mt-2">
            Gestão operacional inteligente em tempo real.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateTaskOpen(true)}
            className="flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 py-3 rounded-xl font-semibold shadow transition"
          >
            <Plus size={18} />
            Nova Tarefa
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`p-3 rounded-xl border transition ${
                viewMode === "lista"
                  ? "bg-fuchsia-600 text-white border-fuchsia-600"
                  : "bg-white border-purple-100"
              }`}
            >
              <List size={18} />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-3 rounded-xl border transition ${
                viewMode === "kanban"
                  ? "bg-fuchsia-600 text-white border-fuchsia-600"
                  : "bg-white border-purple-100"
              }`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          <div className="relative w-full xl:w-96">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Pesquisar tarefa..."
              className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 mt-8">
        <Card icon={<CheckSquare />} title="Total" value={allTasks.length} />

        <Card
          icon={<Clock3 />}
          title="Pendentes"
          value={allTasks.filter((task) => task.status === "Pendente").length}
          color="fuchsia"
        />

        <Card
          icon={<TrendingUp />}
          title="Em andamento"
          value={
            allTasks.filter((task) => task.status === "Em andamento").length
          }
          color="orange"
        />

        <Card
          icon={<ShieldAlert />}
          title="Revisão"
          value={allTasks.filter((task) => task.status === "Revisão").length}
          color="yellow"
        />

        <Card
          icon={<AlertTriangle />}
          title="Alta prioridade"
          value={allTasks.filter((task) => task.priority === "Alta").length}
          color="red"
        />

        <Card
          icon={<CheckCircle />}
          title="Concluídas"
          value={allTasks.filter((task) => task.status === "Concluída").length}
          color="emerald"
        />
      </div>

      {loading ? (
        <div className="mt-10">
          <p className="text-slate-500">Carregando tarefas...</p>
        </div>
      ) : viewMode === "lista" ? (
        <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mt-8">
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                openTaskModal={openTaskModal}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        </div>
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          openTaskModal={openTaskModal}
        />
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={selectedTask}
        companyId={selectedTask?.companyId}
        companyName={selectedTask?.companyName}
      />

      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        companies={companies}
      />
    </AppLayout>
  );
}

function TaskCard({ task, openTaskModal, getPriorityColor }) {
  return (
    <div
      onClick={() => openTaskModal(task)}
      className="border border-purple-100 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 cursor-pointer hover:shadow-lg transition"
    >
      <div>
        <h3 className="font-bold text-lg text-[#1b1028]">
          {task.title}
        </h3>

        <div className="mt-3 space-y-1">
          <p className="text-slate-600 text-sm">
            Empresa: {task.companyName}
          </p>

          <p className="text-slate-600 text-sm">
            Responsável: {task.responsible || "Não informado"}
          </p>

          <p className="text-slate-600 text-sm">
            Prazo: {task.dueDate || "Sem prazo"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${getPriorityColor(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        <span className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-medium">
          {task.status}
        </span>
      </div>
    </div>
  );
}

function Card({ icon, title, value, color = "fuchsia" }) {
  const colors = {
    fuchsia: "text-fuchsia-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    orange: "text-orange-600",
    emerald: "text-emerald-600",
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow border border-purple-100">
      <div className={`${colors[color]} mb-4`}>
        {icon}
      </div>

      <p className="text-slate-500 text-sm">
        {title}
      </p>

      <h2 className={`text-3xl font-bold mt-2 ${colors[color]}`}>
        {value}
      </h2>
    </div>
  );
}

export default Tasks;