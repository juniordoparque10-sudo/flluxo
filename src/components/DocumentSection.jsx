import { useEffect, useState } from "react";
import {
  CheckCircle,
  Edit,
  Trash2,
  X,
  Building2,
  Users,
  ClipboardList,
  Landmark,
} from "lucide-react";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

import { auth, db, storage } from "../firebase/config";
import { createNotification } from "../services/notificationService";

function DocumentSection({ companyId, highlightedItem }) {
  const storageKey = `flluxo_documents_${companyId}`;
  const migrationKey = `flluxo_documents_${companyId}_migrated`;

  const [companyName, setCompanyName] = useState("Empresa não identificada");
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [userRole, setUserRole] = useState("collaborator");

  const [form, setForm] = useState({
    name: "",
    category: "DOC - EMPRESA",
    dueDate: "",
    status: "Pendente",
  });

  const documentGroups = [
    {
      key: "DOC - EMPRESA",
      title: "Empresa",
      description: "CNPJ, contrato social, certidões, alvarás e documentos institucionais.",
      icon: Building2,
      cardClass: "from-fuchsia-600 to-purple-700",
      borderClass: "border-fuchsia-200",
      bgClass: "bg-fuchsia-50",
      textClass: "text-fuchsia-700",
      aliases: ["Contrato", "Certidão", "Documentos Comercial", "Outro"],
    },
    {
      key: "DOC - RH/DP",
      title: "RH / DP",
      description: "Folha, férias, admissão, rescisão, FGTS, INSS e documentos trabalhistas.",
      icon: Users,
      cardClass: "from-blue-600 to-indigo-700",
      borderClass: "border-blue-200",
      bgClass: "bg-blue-50",
      textClass: "text-blue-700",
      aliases: ["Documentos RH", "RH", "DP"],
    },
    {
      key: "DOC - FISCAL/TRABALHISTA",
      title: "Fiscal / Trabalhista",
      description: "Notas fiscais, guias, tributos, obrigações fiscais e documentos trabalhistas.",
      icon: Landmark,
      cardClass: "from-emerald-600 to-teal-700",
      borderClass: "border-emerald-200",
      bgClass: "bg-emerald-50",
      textClass: "text-emerald-700",
      aliases: [
        "DOC - FISCAL",
        "DOC - TRABALHISTA",
        "Fiscal",
        "Trabalhista",
        "Guia",
        "Boleto",
        "Nota fiscal",
      ],
    },
    {
      key: "DOC - OPERACIONAL",
      title: "Operacional",
      description: "Relatórios, checklists, licenças, processos e documentos operacionais.",
      icon: ClipboardList,
      cardClass: "from-orange-500 to-red-600",
      borderClass: "border-orange-200",
      bgClass: "bg-orange-50",
      textClass: "text-orange-700",
      aliases: [
        "DOC - OPERACIONAIS",
        "Documentos Operacional",
        "Operacional",
      ],
    },
  ];

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
    if (!companyId) return;

    async function loadCompany() {
      try {
        const companyRef = doc(db, "companies", companyId);
        const companySnap = await getDoc(companyRef);

        if (companySnap.exists()) {
          setCompanyName(companySnap.data().name || "Empresa não identificada");
        }
      } catch (error) {
        console.error("Erro ao carregar empresa:", error);
      }
    }

    loadCompany();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    migrateLocalDocuments();

    const documentsQuery = query(
      collection(db, "companies", companyId, "documents"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      documentsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setDocuments(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar documentos:", error);
        alert("Erro ao carregar documentos em tempo real.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const isAdmin = userRole === "admin";
  const canCreateDocument = isAdmin || permissions?.documentCreate === true;
  const canEditDocument = isAdmin || permissions?.documentEdit === true;
  const canDeleteDocument = isAdmin || permissions?.documentDelete === true;

  async function migrateLocalDocuments() {
    try {
      const migrated = localStorage.getItem(migrationKey);
      if (migrated === "true") return;

      const localDocuments = JSON.parse(localStorage.getItem(storageKey) || "[]");

      if (localDocuments.length === 0) {
        localStorage.setItem(migrationKey, "true");
        return;
      }

      for (const documentItem of localDocuments) {
        await addDoc(collection(db, "companies", companyId, "documents"), {
          name: documentItem.name || "",
          category: normalizeCategory(documentItem.category || "DOC - EMPRESA"),
          dueDate: documentItem.dueDate || "",
          status: documentItem.status || "Pendente",
          fileUrl: documentItem.fileUrl || "",
          fileName: documentItem.fileName || "",
          fileType: documentItem.fileType || "",
          createdAt: documentItem.createdAt || new Date().toISOString(),
          migratedFromLocalStorage: true,
        });
      }

      localStorage.setItem(migrationKey, "true");
    } catch (error) {
      console.error("Erro ao migrar documentos:", error);
    }
  }

  function normalizeCategory(category) {
    const foundGroup = documentGroups.find(
      (group) =>
        group.key === category ||
        group.aliases.includes(category)
    );

    return foundGroup ? foundGroup.key : "DOC - EMPRESA";
  }

  function getDocumentsByGroup(group) {
    return documents.filter((documentItem) => {
      const normalized = normalizeCategory(documentItem.category || "");
      return normalized === group.key;
    });
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function selectCategory(category) {
    setForm((currentForm) => ({
      ...currentForm,
      category,
    }));

    document.getElementById("document-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function handleFileChange(e) {
    const file = e.target.files[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Envie apenas PDF, PNG ou JPG.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("O arquivo deve ter no máximo 10MB.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function resetForm() {
    setForm({
      name: "",
      category: "DOC - EMPRESA",
      dueDate: "",
      status: "Pendente",
    });

    setSelectedFile(null);
    setEditingDocumentId(null);

    const fileInput = document.getElementById("document-file-input");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function handleEdit(documentItem) {
    if (!canEditDocument) {
      alert("Você não possui permissão para editar documentos.");
      return;
    }

    setEditingDocumentId(documentItem.id);

    setForm({
      name: documentItem.name || "",
      category: normalizeCategory(documentItem.category || "DOC - EMPRESA"),
      dueDate: documentItem.dueDate || "",
      status: documentItem.status || "Pendente",
    });

    setSelectedFile(null);

    const fileInput = document.getElementById("document-file-input");

    if (fileInput) {
      fileInput.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (editingDocumentId && !canEditDocument) {
      alert("Você não possui permissão para editar documentos.");
      return;
    }

    if (!editingDocumentId && !canCreateDocument) {
      alert("Você não possui permissão para cadastrar documentos.");
      return;
    }

    if (!form.name.trim()) {
      alert("Informe o nome do documento");
      return;
    }

    try {
      setUploading(true);

      let fileUrl = "";
      let fileName = "";
      let fileType = "";

      if (selectedFile) {
        const safeFileName = selectedFile.name.replace(/\s+/g, "_");
        const filePath = `companies/${companyId}/documents/${Date.now()}_${safeFileName}`;
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, selectedFile);

        fileUrl = await getDownloadURL(fileRef);
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      if (editingDocumentId) {
        const documentRef = doc(
          db,
          "companies",
          companyId,
          "documents",
          editingDocumentId
        );

        const updateData = {
          ...form,
          category: normalizeCategory(form.category),
          updatedAt: serverTimestamp(),
        };

        if (selectedFile) {
          updateData.fileUrl = fileUrl;
          updateData.fileName = fileName;
          updateData.fileType = fileType;
        }

        await updateDoc(documentRef, updateData);

        await createNotification({
          title: "Documento atualizado",
          message: `${form.name} foi atualizado em ${companyName}.`,
          type: "document-status",
          companyId,
          documentId: editingDocumentId,
          targetUrl: `/empresas/${companyId}#document-${editingDocumentId}`,
          excludeUserId: auth.currentUser?.uid || "",
        });

        resetForm();
        alert("Documento atualizado com sucesso!");
        return;
      }

      const documentRef = await addDoc(
        collection(db, "companies", companyId, "documents"),
        {
          ...form,
          category: normalizeCategory(form.category),
          fileUrl,
          fileName,
          fileType,
          createdAt: serverTimestamp(),
        }
      );

      await createNotification({
        title: "Novo documento cadastrado",
        message: `${form.name} foi adicionado em ${companyName}.`,
        type: "document",
        companyId,
        documentId: documentRef.id,
        targetUrl: `/empresas/${companyId}#document-${documentRef.id}`,
        excludeUserId: auth.currentUser?.uid || "",
      });

      resetForm();
      alert("Documento cadastrado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o documento. Verifique o Firebase Storage.");
    } finally {
      setUploading(false);
    }
  }

  async function toggleDocumentStatus(documentId) {
    if (!canEditDocument) {
      alert("Você não possui permissão para alterar status dos documentos.");
      return;
    }

    const documentFound = documents.find(
      (documentItem) => documentItem.id === documentId
    );

    if (!documentFound) return;

    const newStatus =
      documentFound.status === "Pago" ? "Pendente" : "Pago";

    try {
      const documentRef = doc(
        db,
        "companies",
        companyId,
        "documents",
        documentId
      );

      await updateDoc(documentRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      await createNotification({
        title:
          newStatus === "Pago"
            ? "Documento resolvido"
            : "Documento reaberto",
        message: `${documentFound.name} em ${companyName} foi marcado como ${newStatus}.`,
        type: "document-status",
        companyId,
        documentId,
        targetUrl: `/empresas/${companyId}#document-${documentId}`,
        excludeUserId: auth.currentUser?.uid || "",
      });
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
      alert("Erro ao atualizar documento.");
    }
  }

  async function deleteDocument(documentItem) {
    if (!canDeleteDocument) {
      alert("Você não possui permissão para apagar documentos.");
      return;
    }

    const confirmDelete = window.confirm(
      `Deseja apagar o documento "${documentItem.name}"?`
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(
        doc(db, "companies", companyId, "documents", documentItem.id)
      );

      if (editingDocumentId === documentItem.id) {
        resetForm();
      }

      await createNotification({
        title: "Documento apagado",
        message: `${documentItem.name} foi apagado em ${companyName}.`,
        type: "document-status",
        companyId,
        documentId: documentItem.id,
        targetUrl: `/empresas/${companyId}`,
        excludeUserId: auth.currentUser?.uid || "",
      });

      alert("Documento apagado com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar documento:", error);
      alert("Erro ao apagar documento.");
    }
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

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8 border border-purple-100">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1b1028]">
            Documentos
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Organize os documentos da empresa por área.
          </p>
        </div>

        {editingDocumentId && (
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

      {(canCreateDocument || editingDocumentId) ? (
        <form
          id="document-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8"
        >
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Nome do documento
            </label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Ex: Contrato social"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Categoria
            </label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option>DOC - EMPRESA</option>
              <option>DOC - RH/DP</option>
              <option>DOC - FISCAL/TRABALHISTA</option>
              <option>DOC - OPERACIONAL</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Vencimento
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
              Status
            </label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option>Pendente</option>
              <option>Pago</option>
              <option>Vencido</option>
              <option>Arquivado</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Arquivo do documento
            </label>

            <input
              id="document-file-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
              className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            />

            {editingDocumentId && (
              <p className="text-xs text-slate-500 mt-2">
                Se não escolher um novo arquivo, o arquivo atual será mantido.
              </p>
            )}
          </div>

          <div className="md:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={uploading}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md disabled:opacity-50"
            >
              {uploading
                ? "Salvando..."
                : editingDocumentId
                ? "Salvar Alterações"
                : "Salvar Documento"}
            </button>

            {editingDocumentId && (
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
            Você pode visualizar os documentos, mas não possui permissão para cadastrar novos documentos.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
          <p className="text-slate-500">
            Carregando documentos em tempo real...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 items-start">
          {documentGroups.map((group) => {
            const Icon = group.icon;
            const groupDocuments = getDocumentsByGroup(group);

            return (
              <div
                key={group.key}
                className={`rounded-3xl border ${group.borderClass} overflow-hidden shadow-sm bg-white h-full`}
              >
                <div
                  className={`bg-gradient-to-br ${group.cardClass} p-5 text-white min-h-[268px] flex flex-col`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                        Categoria de documentos
                      </p>

                      <h3 className="mt-2 text-lg font-bold uppercase leading-6 min-h-12 break-words">
                        {group.title}
                      </h3>

                      <p className="text-white/75 text-xs font-medium mt-1">
                        {groupDocuments.length} documento(s)
                      </p>
                    </div>

                    <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 border border-white/10 flex items-center justify-center">
                      <Icon size={20} strokeWidth={2} />
                    </div>
                  </div>

                  <p className="text-white/80 text-sm mt-4 leading-5 flex-1">
                    {group.description}
                  </p>

                  {canCreateDocument && !editingDocumentId && (
                    <button
                      type="button"
                      onClick={() => selectCategory(group.key)}
                      className="mt-5 w-full min-h-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2.5 text-sm font-semibold leading-5 transition"
                    >
                      Cadastrar nesta categoria
                    </button>
                  )}
                </div>

                <div className={`${group.bgClass} p-4 min-h-[280px]`}>
                  {groupDocuments.length === 0 ? (
                    <div className="bg-white/80 border border-dashed border-slate-200 rounded-2xl p-5 text-center">
                      <p className="text-sm text-slate-500">
                        Os documentos cadastrados nesta categoria aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupDocuments.map((documentItem) => (
                        <div
                          id={`document-${documentItem.id}`}
                          key={documentItem.id}
                          className={`bg-white border rounded-2xl p-4 transition-all duration-500 scroll-mt-32 ${
                            highlightedItem === documentItem.id
                              ? "border-fuchsia-600 bg-fuchsia-100 shadow-[0_0_30px_rgba(192,38,211,0.45)] scale-[1.01]"
                              : editingDocumentId === documentItem.id
                              ? "border-fuchsia-300"
                              : "border-white hover:border-purple-200 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                {documentItem.status === "Pago" && (
                                  <CheckCircle
                                    size={18}
                                    className="text-emerald-600"
                                  />
                                )}

                                <h4
                                  className={`font-bold ${
                                    documentItem.status === "Pago"
                                      ? "text-emerald-700"
                                      : "text-[#1b1028]"
                                  }`}
                                >
                                  {documentItem.name}
                                </h4>
                              </div>

                              <p className="text-slate-600 text-xs mt-2">
                                Vencimento: {documentItem.dueDate || "Sem vencimento"}
                              </p>

                              <p className="text-slate-600 text-xs">
                                Arquivo: {documentItem.fileName || "Nenhum arquivo"}
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                documentItem.status
                              )}`}
                            >
                              {documentItem.status === "Pago"
                                ? "Resolvido"
                                : documentItem.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-4">
                            {documentItem.fileUrl && (
                              <a
                                href={documentItem.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
                              >
                                Abrir
                              </a>
                            )}

                            {canEditDocument && (
                              <button
                                type="button"
                                onClick={() => toggleDocumentStatus(documentItem.id)}
                                className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
                              >
                                {documentItem.status === "Pago" ? "Reabrir" : "Resolver"}
                              </button>
                            )}

                            {canEditDocument && (
                              <button
                                type="button"
                                onClick={() => handleEdit(documentItem)}
                                className="flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-2 rounded-lg text-xs font-medium transition"
                              >
                                <Edit size={14} />
                                Editar
                              </button>
                            )}

                            {canDeleteDocument && (
                              <button
                                type="button"
                                onClick={() => deleteDocument(documentItem)}
                                className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium transition"
                              >
                                <Trash2 size={14} />
                                Apagar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DocumentSection;
