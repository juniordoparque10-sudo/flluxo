import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  BellRing,
  CheckCircle2,
  Clock3,
  Search,
  ShieldAlert,
} from "lucide-react";

import { auth, db } from "../firebase/config";
import AppLayout from "../layouts/AppLayout";
import { createNotification } from "../services/notificationService";

function QuickRegister() {
  const migrationKey = "flluxo_quick_records_migrated";

  const [companies, setCompanies] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "Aviso",
    priority: "Normal",
    from: "",
    to: "",
    companyId: "",
    relatedTo: "",
    status: "Novo",
  });

  useEffect(() => {
    migrateLocalRecords();
    loadCompanies();
    loadCollaborators();

    const recordsQuery = query(
      collection(db, "quickRecords"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      recordsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setRecords(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar registros:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function loadCompanies() {
    return onSnapshot(collection(db, "companies"), (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setCompanies(list);
    });
  }

  async function loadCollaborators() {
    return onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setCollaborators(list);
    });
  }

  async function migrateLocalRecords() {
    try {
      const migrated = localStorage.getItem(migrationKey);

      if (migrated === "true") return;

      const localRecords = JSON.parse(
        localStorage.getItem("flluxo_quick_records") || "[]"
      );

      if (localRecords.length === 0) {
        localStorage.setItem(migrationKey, "true");
        return;
      }

      for (const record of localRecords) {
        await addDoc(collection(db, "quickRecords"), {
          title: record.title || "",
          message: record.message || "",
          type: record.type || "Aviso",
          priority: record.priority || "Normal",
          from: record.from || "",
          to: record.to || "",
          companyId: record.companyId || "",
          companyName: record.companyName || "",
          relatedTo: record.relatedTo || "",
          status: record.status || "Novo",
          targetUserId: record.targetUserId || "",
          targetUserEmail: record.targetUserEmail || "",
          createdAt: record.createdAt || new Date().toISOString(),
          migratedFromLocalStorage: true,
        });
      }

      localStorage.setItem(migrationKey, "true");
    } catch (error) {
      console.error("Erro ao migrar registros:", error);
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Informe o título do registro");
      return;
    }

    if (!form.message.trim()) {
      alert("Informe a mensagem do registro");
      return;
    }

    try {
      const selectedCompany = companies.find(
        (company) => String(company.id) === String(form.companyId)
      );

      const companyName = selectedCompany ? selectedCompany.name : "";
      const currentUser = auth.currentUser;

      let targetUserId = "";
      let targetUserEmail = "";

      if (form.to && form.to !== "Todos") {
        const selectedCollaborator = collaborators.find(
          (person) => person.id === form.to
        );

        if (selectedCollaborator) {
          targetUserId = selectedCollaborator.id;
          targetUserEmail = selectedCollaborator.email || "";
        }
      }

      await addDoc(collection(db, "quickRecords"), {
        ...form,
        companyName,
        targetUserId,
        targetUserEmail,
        createdByUserId: currentUser?.uid || "",
        createdAt: serverTimestamp(),
      });

      await createNotification({
        title: "Novo registro rápido",
        message: `${form.title} foi criado${
          companyName ? ` para ${companyName}` : ""
        }. Prioridade: ${form.priority}.`,
        type: "quick-register",
        targetUrl: "/registro-rapido",
        targetUserId,
        targetUserEmail,
        excludeUserId: currentUser?.uid || "",
      });

      setForm({
        title: "",
        message: "",
        type: "Aviso",
        priority: "Normal",
        from: "",
        to: "",
        companyId: "",
        relatedTo: "",
        status: "Novo",
      });

      alert("Registro criado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
      alert("Erro ao salvar registro.");
    }
  }

  async function markAsRead(recordId) {
    try {
      const recordRef = doc(db, "quickRecords", recordId);

      await updateDoc(recordRef, {
        status: "Lido",
      });
    } catch (error) {
      console.error("Erro ao atualizar registro:", error);
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-700 border-red-200";

      case "Urgente":
        return "bg-orange-100 text-orange-700 border-orange-200";

      default:
        return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200";
    }
  }

  function getPersonLabel(personIdOrText) {
    if (!personIdOrText) return "Não informado";

    if (personIdOrText === "Todos") return "Todos";

    const person = collaborators.find(
      (item) => item.id === personIdOrText
    );

    return person?.name || person?.email || personIdOrText;
  }

  const filteredRecords = records.filter((record) => {
    const searchLower = search.toLowerCase();

    const matchesSearch =
      record.title?.toLowerCase().includes(searchLower) ||
      record.message?.toLowerCase().includes(searchLower) ||
      record.companyName?.toLowerCase().includes(searchLower);

    const matchesFilter =
      filter === "Todos"
        ? true
        : filter === "Novos"
        ? record.status === "Novo"
        : filter === "Lidos"
        ? record.status === "Lido"
        : filter === "Urgentes"
        ? record.priority === "Urgente"
        : true;

    return matchesSearch && matchesFilter;
  });

  return (
    <AppLayout>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1028]">
            Central Operacional
          </h1>

          <p className="text-slate-600 mt-2">
            Comunicação rápida empresarial em tempo real.
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
            placeholder="Pesquisar registros..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <DashboardCard
          icon={<BellRing />}
          title="Total"
          value={records.length}
          color="fuchsia"
        />

        <DashboardCard
          icon={<ShieldAlert />}
          title="Urgentes"
          value={records.filter((item) => item.priority === "Urgente").length}
          color="red"
        />

        <DashboardCard
          icon={<Clock3 />}
          title="Novos"
          value={records.filter((item) => item.status === "Novo").length}
          color="orange"
        />

        <DashboardCard
          icon={<CheckCircle2 />}
          title="Lidos"
          value={records.filter((item) => item.status === "Lido").length}
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mb-8">
        <h2 className="text-xl font-bold text-[#1b1028] mb-5">
          Novo Registro
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-5"
        >
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="md:col-span-2 border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="Título do registro"
          />

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Aviso</option>
            <option>Solicitação</option>
            <option>Tarefa rápida</option>
            <option>Ocorrência</option>
            <option>Lembrete</option>
          </select>

          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Normal</option>
            <option>Alta</option>
            <option>Urgente</option>
          </select>

          <select
            name="from"
            value={form.from}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="">Criado por</option>

            {collaborators.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || person.email}
              </option>
            ))}
          </select>

          <select
            name="to"
            value={form.to}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="">Notificar para</option>
            <option value="Todos">Todos</option>

            {collaborators.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || person.email}
              </option>
            ))}
          </select>

          <select
            name="companyId"
            value={form.companyId}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="">Sem empresa vinculada</option>

            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="relatedTo"
            value={form.relatedTo}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="Ligado a documento/tarefa?"
          />

          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            className="md:col-span-4 border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 min-h-28"
            placeholder="Descreva o registro..."
          />

          <div className="md:col-span-4">
            <button
              type="submit"
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md"
            >
              Criar Registro
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100">
        <div className="flex flex-wrap gap-2 mb-6">
          {["Todos", "Novos", "Lidos", "Urgentes"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                filter === option
                  ? "bg-fuchsia-600 text-white border-fuchsia-600"
                  : "bg-white border-purple-100 text-[#1b1028]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">
            Carregando registros...
          </p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-slate-500">
            Nenhum registro rápido criado.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`border rounded-xl p-5 ${
                  record.status === "Novo"
                    ? "border-fuchsia-200 bg-purple-50"
                    : "border-purple-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#1b1028]">
                      {record.title}
                    </h3>

                    <p className="text-slate-600 text-sm mt-1">
                      {record.message}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {record.type}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full border ${getPriorityColor(
                          record.priority
                        )}`}
                      >
                        {record.priority}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        De: {getPersonLabel(record.from)}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        Para: {getPersonLabel(record.to)}
                      </span>

                      {record.companyName && (
                        <span className="px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700">
                          Empresa: {record.companyName}
                        </span>
                      )}
                    </div>
                  </div>

                  {record.status === "Novo" ? (
                    <button
                      type="button"
                      onClick={() => markAsRead(record.id)}
                      className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Marcar como lido
                    </button>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm">
                      Lido
                    </span>
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

export default QuickRegister;