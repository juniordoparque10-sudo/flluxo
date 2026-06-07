import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import {
  CheckCircle,
  Clock3,
  ShieldAlert,
  Search,
  Building2,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

function Tasks() {
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");

  const [companies, setCompanies] = useState([]);
  const [companyTasks, setCompanyTasks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companiesQuery = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc")
    );

    const taskUnsubscribes = [];

    const unsubscribeCompanies = onSnapshot(
      companiesQuery,
      (snapshot) => {
        const companyList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setCompanies(companyList);
        setLoading(false);

        taskUnsubscribes.forEach((unsubscribe) =>
          unsubscribe()
        );

        taskUnsubscribes.length = 0;

        companyList.forEach((company) => {
          const tasksQuery = query(
            collection(db, "companies", company.id, "tasks"),
            orderBy("createdAt", "asc")
          );

          const unsubscribeTasks = onSnapshot(
            tasksQuery,
            (taskSnapshot) => {
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
            }
          );

          taskUnsubscribes.push(unsubscribeTasks);
        });
      },
      (error) => {
        console.error("Erro ao carregar tarefas:", error);
        alert("Erro ao carregar tarefas em tempo real.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeCompanies();

      taskUnsubscribes.forEach((unsubscribe) =>
        unsubscribe()
      );
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getDaysDiff(date) {
    if (!date) return null;

    const dueDate = new Date(date);

    dueDate.setHours(0, 0, 0, 0);

    return Math.ceil(
      (dueDate - today) / (1000 * 60 * 60 * 24)
    );
  }

  function getDeadlineColor(task) {
    if (task.status === "Concluída") {
      return "border-emerald-100 bg-emerald-50";
    }

    const days = getDaysDiff(task.dueDate);

    if (days === null) return "border-purple-100 bg-white";

    if (days < 0) return "border-red-200 bg-red-50";

    if (days === 0) {
      return "border-orange-200 bg-orange-50";
    }

    if (days <= 3) {
      return "border-yellow-200 bg-yellow-50";
    }

    if (days <= 7) {
      return "border-fuchsia-100 bg-purple-50";
    }

    return "border-purple-100 bg-white";
  }

  function getDeadlineLabel(task) {
    if (task.status === "Concluída") {
      return "Concluída";
    }

    const days = getDaysDiff(task.dueDate);

    if (days === null) return "Sem prazo";

    if (days < 0) {
      return `Atrasada há ${Math.abs(days)} dia(s)`;
    }

    if (days === 0) return "Vence hoje";

    if (days <= 7) {
      return `Vence em ${days} dia(s)`;
    }

    return `Prazo em ${days} dia(s)`;
  }

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

  const allTasks = useMemo(() => {
    return companies.flatMap((company) => {
      return companyTasks[company.id] || [];
    });
  }, [companies, companyTasks]);

  const pendingTasks = allTasks.filter(
    (task) => task.status !== "Concluída"
  );

  const progressTasks = allTasks.filter(
    (task) => task.status === "Em andamento"
  );

  const completedTasks = allTasks.filter(
    (task) => task.status === "Concluída"
  );

  const overdueTasks = pendingTasks.filter((task) => {
    const days = getDaysDiff(task.dueDate);

    return days !== null && days < 0;
  });

  const highPriorityTasks = pendingTasks.filter(
    (task) => task.priority === "Alta"
  );

  const sortedTasks = [...allTasks].sort((a, b) => {
    const aDays = getDaysDiff(a.dueDate);
    const bDays = getDaysDiff(b.dueDate);

    const priorityWeight = {
      Alta: 3,
      Média: 2,
      Baixa: 1,
    };

    if (
      a.status === "Concluída" &&
      b.status !== "Concluída"
    ) {
      return 1;
    }

    if (
      a.status !== "Concluída" &&
      b.status === "Concluída"
    ) {
      return -1;
    }

    const priorityDiff =
      priorityWeight[b.priority] -
      priorityWeight[a.priority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (aDays === null) return 1;

    if (bDays === null) return -1;

    return aDays - bDays;
  });

  const filteredTasks = sortedTasks.filter((task) => {
    const searchLower = search.toLowerCase();

    const matchesSearch =
      task.title
        ?.toLowerCase()
        .includes(searchLower) ||
      task.companyName
        ?.toLowerCase()
        .includes(searchLower) ||
      task.responsible
        ?.toLowerCase()
        .includes(searchLower);

    if (!matchesSearch) return false;

    if (filter === "Todas") return true;

    if (filter === "Pendentes") {
      return task.status === "Pendente";
    }

    if (filter === "Em andamento") {
      return task.status === "Em andamento";
    }

    if (filter === "Concluídas") {
      return task.status === "Concluída";
    }

    if (filter === "Alta prioridade") {
      return task.priority === "Alta";
    }

    if (filter === "Atrasadas") {
      const days = getDaysDiff(task.dueDate);

      return (
        task.status !== "Concluída" &&
        days !== null &&
        days < 0
      );
    }

    return true;
  });

  const filterOptions = [
    "Todas",
    "Pendentes",
    "Em andamento",
    "Concluídas",
    "Alta prioridade",
    "Atrasadas",
  ];

  function filterButtonClass(option) {
    return filter === option
      ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow"
      : "bg-white text-[#1b1028] border-purple-100 hover:bg-purple-50";
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

        <div className="relative w-full xl:w-96">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar tarefa, empresa ou responsável..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 mt-8">
        <Card
          icon={<CheckSquare />}
          title="Total"
          value={allTasks.length}
        />

        <Card
          icon={<Clock3 />}
          title="Pendentes"
          value={pendingTasks.length}
          color="fuchsia"
        />

        <Card
          icon={<TrendingUp />}
          title="Em andamento"
          value={progressTasks.length}
          color="orange"
        />

        <Card
          icon={<ShieldAlert />}
          title="Atrasadas"
          value={overdueTasks.length}
          color="red"
        />

        <Card
          icon={<AlertTriangle />}
          title="Alta prioridade"
          value={highPriorityTasks.length}
          color="yellow"
        />

        <Card
          icon={<CheckCircle />}
          title="Concluídas"
          value={completedTasks.length}
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mt-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1b1028]">
              Lista geral de tarefas
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Priorização automática por urgência.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${filterButtonClass(
                  option
                )}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">
            Carregando tarefas em tempo real...
          </p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-slate-500">
            Nenhuma tarefa encontrada.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div
                key={`${task.companyId}-${task.id}`}
                className={`border rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 ${getDeadlineColor(
                  task
                )}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {task.status === "Concluída" && (
                      <CheckCircle
                        size={20}
                        className="text-emerald-600"
                      />
                    )}

                    <h3
                      className={`font-bold text-lg ${
                        task.status === "Concluída"
                          ? "text-emerald-700"
                          : "text-[#1b1028]"
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-slate-600 text-sm">
                      Empresa: {task.companyName}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Responsável:{" "}
                      {task.responsible || "Não informado"}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Prazo:{" "}
                      {task.dueDate || "Sem prazo"} •{" "}
                      {getDeadlineLabel(task)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>

                  <Link
                    to={`/empresas/${task.companyId}#task-${task.id}`}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Ir para tarefa
                  </Link>

                  <Link
                    to={`/empresas/${task.companyId}`}
                    className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Abrir empresa
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Card({
  icon,
  title,
  value,
  color = "fuchsia",
}) {
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