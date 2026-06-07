import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Link } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

function Dashboard() {
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");

  const [companies, setCompanies] = useState([]);
  const [companyData, setCompanyData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companiesQuery = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc")
    );

    const childUnsubscribes = [];

    const unsubscribeCompanies = onSnapshot(
      companiesQuery,
      (snapshot) => {
        const companyList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setCompanies(companyList);
        setLoading(false);

        childUnsubscribes.forEach((unsubscribe) => unsubscribe());
        childUnsubscribes.length = 0;

        companyList.forEach((company) => {
          const documentsQuery = query(
            collection(db, "companies", company.id, "documents"),
            orderBy("createdAt", "desc")
          );

          const tasksQuery = query(
            collection(db, "companies", company.id, "tasks"),
            orderBy("createdAt", "asc")
          );

          const unsubscribeDocuments = onSnapshot(documentsQuery, (docSnap) => {
            const documents = docSnap.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

            setCompanyData((prev) => ({
              ...prev,
              [company.id]: {
                ...(prev[company.id] || {}),
                documents,
              },
            }));
          });

          const unsubscribeTasks = onSnapshot(tasksQuery, (taskSnap) => {
            const tasks = taskSnap.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

            setCompanyData((prev) => ({
              ...prev,
              [company.id]: {
                ...(prev[company.id] || {}),
                tasks,
              },
            }));
          });

          childUnsubscribes.push(unsubscribeDocuments);
          childUnsubscribes.push(unsubscribeTasks);
        });
      },
      (error) => {
        console.error("Erro ao carregar dashboard:", error);
        alert("Erro ao carregar dashboard.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeCompanies();
      childUnsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getDaysDiff(date) {
    if (!date) return null;

    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  }

  function getCompanyStatus(pending, overdue, todayDue) {
    if (overdue > 0) {
      return {
        label: "Crítica",
        badge: "bg-red-600 text-white",
      };
    }

    if (todayDue > 0) {
      return {
        label: "Atenção hoje",
        badge: "bg-orange-500 text-white",
      };
    }

    if (pending > 0) {
      return {
        label: "Pendências",
        badge: "bg-yellow-500 text-white",
      };
    }

    return {
      label: "Em dia",
      badge: "bg-emerald-600 text-white",
    };
  }

  const companyPanels = useMemo(() => {
    return companies.map((company) => {
      const documents = companyData[company.id]?.documents || [];
      const tasks = companyData[company.id]?.tasks || [];

      const pendingDocuments = documents.filter(
        (document) =>
          document.status !== "Pago" &&
          document.status !== "Arquivado"
      );

      const resolvedDocuments = documents.filter(
        (document) =>
          document.status === "Pago" ||
          document.status === "Arquivado"
      );

      const pendingTasks = tasks.filter(
        (task) => task.status !== "Concluída"
      );

      const resolvedTasks = tasks.filter(
        (task) => task.status === "Concluída"
      );

      const overdueDocuments = pendingDocuments.filter((document) => {
        const days = getDaysDiff(document.dueDate);
        return days !== null && days < 0;
      });

      const overdueTasks = pendingTasks.filter((task) => {
        const days = getDaysDiff(task.dueDate);
        return days !== null && days < 0;
      });

      const todayDocuments = pendingDocuments.filter((document) => {
        const days = getDaysDiff(document.dueDate);
        return days === 0;
      });

      const todayTasks = pendingTasks.filter((task) => {
        const days = getDaysDiff(task.dueDate);
        return days === 0;
      });

      const upcomingDocuments = pendingDocuments.filter((document) => {
        const days = getDaysDiff(document.dueDate);
        return days !== null && days > 0 && days <= 7;
      });

      const upcomingTasks = pendingTasks.filter((task) => {
        const days = getDaysDiff(task.dueDate);
        return days !== null && days > 0 && days <= 7;
      });

      const overdue =
        overdueDocuments.length + overdueTasks.length;

      const todayDue =
        todayDocuments.length + todayTasks.length;

      const upcoming =
        upcomingDocuments.length + upcomingTasks.length;

      const pending =
        pendingDocuments.length + pendingTasks.length;

      const resolved =
        resolvedDocuments.length + resolvedTasks.length;

      const score =
        overdue * 5 +
        todayDue * 4 +
        upcoming * 2 +
        pending;

      const status = getCompanyStatus(
        pending,
        overdue,
        todayDue
      );

      return {
        company,
        documents,
        tasks,
        pending,
        resolved,
        overdue,
        todayDue,
        upcoming,
        score,
        status,
      };
    });
  }, [companies, companyData]);

  const sortedCompanies = [...companyPanels].sort(
    (a, b) => b.score - a.score
  );

  const filteredCompanies = sortedCompanies.filter((item) => {
    const searchLower = search.toLowerCase();

    const matchesSearch =
      item.company.name?.toLowerCase().includes(searchLower) ||
      item.company.cnpj?.toLowerCase().includes(searchLower);

    const matchesFilter =
      filter === "Todas"
        ? true
        : item.status.label === filter;

    return matchesSearch && matchesFilter;
  });

  const totalDocuments = companyPanels.reduce(
    (total, item) => total + item.documents.length,
    0
  );

  const totalPending = companyPanels.reduce(
    (total, item) => total + item.pending,
    0
  );

  const totalResolved = companyPanels.reduce(
    (total, item) => total + item.resolved,
    0
  );

  const totalOverdue = companyPanels.reduce(
    (total, item) => total + item.overdue,
    0
  );

  const criticalCompanies = companyPanels.filter(
    (item) => item.status.label === "Crítica"
  ).length;

  const chartData = [
    {
      name: "Resolvidos",
      value: totalResolved,
      color: "#10b981",
    },
    {
      name: "Pendências",
      value: totalPending,
      color: "#eab308",
    },
    {
      name: "Atrasados",
      value: totalOverdue,
      color: "#ef4444",
    },
  ];

  const mostCriticalCompany = sortedCompanies[0];

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1b1028]">
            Dashboard Executivo
          </h1>

          <p className="text-slate-600 mt-2 text-sm md:text-base">
            Empresas com maior prioridade operacional em tempo real.
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
            placeholder="Pesquisar empresa ou CNPJ..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-fuchsia-100 p-6 xl:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1b1028]">
                Ranking Operacional
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Empresas que mais precisam de atenção agora
              </p>
            </div>

            <ShieldAlert className="text-red-500" />
          </div>

          {loading ? (
            <p className="text-slate-500">
              Carregando ranking...
            </p>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-slate-500">
              Nenhuma empresa encontrada.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredCompanies.slice(0, 6).map((item, index) => {
                const health =
                  item.overdue > 0
                    ? 20
                    : item.todayDue > 0
                    ? 45
                    : item.pending > 0
                    ? 75
                    : 100;

                return (
                  <Link
                    to={`/empresas/${item.company.id}`}
                    key={item.company.id}
                    className={`block border rounded-2xl p-5 hover:-translate-y-1 transition ${
                      index === 0
                        ? "border-fuchsia-300 bg-fuchsia-50 shadow-lg"
                        : "border-purple-100 hover:bg-purple-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                            index === 0
                              ? "bg-fuchsia-600 text-white"
                              : "bg-fuchsia-100 text-fuchsia-700"
                          }`}
                        >
                          #{index + 1}
                        </div>

                        {item.company.logoURL ? (
                          <img
                            src={item.company.logoURL}
                            alt="Logo"
                            className="w-14 h-14 rounded-2xl object-cover border border-purple-100 shadow-sm"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-fuchsia-100 flex items-center justify-center">
                            <Building2 className="text-fuchsia-600" />
                          </div>
                        )}

                        <div>
                          <h3 className="font-bold text-lg text-[#1b1028]">
                            {item.company.name}
                          </h3>

                          <p className="text-xs text-slate-500">
                            Score operacional: {item.score} • Pendências:{" "}
                            {item.pending} • Atrasados: {item.overdue}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${item.status.badge}`}
                      >
                        {item.status.label}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${
                          health >= 80
                            ? "bg-emerald-500"
                            : health >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${health}%`,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {mostCriticalCompany && (
            <Link
              to={`/empresas/${mostCriticalCompany.company.id}`}
              className="block bg-[#1b1028] text-white rounded-2xl shadow-xl p-6 hover:-translate-y-1 transition"
            >
              <p className="text-fuchsia-300 text-sm font-semibold">
                Empresa em destaque
              </p>

              <div className="flex items-center gap-4 mt-4">
                {mostCriticalCompany.company.logoURL ? (
                  <img
                    src={mostCriticalCompany.company.logoURL}
                    alt="Logo"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-fuchsia-400 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center">
                    <Building2 className="text-fuchsia-300" size={34} />
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-black">
                    {mostCriticalCompany.company.name}
                  </h2>

                  <p className="text-slate-300 text-sm mt-1">
                    Maior prioridade operacional no momento.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <MiniCard title="Pend." value={mostCriticalCompany.pending} />
                <MiniCard title="Atras." value={mostCriticalCompany.overdue} />
                <MiniCard title="Score" value={mostCriticalCompany.score} />
              </div>
            </Link>
          )}

          <Link
            to="/documentos"
            className="bg-white rounded-2xl shadow border border-purple-100 p-6 hover:shadow-xl hover:-translate-y-1 transition block"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1b1028]">
                  Saúde Operacional
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Clique para abrir documentos
                </p>
              </div>

              <TrendingUp className="text-fuchsia-600" />
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-8">
        <Card
          to="/empresas"
          icon={<Building2 />}
          title="Empresas"
          value={companies.length}
        />

        <Card
          to="/documentos"
          icon={<FileText />}
          title="Documentos"
          value={totalDocuments}
        />

        <Card
          to="/documentos"
          icon={<CheckCircle2 />}
          title="Resolvidos"
          value={totalResolved}
          color="emerald"
        />

        <Card
          to="/tarefas"
          icon={<Clock3 />}
          title="Pendências"
          value={totalPending}
          color="yellow"
        />

        <Card
          to="/tarefas"
          icon={<ShieldAlert />}
          title="Atrasados"
          value={totalOverdue}
          color="red"
        />

        <Card
          to="/empresas"
          icon={<TrendingUp />}
          title="Críticas"
          value={criticalCompanies}
          color="orange"
        />
      </div>
    </AppLayout>
  );
}

function Card({
  icon,
  title,
  value,
  color = "fuchsia",
  to = "#",
}) {
  const colors = {
    fuchsia: "text-fuchsia-600",
    emerald: "text-emerald-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    orange: "text-orange-600",
  };

  return (
    <Link
      to={to}
      className="bg-white p-4 md:p-5 rounded-2xl shadow border border-purple-100 hover:shadow-xl hover:-translate-y-1 hover:border-fuchsia-300 transition block cursor-pointer"
    >
      <div className={`${colors[color]} mb-4`}>
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <h2
        className={`text-2xl md:text-3xl font-bold mt-2 ${colors[color]}`}
      >
        {value}
      </h2>
    </Link>
  );
}

function MiniCard({ title, value }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <p className="text-xs text-slate-300">
        {title}
      </p>

      <h3 className="text-xl font-bold text-white mt-1">
        {value}
      </h3>
    </div>
  );
}

export default Dashboard;