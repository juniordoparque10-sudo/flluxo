import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  Activity,
  Clock3,
  FileClock,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";

import { Link } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  useEffect(() => {
    const logsQuery = query(
      collection(db, "logs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setLogs(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar logs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function formatDate(date) {
    if (!date) return "Sem data";

    const parsedDate = date?.toDate
      ? date.toDate()
      : new Date(date);

    return parsedDate.toLocaleString("pt-BR");
  }

  function getTypeColor(type) {
    if (type?.includes("document")) {
      return "bg-fuchsia-100 text-fuchsia-700";
    }

    if (type?.includes("task")) {
      return "bg-orange-100 text-orange-700";
    }

    if (type?.includes("company")) {
      return "bg-emerald-100 text-emerald-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = search.toLowerCase();

      const matchesSearch =
        log.action?.toLowerCase().includes(searchLower) ||
        log.description?.toLowerCase().includes(searchLower) ||
        log.userEmail?.toLowerCase().includes(searchLower);

      const matchesFilter =
        filter === "Todos"
          ? true
          : log.type?.includes(filter.toLowerCase());

      return matchesSearch && matchesFilter;
    });
  }, [logs, search, filter]);

  const documentLogs = logs.filter((item) =>
    item.type?.includes("document")
  ).length;

  const taskLogs = logs.filter((item) =>
    item.type?.includes("task")
  ).length;

  const filterOptions = [
    "Todos",
    "Document",
    "Task",
    "Company",
  ];

  return (
    <AppLayout>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="bg-fuchsia-100 text-fuchsia-700 p-3 rounded-xl">
            <Activity size={24} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-[#1b1028]">
              Logs de Atividades
            </h1>

            <p className="text-slate-600 mt-1">
              Auditoria de ações realizadas no sistema.
            </p>
          </div>
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
            placeholder="Pesquisar ação, usuário ou descrição..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8 mb-8">
        <DashboardCard
          icon={<FileClock />}
          title="Total"
          value={logs.length}
          color="fuchsia"
        />

        <DashboardCard
          icon={<ShieldCheck />}
          title="Documentos"
          value={documentLogs}
          color="emerald"
        />

        <DashboardCard
          icon={<Clock3 />}
          title="Tarefas"
          value={taskLogs}
          color="orange"
        />

        <DashboardCard
          icon={<User />}
          title="Usuários"
          value={
            new Set(
              logs.map((item) => item.userEmail)
            ).size
          }
          color="slate"
        />
      </div>

      <div className="bg-white rounded-2xl shadow border border-purple-100 p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1b1028]">
              Histórico do sistema
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Registros automáticos das principais ações.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                  filter === option
                    ? "bg-fuchsia-600 text-white border-fuchsia-600"
                    : "bg-white border-purple-100 text-[#1b1028] hover:bg-purple-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">
            Carregando logs...
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-slate-500">
            Nenhum log encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-purple-100 rounded-2xl p-5 hover:bg-purple-50 transition"
              >
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#1b1028] text-lg">
                        {log.action}
                      </h3>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(
                          log.type
                        )}`}
                      >
                        {log.type || "info"}
                      </span>
                    </div>

                    <p className="text-slate-600 mt-2">
                      {log.description}
                    </p>

                    <div className="flex flex-wrap gap-3 mt-4 text-sm text-slate-500">
                      <span>
                        Usuário: {log.userEmail || "Sistema"}
                      </span>

                      <span>
                        Data: {formatDate(log.createdAt)}
                      </span>
                    </div>
                  </div>

                  {log.targetUrl && (
                    <Link
                      to={log.targetUrl}
                      className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                    >
                      Abrir item
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DashboardCard({
  icon,
  title,
  value,
  color = "fuchsia",
}) {
  const colors = {
    fuchsia: "text-fuchsia-600",
    emerald: "text-emerald-600",
    orange: "text-orange-600",
    slate: "text-slate-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-purple-100">
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

export default ActivityLogs;