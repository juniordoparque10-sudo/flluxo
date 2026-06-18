import { useEffect, useState } from "react";

import {
  CalendarClock,
  Edit,
  ExternalLink,
  Trash2,
  X,
} from "lucide-react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import AppLayout from "../layouts/AppLayout";
import { auth, db } from "../firebase/config";
import { createNotification } from "../services/notificationService";

function Agenda() {
  const migrationKey = "flluxo_agenda_migrated";

  const [companies, setCompanies] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingEventId, setEditingEventId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    type: "Reunião",
    companyId: "",
    responsible: "",
    date: "",
    time: "",
    description: "",
    status: "Agendado",
  });

  useEffect(() => {
    const companiesQuery = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(companiesQuery, (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setCompanies(list);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersQuery = query(
      collection(db, "users"),
      orderBy("email", "asc")
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setCollaborators(list);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    migrateLocalAgenda();

    const eventsQuery = query(
      collection(db, "agendaEvents"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setEvents(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar agenda:", error);
        alert("Erro ao carregar agenda em tempo real.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function migrateLocalAgenda() {
    try {
      const migrated = localStorage.getItem(migrationKey);

      if (migrated === "true") return;

      const localEvents = JSON.parse(
        localStorage.getItem("flluxo_agenda_events") || "[]"
      );

      if (localEvents.length === 0) {
        localStorage.setItem(migrationKey, "true");
        return;
      }

      for (const event of localEvents) {
        await addDoc(collection(db, "agendaEvents"), {
          title: event.title || "",
          type: event.type || "Reunião",
          companyId: event.companyId || "",
          companyName: event.companyName || "",
          responsible: event.responsible || "",
          date: event.date || "",
          time: event.time || "",
          description: event.description || "",
          status: event.status || "Agendado",
          notified: event.notified || false,
          createdAt: event.createdAt || new Date().toISOString(),
          migratedFromLocalStorage: true,
        });
      }

      localStorage.setItem(migrationKey, "true");

      console.log("Agenda migrada com sucesso!");
    } catch (error) {
      console.error("Erro ao migrar agenda:", error);
    }
  }

  async function notifyAgenda({
    title,
    message,
    eventId,
    companyId,
    type = "agenda",
  }) {
    try {
      await createNotification({
        title,
        message,
        type,
        companyId: companyId || "",
        agendaEventId: eventId || "",
        targetUrl: "/agenda",
      });
    } catch (error) {
      console.error("Erro ao criar notificação da agenda:", error);
    }
  }

  function handleGoogleFutureClick() {
    alert(
      "Integração com Google Agenda será configurada futuramente usando a conta Google do cliente."
    );
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function resetForm() {
    setForm({
      title: "",
      type: "Reunião",
      companyId: "",
      responsible: "",
      date: "",
      time: "",
      description: "",
      status: "Agendado",
    });

    setEditingEventId(null);
  }

  function getCompanyName(companyId) {
    const selectedCompany = companies.find(
      (company) => String(company.id) === String(companyId)
    );

    return selectedCompany ? selectedCompany.name : "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Informe o título do compromisso");
      return;
    }

    if (!form.date) {
      alert("Informe a data do compromisso");
      return;
    }

    try {
      setSaving(true);

      const companyName = getCompanyName(form.companyId);

      if (editingEventId) {
        const eventRef = doc(db, "agendaEvents", editingEventId);
        const currentEvent = events.find((event) => event.id === editingEventId);

        await updateDoc(eventRef, {
          ...form,
          companyName,
          createdByUserId:
            currentEvent?.createdByUserId || auth.currentUser?.uid || "",
          createdByEmail:
            currentEvent?.createdByEmail || auth.currentUser?.email || "",
          notified: false,
          notifiedAt: null,
          updatedAt: serverTimestamp(),
        });

        await notifyAgenda({
          title: "Compromisso atualizado",
          message: `${form.title} foi atualizado na agenda.`,
          eventId: editingEventId,
          companyId: form.companyId,
          type: "agenda-update",
        });

        resetForm();
        alert("Compromisso atualizado com sucesso!");
        return;
      }

      const eventRef = await addDoc(collection(db, "agendaEvents"), {
        ...form,
        companyName,
        createdByUserId: auth.currentUser?.uid || "",
        createdByEmail: auth.currentUser?.email || "",
        notified: false,
        notifiedAt: null,
        createdAt: serverTimestamp(),
      });

      await notifyAgenda({
        title: "Novo compromisso agendado",
        message: `${form.title} foi agendado para ${form.date}${
          form.time ? ` às ${form.time}` : ""
        }.`,
        eventId: eventRef.id,
        companyId: form.companyId,
        type: "agenda-create",
      });

      resetForm();
      alert("Compromisso cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar compromisso:", error);
      alert("Erro ao salvar compromisso no Firebase.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(event) {
    setEditingEventId(event.id);

    setForm({
      title: event.title || "",
      type: event.type || "Reunião",
      companyId: event.companyId || "",
      responsible: event.responsible || "",
      date: event.date || "",
      time: event.time || "",
      description: event.description || "",
      status: event.status || "Agendado",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteEvent(event) {
    const confirmDelete = window.confirm(
      `Deseja apagar o compromisso "${event.title}"?`
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "agendaEvents", event.id));

      if (editingEventId === event.id) {
        resetForm();
      }

      await notifyAgenda({
        title: "Compromisso apagado",
        message: `${event.title} foi removido da agenda.`,
        eventId: event.id,
        companyId: event.companyId,
        type: "agenda-delete",
      });

      alert("Compromisso apagado com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar compromisso:", error);
      alert("Erro ao apagar compromisso.");
    }
  }

  async function toggleEventStatus(eventId) {
    const eventFound = events.find((event) => event.id === eventId);

    if (!eventFound) return;

    const newStatus =
      eventFound.status === "Concluído" ? "Agendado" : "Concluído";

    try {
      await updateDoc(doc(db, "agendaEvents", eventId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      await notifyAgenda({
        title:
          newStatus === "Concluído"
            ? "Compromisso concluído"
            : "Compromisso reaberto",
        message: `${eventFound.title} foi marcado como ${newStatus}.`,
        eventId,
        companyId: eventFound.companyId,
        type: "agenda-status",
      });
    } catch (error) {
      console.error("Erro ao atualizar compromisso:", error);
      alert("Erro ao atualizar compromisso.");
    }
  }

  function getStatusColor(status) {
    return status === "Concluído"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-fuchsia-100 text-fuchsia-700";
  }

  return (
    <AppLayout>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1028]">
            Agenda Compartilhada
          </h1>

          <p className="text-slate-600 mt-2">
            Crie compromissos, reuniões e prazos em tempo real.
          </p>
        </div>

        <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-fuchsia-100 text-fuchsia-700 p-3 rounded-xl">
            <CalendarClock size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#1b1028]">
                Google Agenda
              </p>

              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                Em breve
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Será ativado futuramente com a conta Google do cliente.
            </p>
          </div>

          <button
            type="button"
            disabled
            onClick={handleGoogleFutureClick}
            className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2"
            title="Integração futura com a conta Google do cliente"
          >
            <ExternalLink size={16} />
            Conectar Google Agenda
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mb-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-[#1b1028]">
            {editingEventId ? "Editar Compromisso" : "Novo Compromisso"}
          </h2>

          {editingEventId && (
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
            placeholder="Título do compromisso"
          />

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Reunião</option>
            <option>Prazo</option>
            <option>Pagamento</option>
            <option>Entrega</option>
            <option>Retorno</option>
            <option>Outro</option>
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

          <select
            name="responsible"
            value={form.responsible}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="">Responsável</option>
            <option>Administrador</option>
            {collaborators.map((person) => (
              <option key={person.id}>
                {person.name || person.email}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />

          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Agendado</option>
            <option>Concluído</option>
          </select>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="md:col-span-4 border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 min-h-24"
            placeholder="Descrição ou observações"
          />

          <div className="md:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : editingEventId
                ? "Salvar Alterações"
                : "Salvar Compromisso"}
            </button>

            {editingEventId && (
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
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100">
        <h2 className="text-xl font-bold text-[#1b1028] mb-5">
          Compromissos cadastrados
        </h2>

        {loading ? (
          <p className="text-slate-500">
            Carregando agenda em tempo real...
          </p>
        ) : events.length === 0 ? (
          <p className="text-slate-500">
            Nenhum compromisso cadastrado.
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="border border-purple-100 rounded-xl p-5 hover:bg-purple-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#1b1028]">
                      {event.title}
                    </h3>

                    <p className="text-slate-600 text-sm mt-1">
                      {event.type} • {event.date}{" "}
                      {event.time && `às ${event.time}`}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Empresa: {event.companyName || "Não vinculada"}
                    </p>

                    <p className="text-slate-600 text-sm">
                      Responsável: {event.responsible || "Não informado"}
                    </p>

                    {event.description && (
                      <p className="text-slate-500 text-sm mt-2">
                        {event.description}
                      </p>
                    )}

                    {event.notified && (
                      <p className="text-xs text-emerald-600 font-semibold mt-2">
                        Lembrete enviado
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                        event.status
                      )}`}
                    >
                      {event.status}
                    </span>

                    <button
                      type="button"
                      disabled
                      className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2"
                      title="Integração futura com Google Agenda"
                    >
                      <ExternalLink size={16} />
                      Google Agenda
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleEventStatus(event.id)}
                      className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      {event.status === "Concluído"
                        ? "Reabrir"
                        : "Concluir"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(event)}
                      className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      <Edit size={16} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteEvent(event)}
                      className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      <Trash2 size={16} />
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Agenda;
