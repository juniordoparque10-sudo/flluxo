import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  Building2,
  CheckSquare,
  FileText,
  Search,
  User,
  BellRing,
} from "lucide-react";

import { Link } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

function GlobalSearch() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const unsubscribeCompanies = onSnapshot(
      query(collection(db, "companies"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const companyList = snapshot.docs.map((item) => ({
          id: item.id,
          type: "Empresa",
          title: item.data().name,
          subtitle: item.data().cnpj || "Sem CNPJ",
          link: `/empresas/${item.id}`,
          icon: "company",
        }));

        setCompanies(companyList);

        const childUnsubscribes = [];

        snapshot.docs.forEach((companyDoc) => {
          const companyId = companyDoc.id;
          const companyName = companyDoc.data().name || "Empresa";

          const documentsQuery = query(
            collection(db, "companies", companyId, "documents"),
            orderBy("createdAt", "desc")
          );

          const tasksQuery = query(
            collection(db, "companies", companyId, "tasks"),
            orderBy("createdAt", "asc")
          );

          const unsubscribeDocuments = onSnapshot(documentsQuery, (docSnap) => {
            setDocuments((prev) => [
              ...prev.filter((item) => item.companyId !== companyId),
              ...docSnap.docs.map((docItem) => ({
                id: docItem.id,
                companyId,
                type: "Documento",
                title: docItem.data().name,
                subtitle: `${companyName} • ${docItem.data().category || "Sem categoria"}`,
                link: `/empresas/${companyId}#document-${docItem.id}`,
                icon: "document",
              })),
            ]);
          });

          const unsubscribeTasks = onSnapshot(tasksQuery, (taskSnap) => {
            setTasks((prev) => [
              ...prev.filter((item) => item.companyId !== companyId),
              ...taskSnap.docs.map((taskItem) => ({
                id: taskItem.id,
                companyId,
                type: "Tarefa",
                title: taskItem.data().title,
                subtitle: `${companyName} • ${taskItem.data().responsible || "Sem responsável"}`,
                link: `/empresas/${companyId}#task-${taskItem.id}`,
                icon: "task",
              })),
            ]);
          });

          childUnsubscribes.push(unsubscribeDocuments);
          childUnsubscribes.push(unsubscribeTasks);
        });

        return () => {
          childUnsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      }
    );

    const unsubscribeCollaborators = onSnapshot(
      collection(db, "collaborators"),
      (snapshot) => {
        setCollaborators(
          snapshot.docs.map((item) => ({
            id: item.id,
            type: "Colaborador",
            title: item.data().name || item.data().email,
            subtitle: `${item.data().email || "Sem e-mail"} • ${item.data().sector || "Sem setor"}`,
            link: "/colaboradores",
            icon: "collaborator",
          }))
        );
      }
    );

    const unsubscribeRecords = onSnapshot(
      query(collection(db, "quickRecords"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setRecords(
          snapshot.docs.map((item) => ({
            id: item.id,
            type: "Registro",
            title: item.data().title,
            subtitle: item.data().message || "Sem mensagem",
            link: "/registro-rapido",
            icon: "record",
          }))
        );
      }
    );

    return () => {
      unsubscribeCompanies();
      unsubscribeCollaborators();
      unsubscribeRecords();
    };
  }, []);

  const results = useMemo(() => {
    const allResults = [
      ...companies,
      ...documents,
      ...tasks,
      ...collaborators,
      ...records,
    ];

    const searchLower = search.toLowerCase();

    return allResults.filter((item) => {
      const matchesSearch =
        !searchLower ||
        item.title?.toLowerCase().includes(searchLower) ||
        item.subtitle?.toLowerCase().includes(searchLower) ||
        item.type?.toLowerCase().includes(searchLower);

      const matchesFilter =
        filter === "Todos" ? true : item.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [
    search,
    filter,
    companies,
    documents,
    tasks,
    collaborators,
    records,
  ]);

  function getIcon(icon) {
    if (icon === "company") return <Building2 size={22} />;
    if (icon === "document") return <FileText size={22} />;
    if (icon === "task") return <CheckSquare size={22} />;
    if (icon === "collaborator") return <User size={22} />;
    return <BellRing size={22} />;
  }

  function getColor(type) {
    switch (type) {
      case "Empresa":
        return "bg-fuchsia-100 text-fuchsia-700";
      case "Documento":
        return "bg-blue-100 text-blue-700";
      case "Tarefa":
        return "bg-orange-100 text-orange-700";
      case "Colaborador":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  const filters = [
    "Todos",
    "Empresa",
    "Documento",
    "Tarefa",
    "Colaborador",
    "Registro",
  ];

  return (
    <AppLayout>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1028]">
            Pesquisa Global
          </h1>

          <p className="text-slate-600 mt-2">
            Encontre empresas, documentos, tarefas, colaboradores e registros.
          </p>
        </div>

        <div className="relative w-full xl:w-[520px]">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite para pesquisar no sistema..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-fuchsia-500 text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((option) => (
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
        <DashboardCard title="Empresas" value={companies.length} />
        <DashboardCard title="Documentos" value={documents.length} />
        <DashboardCard title="Tarefas" value={tasks.length} />
        <DashboardCard title="Colaboradores" value={collaborators.length} />
        <DashboardCard title="Registros" value={records.length} />
      </div>

      <div className="bg-white rounded-2xl shadow border border-purple-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1b1028]">
              Resultados encontrados
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Total: {results.length}
            </p>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
            <p className="text-slate-500">
              Nenhum resultado encontrado.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((item) => (
              <Link
                key={`${item.type}-${item.id}-${item.companyId || ""}`}
                to={item.link}
                className="flex items-center justify-between gap-4 border border-purple-100 rounded-2xl p-5 hover:bg-purple-50 hover:-translate-y-1 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getColor(item.type)}`}>
                    {getIcon(item.icon)}
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1b1028]">
                      {item.title}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${getColor(
                    item.type
                  )}`}
                >
                  {item.type}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DashboardCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-purple-100">
      <p className="text-slate-500 text-sm">
        {title}
      </p>

      <h2 className="text-3xl font-bold mt-2 text-fuchsia-600">
        {value}
      </h2>
    </div>
  );
}

export default GlobalSearch;