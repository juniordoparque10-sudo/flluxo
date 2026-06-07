import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import {
  CheckCircle,
  FileText,
  Search,
  ShieldAlert,
  Clock3,
  FolderArchive,
  Building2,
} from "lucide-react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

function Documents() {
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");

  const [companies, setCompanies] = useState([]);
  const [companyDocuments, setCompanyDocuments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companiesQuery = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc")
    );

    const documentUnsubscribes = [];

    const unsubscribeCompanies = onSnapshot(
      companiesQuery,
      (snapshot) => {
        const companyList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setCompanies(companyList);
        setLoading(false);

        documentUnsubscribes.forEach((unsubscribe) => unsubscribe());
        documentUnsubscribes.length = 0;

        companyList.forEach((company) => {
          const documentsQuery = query(
            collection(db, "companies", company.id, "documents"),
            orderBy("createdAt", "desc")
          );

          const unsubscribeDocuments = onSnapshot(
            documentsQuery,
            (documentSnapshot) => {
              const documents = documentSnapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
                companyId: company.id,
                companyName: company.name,
              }));

              setCompanyDocuments((prev) => ({
                ...prev,
                [company.id]: documents,
              }));
            }
          );

          documentUnsubscribes.push(unsubscribeDocuments);
        });
      },
      (error) => {
        console.error("Erro ao carregar documentos:", error);
        alert("Erro ao carregar documentos em tempo real.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeCompanies();

      documentUnsubscribes.forEach((unsubscribe) =>
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

  function getDeadlineLabel(document) {
    if (document.status === "Pago") return "Resolvido";

    if (document.status === "Arquivado") {
      return "Arquivado";
    }

    const days = getDaysDiff(document.dueDate);

    if (days === null) return "Sem vencimento";

    if (days < 0) {
      return `Vencido há ${Math.abs(days)} dia(s)`;
    }

    if (days === 0) return "Vence hoje";

    if (days <= 7) {
      return `Vence em ${days} dia(s)`;
    }

    return `Vence em ${days} dia(s)`;
  }

  function getDeadlineColor(document) {
    if (document.status === "Pago") {
      return "border-emerald-100 bg-emerald-50";
    }

    if (document.status === "Arquivado") {
      return "border-slate-200 bg-slate-50";
    }

    const days = getDaysDiff(document.dueDate);

    if (days === null) {
      return "border-purple-100 bg-white";
    }

    if (days < 0) {
      return "border-red-200 bg-red-50";
    }

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

  function getStatusColor(status) {
    switch (status) {
      case "Pago":
        return "bg-emerald-100 text-emerald-700";

      case "Vencido":
        return "bg-red-100 text-red-700";

      case "Arquivado":
        return "bg-slate-200 text-slate-700";

      default:
        return "bg-fuchsia-100 text-fuchsia-700";
    }
  }

  const allDocuments = useMemo(() => {
    return companies.flatMap((company) => {
      return companyDocuments[company.id] || [];
    });
  }, [companies, companyDocuments]);

  const pendingDocuments = allDocuments.filter(
    (document) =>
      document.status !== "Pago" &&
      document.status !== "Arquivado"
  );

  const resolvedDocuments = allDocuments.filter(
    (document) => document.status === "Pago"
  );

  const archivedDocuments = allDocuments.filter(
    (document) => document.status === "Arquivado"
  );

  const overdueDocuments = pendingDocuments.filter(
    (document) => {
      const days = getDaysDiff(document.dueDate);

      return days !== null && days < 0;
    }
  );

  const todayDocuments = pendingDocuments.filter(
    (document) => {
      const days = getDaysDiff(document.dueDate);

      return days === 0;
    }
  );

  const withFileDocuments = allDocuments.filter(
    (document) => document.fileUrl
  );

  const sortedDocuments = [...allDocuments].sort(
    (a, b) => {
      const aDays = getDaysDiff(a.dueDate);
      const bDays = getDaysDiff(b.dueDate);

      if (
        a.status === "Arquivado" &&
        b.status !== "Arquivado"
      )
        return 1;

      if (
        a.status !== "Arquivado" &&
        b.status === "Arquivado"
      )
        return -1;

      if (a.status === "Pago" && b.status !== "Pago")
        return 1;

      if (a.status !== "Pago" && b.status === "Pago")
        return -1;

      if (aDays === null) return 1;
      if (bDays === null) return -1;

      return aDays - bDays;
    }
  );

  const filteredDocuments = sortedDocuments.filter(
    (document) => {
      const searchLower = search.toLowerCase();

      const matchesSearch =
        document.name
          ?.toLowerCase()
          .includes(searchLower) ||
        document.companyName
          ?.toLowerCase()
          .includes(searchLower) ||
        document.category
          ?.toLowerCase()
          .includes(searchLower);

      if (!matchesSearch) return false;

      if (filter === "Todos") return true;

      if (filter === "Pendentes") {
        return (
          document.status !== "Pago" &&
          document.status !== "Arquivado"
        );
      }

      if (filter === "Resolvidos") {
        return document.status === "Pago";
      }

      if (filter === "Arquivados") {
        return document.status === "Arquivado";
      }

      if (filter === "Vencidos") {
        const days = getDaysDiff(document.dueDate);

        return (
          document.status !== "Pago" &&
          document.status !== "Arquivado" &&
          days !== null &&
          days < 0
        );
      }

      if (filter === "Vencem hoje") {
        const days = getDaysDiff(document.dueDate);

        return (
          document.status !== "Pago" &&
          document.status !== "Arquivado" &&
          days === 0
        );
      }

      return true;
    }
  );

  const filterOptions = [
    "Todos",
    "Pendentes",
    "Resolvidos",
    "Arquivados",
    "Vencidos",
    "Vencem hoje",
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
            Central de Documentos
          </h1>

          <p className="text-slate-600 mt-2">
            Gestão documental inteligente em tempo real.
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
            placeholder="Pesquisar documento, empresa ou categoria..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 mt-8">
        <Card
          icon={<FileText />}
          title="Total"
          value={allDocuments.length}
        />

        <Card
          icon={<Building2 />}
          title="Com arquivo"
          value={withFileDocuments.length}
          color="fuchsia"
        />

        <Card
          icon={<Clock3 />}
          title="Pendentes"
          value={pendingDocuments.length}
          color="yellow"
        />

        <Card
          icon={<ShieldAlert />}
          title="Vencidos"
          value={overdueDocuments.length}
          color="red"
        />

        <Card
          icon={<Clock3 />}
          title="Hoje"
          value={todayDocuments.length}
          color="orange"
        />

        <Card
          icon={<FolderArchive />}
          title="Arquivados"
          value={archivedDocuments.length}
          color="slate"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mt-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1b1028]">
              Lista geral de documentos
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Filtros inteligentes e ordenação automática.
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
            Carregando documentos...
          </p>
        ) : filteredDocuments.length === 0 ? (
          <p className="text-slate-500">
            Nenhum documento encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((document) => (
              <div
                key={`${document.companyId}-${document.id}`}
                className={`border rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 ${getDeadlineColor(
                  document
                )}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {document.status === "Pago" && (
                      <CheckCircle
                        size={20}
                        className="text-emerald-600"
                      />
                    )}

                    <h3
                      className={`font-bold text-lg ${
                        document.status === "Pago"
                          ? "text-emerald-700"
                          : "text-[#1b1028]"
                      }`}
                    >
                      {document.name}
                    </h3>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-slate-600 text-sm">
                      Empresa: {document.companyName}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Categoria: {document.category}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Vencimento:{" "}
                      {document.dueDate ||
                        "Sem vencimento"}{" "}
                      • {getDeadlineLabel(document)}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Arquivo:{" "}
                      {document.fileName ||
                        "Nenhum arquivo anexado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {document.fileUrl && (
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Abrir arquivo
                    </a>
                  )}

                  <Link
                    to={`/empresas/${document.companyId}#document-${document.id}`}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Ir para documento
                  </Link>

                  <Link
                    to={`/empresas/${document.companyId}`}
                    className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Abrir empresa
                  </Link>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                      document.status
                    )}`}
                  >
                    {document.status === "Pago"
                      ? "Resolvido"
                      : document.status}
                  </span>
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
    slate: "text-slate-600",
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

export default Documents;