import { useState } from "react";

import { X, Save } from "lucide-react";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { createNotification } from "../../services/notificationService";

function CreateTaskModal({
  open,
  onClose,
  companies,
}) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    companyId: "",
    title: "",
    responsible: "",
    dueDate: "",
    priority: "Média",
    status: "Pendente",
  });

  if (!open) return null;

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function resetForm() {
    setForm({
      companyId: "",
      title: "",
      responsible: "",
      dueDate: "",
      priority: "Média",
      status: "Pendente",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.companyId) {
      alert("Escolha a empresa da tarefa.");
      return;
    }

    if (!form.title.trim()) {
      alert("Informe o título da tarefa.");
      return;
    }

    const company = companies.find(
      (item) => item.id === form.companyId
    );

    if (!company) {
      alert("Empresa não encontrada.");
      return;
    }

    try {
      setSaving(true);

      const taskRef = await addDoc(
        collection(
          db,
          "companies",
          form.companyId,
          "tasks"
        ),
        {
          title: form.title,
          responsible: form.responsible,
          dueDate: form.dueDate,
          priority: form.priority,
          status: form.status,

          followers: auth.currentUser?.uid
            ? [auth.currentUser.uid]
            : [],

          createdByUserId: auth.currentUser?.uid || "",
          createdByEmail: auth.currentUser?.email || "",

          history: [
            {
              description: "criou esta tarefa pela Central de Tarefas",
              userId: auth.currentUser?.uid || "",
              userEmail: auth.currentUser?.email || "Sistema",
              createdAt: new Date().toISOString(),
            },
          ],

          createdAt: serverTimestamp(),
        }
      );

      await createNotification({
        title: "Nova tarefa criada",
        message: `${form.title} foi criada em ${company.name}.`,
        type: "task",
        companyId: form.companyId,
        taskId: taskRef.id,
        targetUrl: `/empresas/${form.companyId}#task-${taskRef.id}`,
        excludeUserId: auth.currentUser?.uid || "",
      });

      resetForm();
      onClose();

      alert("Tarefa criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      alert("Erro ao criar tarefa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-purple-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1b1028]">
              Criar Nova Tarefa
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Escolha a empresa e defina os dados da tarefa.
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

        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          <div className="md:col-span-2">
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Empresa
            </label>

            <select
              name="companyId"
              value={form.companyId}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option value="">Selecione a empresa</option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Título da tarefa
            </label>

            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Ex: Enviar documentação"
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
              placeholder="Nome do responsável"
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
              <option>Revisão</option>
              <option>Concluída</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Salvando..." : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;