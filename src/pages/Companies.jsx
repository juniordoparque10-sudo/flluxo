import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { Link } from "react-router-dom";

import {
  Building2,
  Edit,
  Trash2,
  X,
  Camera,
} from "lucide-react";

import AppLayout from "../layouts/AppLayout";

import {
  auth,
  db,
  storage,
} from "../firebase/config";

function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingCompanyId, setEditingCompanyId] =
    useState(null);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  const [userPermissions, setUserPermissions] =
    useState({});

  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    responsible: "",
    phone: "",
    logoURL: "",
  });

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    const unsubscribeUser = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserPermissions(
            snapshot.data().permissions || {}
          );
        }
      }
    );

    return () => unsubscribeUser();
  }, []);

  useEffect(() => {
    migrateLocalCompanies();

    const q = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setCompanies(list);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Erro ao carregar empresas:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function migrateLocalCompanies() {
    try {
      const migrated = localStorage.getItem(
        "flluxo_companies_migrated"
      );

      if (migrated === "true") return;

      const localCompanies = JSON.parse(
        localStorage.getItem(
          "flluxo_companies"
        ) || "[]"
      );

      if (localCompanies.length === 0) {
        localStorage.setItem(
          "flluxo_companies_migrated",
          "true"
        );

        return;
      }

      for (const company of localCompanies) {
        await addDoc(collection(db, "companies"), {
          name: company.name || "",
          cnpj: company.cnpj || "",
          responsible:
            company.responsible || "",

          phone: company.phone || "",
          logoURL: company.logoURL || "",

          createdAt:
            company.createdAt ||
            new Date().toISOString(),
        });
      }

      localStorage.setItem(
        "flluxo_companies_migrated",
        "true"
      );
    } catch (error) {
      console.error(
        "Erro ao migrar empresas:",
        error
      );
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function resetForm() {
    setForm({
      name: "",
      cnpj: "",
      responsible: "",
      phone: "",
      logoURL: "",
    });

    setEditingCompanyId(null);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setUploadingLogo(true);

      const fileName = `${Date.now()}_${
        file.name
      }`;

      const fileRef = ref(
        storage,
        `companies/${fileName}`
      );

      await uploadBytes(fileRef, file);

      const logoURL =
        await getDownloadURL(fileRef);

      setForm((prev) => ({
        ...prev,
        logoURL,
      }));

      alert("Logo enviada com sucesso!");
    } catch (error) {
      console.error(error);

      alert("Erro ao enviar logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleEdit(company) {
    if (!userPermissions?.companyEdit) {
      alert(
        "Você não possui permissão para editar empresas."
      );

      return;
    }

    setEditingCompanyId(company.id);

    setForm({
      name: company.name || "",
      cnpj: company.cnpj || "",
      responsible:
        company.responsible || "",

      phone: company.phone || "",
      logoURL: company.logoURL || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Informe o nome da empresa");

      return;
    }

    try {
      setSaving(true);

      if (editingCompanyId) {
        if (!userPermissions?.companyEdit) {
          alert(
            "Você não possui permissão para editar empresas."
          );

          return;
        }

        const companyRef = doc(
          db,
          "companies",
          editingCompanyId
        );

        await updateDoc(companyRef, {
          name: form.name,
          cnpj: form.cnpj,
          responsible: form.responsible,
          phone: form.phone,
          logoURL: form.logoURL,

          updatedAt:
            new Date().toISOString(),
        });

        resetForm();

        alert(
          "Empresa atualizada com sucesso!"
        );

        return;
      }

      if (!userPermissions?.companyCreate) {
        alert(
          "Você não possui permissão para cadastrar empresas."
        );

        return;
      }

      await addDoc(collection(db, "companies"), {
        ...form,
        createdAt:
          new Date().toISOString(),
      });

      resetForm();

      alert(
        "Empresa cadastrada com sucesso!"
      );
    } catch (error) {
      console.error(
        "Erro ao salvar empresa:",
        error
      );

      alert("Erro ao salvar empresa.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(
    companyId,
    companyName
  ) {
    if (!userPermissions?.companyDelete) {
      alert(
        "Você não possui permissão para apagar empresas."
      );

      return;
    }

    const confirmDelete =
      window.confirm(
        `Deseja apagar a empresa "${companyName}"?`
      );

    if (!confirmDelete) return;

    const confirmDeleteAgain =
      window.confirm(
        "Essa ação apagará a empresa da base principal. Deseja continuar?"
      );

    if (!confirmDeleteAgain) return;

    try {
      await deleteDoc(
        doc(db, "companies", companyId)
      );

      if (editingCompanyId === companyId) {
        resetForm();
      }

      alert(
        "Empresa apagada com sucesso!"
      );
    } catch (error) {
      console.error(
        "Erro ao apagar empresa:",
        error
      );

      alert("Erro ao apagar empresa.");
    }
  }

  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-[#1b1028]">
        Empresas
      </h1>

      <p className="text-slate-600 mt-2 mb-8">
        Gerencie empresas,
        responsáveis e documentos do
        Flluxo.
      </p>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mb-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-[#1b1028]">
            {editingCompanyId
              ? "Editar Empresa"
              : "Nova Empresa"}
          </h2>

          {editingCompanyId && (
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
          <div className="md:col-span-4 flex items-center gap-5">
            <div className="relative">
              {form.logoURL ? (
                <img
                  src={form.logoURL}
                  alt="Logo"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-fuchsia-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-fuchsia-100 flex items-center justify-center">
                  <Building2 className="text-fuchsia-600" />
                </div>
              )}

              <label className="absolute -bottom-2 -right-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white p-2 rounded-full cursor-pointer">
                <Camera size={16} />

                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <p className="font-semibold text-[#1b1028]">
                Logo da empresa
              </p>

              <p className="text-sm text-slate-500 mt-1">
                PNG, JPG ou JPEG
              </p>

              {uploadingLogo && (
                <p className="text-sm text-fuchsia-600 mt-2">
                  Enviando logo...
                </p>
              )}
            </div>
          </div>

          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="Nome da empresa"
          />

          <input
            type="text"
            name="cnpj"
            value={form.cnpj}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="CNPJ"
          />

          <input
            type="text"
            name="responsible"
            value={form.responsible}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="Responsável"
          />

          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="Telefone"
          />

          <div className="md:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : editingCompanyId
                ? "Salvar Alterações"
                : "Salvar Empresa"}
            </button>

            {editingCompanyId && (
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
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-[#1b1028]">
            Empresas cadastradas
          </h2>

          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2">
            <p className="text-sm font-semibold text-fuchsia-700">
              Total: {companies.length}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">
            Carregando empresas...
          </p>
        ) : companies.length === 0 ? (
          <p className="text-slate-500">
            Nenhuma empresa cadastrada.
          </p>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`border rounded-2xl p-5 hover:bg-purple-50 transition ${
                  editingCompanyId ===
                  company.id
                    ? "border-fuchsia-500 bg-fuchsia-50 shadow-lg"
                    : "border-purple-100"
                }`}
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      {company.logoURL ? (
                        <img
                          src={company.logoURL}
                          alt="Logo"
                          className="w-16 h-16 rounded-2xl object-cover border border-purple-100"
                        />
                      ) : (
                        <div className="bg-fuchsia-100 text-fuchsia-700 p-3 rounded-xl">
                          <Building2
                            size={22}
                          />
                        </div>
                      )}

                      <div>
                        <h3 className="font-bold text-lg text-[#1b1028]">
                          {company.name}
                        </h3>

                        <p className="text-slate-600 text-sm">
                          CNPJ:{" "}
                          {company.cnpj ||
                            "Não informado"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <p className="text-slate-600 text-sm">
                        Responsável:{" "}
                        {company.responsible ||
                          "Não informado"}
                      </p>

                      <p className="text-slate-600 text-sm">
                        Telefone:{" "}
                        {company.phone ||
                          "Não informado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      to={`/empresas/${company.id}`}
                      className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 py-3 rounded-xl font-medium transition"
                    >
                      Abrir empresa
                    </Link>

                    {userPermissions?.companyEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(
                            company
                          )
                        }
                        className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-5 py-3 rounded-xl font-medium transition"
                      >
                        <Edit size={18} />
                        Editar
                      </button>
                    )}

                    {userPermissions?.companyDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          deleteCompany(
                            company.id,
                            company.name
                          )
                        }
                        className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-5 py-3 rounded-xl font-medium transition"
                      >
                        <Trash2
                          size={18}
                        />
                        Apagar
                      </button>
                    )}
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

export default Companies;