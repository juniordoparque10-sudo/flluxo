import { useEffect, useState } from "react";
import { CheckCircle, Edit, Trash2, X } from "lucide-react";
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

function DocumentSection({
  companyId,
  highlightedItem,
}) {
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
    category: "Contrato",
    dueDate: "",
    status: "Pendente",
  });

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

  const canCreateDocument =
    isAdmin || permissions?.documentCreate === true;

  const canEditDocument =
    isAdmin || permissions?.documentEdit === true;

  const canDeleteDocument =
    isAdmin || permissions?.documentDelete === true;

  async function migrateLocalDocuments() {
    try {
      const migrated = localStorage.getItem(migrationKey);

      if (migrated === "true") return;

      const localDocuments = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      if (localDocuments.length === 0) {
        localStorage.setItem(migrationKey, "true");
        return;
      }

      for (const documentItem of localDocuments) {
        await addDoc(collection(db, "companies", companyId, "documents"), {
          name: documentItem.name || "",
          category: documentItem.category || "Contrato",
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

      console.log("Documentos migrados com sucesso!");
    } catch (error) {
      console.error("Erro ao migrar documentos:", error);
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
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
      category: "Contrato",
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
      category: documentItem.category || "Contrato",
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
        });

        resetForm();

        alert("Documento atualizado com sucesso!");
        return;
      }

      const documentRef = await addDoc(
        collection(db, "companies", companyId, "documents"),
        {
          ...form,
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
        <h2 className="text-2xl font-bold text-[#1b1028]">
          Documentos
        </h2>

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
              <option>Contrato</option>
              <option>Boleto</option>
              <option>Nota fiscal</option>
              <option>Certidão</option>
              <option>Guia</option>
              <option>Documentos RH</option>
              <option>Documentos Operacional</option>
              <option>Documentos Comercial</option>
              <option>Outro</option>
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
      ) : documents.length === 0 ? (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
          <p className="text-slate-500">
            Nenhum documento cadastrado para esta empresa.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((documentItem) => (
            <div
              id={`document-${documentItem.id}`}
              key={documentItem.id}
              className={`border rounded-xl p-5 flex items-center justify-between gap-4 transition-all duration-500 scroll-mt-32 ${
                highlightedItem === documentItem.id
                  ? "border-fuchsia-600 bg-fuchsia-100 shadow-[0_0_30px_rgba(192,38,211,0.45)] scale-[1.01]"
                  : editingDocumentId === documentItem.id
                  ? "border-fuchsia-300 bg-purple-50"
                  : "border-purple-100 hover:bg-purple-50"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {documentItem.status === "Pago" && (
                    <CheckCircle size={20} className="text-emerald-600" />
                  )}

                  <h3
                    className={`font-bold text-lg ${
                      documentItem.status === "Pago"
                        ? "text-emerald-700"
                        : "text-[#1b1028]"
                    }`}
                  >
                    {documentItem.name}
                  </h3>
                </div>

                <p className="text-slate-600 text-sm mt-1">
                  Categoria: {documentItem.category}
                </p>

                <p className="text-slate-600 text-sm">
                  Vencimento: {documentItem.dueDate || "Sem vencimento"}
                </p>

                <p className="text-slate-600 text-sm">
                  Arquivo: {documentItem.fileName || "Nenhum arquivo anexado"}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                {documentItem.fileUrl && (
                  <a
                    href={documentItem.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Abrir arquivo
                  </a>
                )}

                {canEditDocument && (
                  <button
                    type="button"
                    onClick={() => toggleDocumentStatus(documentItem.id)}
                    className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    {documentItem.status === "Pago" ? "Reabrir" : "Resolver"}
                  </button>
                )}

                {canEditDocument && (
                  <button
                    type="button"
                    onClick={() => handleEdit(documentItem)}
                    className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                )}

                {canDeleteDocument && (
                  <button
                    type="button"
                    onClick={() => deleteDocument(documentItem)}
                    className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <Trash2 size={16} />
                    Apagar
                  </button>
                )}

                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                    documentItem.status
                  )}`}
                >
                  {documentItem.status === "Pago"
                    ? "Resolvido"
                    : documentItem.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentSection;