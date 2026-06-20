import { useEffect, useMemo, useState } from "react";

import { initializeApp, deleteApp } from "firebase/app";

import {
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  Edit,
  Search,
  Trash2,
  Users,
  UserCheck,
  X,
  ShieldCheck,
  Building2,
  Activity,
  Mail,
  Camera,
} from "lucide-react";

import AppLayout from "../layouts/AppLayout";
import { db, storage, firebaseConfig } from "../firebase/config";

function Collaborators() {
  const migrationKey = "flluxo_collaborators_migrated";

  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Todos");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Colaborador",
    sector: "Administrativo",
    photoURL: "",
  });

  useEffect(() => {
    migrateLocalCollaborators();

    const collaboratorsQuery = query(
      collection(db, "collaborators"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      collaboratorsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter(
            (collaborator) =>
              collaborator.deleted !== true &&
              collaborator.active !== false
          );

        setCollaborators(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar colaboradores:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function migrateLocalCollaborators() {
    try {
      const migrated = localStorage.getItem(migrationKey);

      if (migrated === "true") return;

      const localCollaborators = JSON.parse(
        localStorage.getItem("flluxo_collaborators") || "[]"
      );

      if (localCollaborators.length === 0) {
        localStorage.setItem(migrationKey, "true");
        return;
      }

      for (const collaborator of localCollaborators) {
        await addDoc(collection(db, "collaborators"), {
          name: collaborator.name || "",
          email: collaborator.email || "",
          role: collaborator.role || "Colaborador",
          sector: collaborator.sector || "Administrativo",
          photoURL: collaborator.photoURL || "",
          status: "Online",
          active: true,
          deleted: false,
          createdAt: collaborator.createdAt || new Date().toISOString(),
          migratedFromLocalStorage: true,
        });
      }

      localStorage.setItem(migrationKey, "true");
    } catch (error) {
      console.error("Erro ao migrar colaboradores:", error);
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
      email: "",
      password: "",
      role: "Colaborador",
      sector: "Administrativo",
      photoURL: "",
    });

    setEditingId(null);
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setUploading(true);

      const fileName = `${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `collaborators/${fileName}`);

      await uploadBytes(fileRef, file);

      const photoURL = await getDownloadURL(fileRef);

      setForm((prev) => ({
        ...prev,
        photoURL,
      }));

      alert("Foto enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      alert("Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  async function createUserWithoutChangingCurrentLogin(email, password) {
    const secondaryApp = initializeApp(
      firebaseConfig,
      `secondary-${Date.now()}`
    );

    const secondaryAuth = getAuth(secondaryApp);

    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );

    await deleteApp(secondaryApp);

    return userCredential.user;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Informe o nome do colaborador");
      return;
    }

    if (!form.email.trim()) {
      alert("Informe o e-mail do colaborador");
      return;
    }

    try {
      if (editingId) {
        const collaborator = collaborators.find(
          (item) => item.id === editingId
        );

        const collaboratorRef = doc(db, "collaborators", editingId);

        await updateDoc(collaboratorRef, {
          name: form.name,
          email: form.email,
          role: form.role,
          sector: form.sector,
          photoURL: form.photoURL,
          updatedAt: serverTimestamp(),
        });

        if (collaborator?.uid) {
          const systemRole =
            form.role === "Administrador" ? "admin" : "collaborator";

          await updateDoc(doc(db, "users", collaborator.uid), {
            name: form.name,
            email: form.email,
            role: systemRole,
            sector: form.sector,
            photoURL: form.photoURL || "",
            updatedAt: serverTimestamp(),
          });
        }

        alert("Colaborador atualizado!");
      } else {
        if (!form.password.trim()) {
          alert("Informe a senha de acesso");
          return;
        }

        if (form.password.length < 6) {
          alert("A senha precisa ter pelo menos 6 caracteres.");
          return;
        }

        const createdUser = await createUserWithoutChangingCurrentLogin(
          form.email,
          form.password
        );

        const systemRole =
          form.role === "Administrador" ? "admin" : "collaborator";

        const defaultPermissions =
          systemRole === "admin"
            ? {
                dashboard: true,
                companies: true,
                documents: true,
                tasks: true,
                agenda: true,
                quickRegister: true,
                collaborators: true,
                accessManagement: true,
              }
            : {
                dashboard: true,
                companies: true,
                documents: true,
                tasks: true,
                agenda: true,
                quickRegister: true,
                collaborators: false,
                accessManagement: false,
              };

        await setDoc(doc(db, "users", createdUser.uid), {
          uid: createdUser.uid,
          name: form.name,
          email: form.email,
          role: systemRole,
          permissions: defaultPermissions,
          sector: form.sector,
          photoURL: form.photoURL || "",
          status: "Online",
          active: true,
          deleted: false,
          createdAt: serverTimestamp(),
        });

        await addDoc(collection(db, "collaborators"), {
          uid: createdUser.uid,
          name: form.name,
          email: form.email,
          role: form.role,
          sector: form.sector,
          photoURL: form.photoURL || "",
          status: "Online",
          active: true,
          deleted: false,
          createdAt: serverTimestamp(),
        });

        alert("Colaborador criado com login e senha!");
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar colaborador:", error);

      if (error.code === "auth/email-already-in-use") {
        alert("Este e-mail já está em uso.");
        return;
      }

      alert("Erro ao salvar colaborador.");
    }
  }

  function handleEdit(collaborator) {
    setEditingId(collaborator.id);

    setForm({
      name: collaborator.name || "",
      email: collaborator.email || "",
      password: "",
      role: collaborator.role || "Colaborador",
      sector: collaborator.sector || "Administrativo",
      photoURL: collaborator.photoURL || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteCollaborator(collaborator) {
    const confirmDelete = window.confirm(
      `Deseja apagar o colaborador "${collaborator.name}"?`
    );

    if (!confirmDelete) return;

    try {
      await updateDoc(doc(db, "collaborators", collaborator.id), {
        deleted: true,
        active: false,
        status: "Inativo",
        deletedAt: serverTimestamp(),
      });

      if (collaborator.uid) {
        await updateDoc(doc(db, "users", collaborator.uid), {
          deleted: true,
          active: false,
          status: "Inativo",
          deletedAt: serverTimestamp(),
        });
      }

      if (editingId === collaborator.id) {
        resetForm();
      }

      alert("Colaborador removido com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar colaborador:", error);
      alert("Erro ao apagar colaborador.");
    }
  }

  function getRoleColor(role) {
    switch (role) {
      case "Administrador":
        return "bg-fuchsia-100 text-fuchsia-700";
      case "Visualizador":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-emerald-100 text-emerald-700";
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "Online":
        return "bg-emerald-100 text-emerald-700";
      case "Inativo":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  const filteredCollaborators = useMemo(() => {
    return collaborators.filter((collaborator) => {
      const searchLower = search.toLowerCase();

      const matchesSearch =
        collaborator.name?.toLowerCase().includes(searchLower) ||
        collaborator.email?.toLowerCase().includes(searchLower) ||
        collaborator.sector?.toLowerCase().includes(searchLower);

      const matchesRole =
        filterRole === "Todos" ? true : collaborator.role === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [collaborators, search, filterRole]);

  const adminCount = collaborators.filter(
    (item) => item.role === "Administrador"
  ).length;

  const collaboratorCount = collaborators.filter(
    (item) => item.role === "Colaborador"
  ).length;

  return (
    <AppLayout>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1028]">
            Equipe Operacional
          </h1>

          <p className="text-slate-600 mt-2">
            Gestão empresarial inteligente de colaboradores.
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
            placeholder="Pesquisar colaborador..."
            className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8 mb-8">
        <DashboardCard
          icon={<Users />}
          title="Total"
          value={collaborators.length}
        />

        <DashboardCard
          icon={<ShieldCheck />}
          title="Admins"
          value={adminCount}
          color="red"
        />

        <DashboardCard
          icon={<UserCheck />}
          title="Equipe"
          value={collaboratorCount}
          color="emerald"
        />

        <DashboardCard
          icon={<Activity />}
          title="Online"
          value={
            collaborators.filter((item) => item.status === "Online").length
          }
          color="orange"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100 mb-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-[#1b1028]">
            {editingId ? "Editar Colaborador" : "Novo Colaborador"}
          </h2>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <X size={16} />
              Cancelar
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-5"
        >
          <div className="md:col-span-4 flex items-center gap-5">
            <div className="relative">
              {form.photoURL ? (
                <img
                  src={form.photoURL}
                  alt="Avatar"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-fuchsia-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-fuchsia-100 flex items-center justify-center">
                  <Users className="text-fuchsia-600" />
                </div>
              )}

              <label className="absolute -bottom-2 -right-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white p-2 rounded-full cursor-pointer">
                <Camera size={16} />

                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <p className="font-semibold text-[#1b1028]">
                Foto do colaborador
              </p>

              <p className="text-sm text-slate-500 mt-1">
                PNG, JPG ou JPEG
              </p>

              {uploading && (
                <p className="text-sm text-fuchsia-600 mt-2">
                  Enviando foto...
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
            placeholder="Nome"
          />

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="E-mail"
          />

          {!editingId && (
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Senha de acesso"
            />
          )}

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Administrador</option>
            <option>Colaborador</option>
            <option>Visualizador</option>
          </select>

          <select
            name="sector"
            value={form.sector}
            onChange={handleChange}
            className="border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Administrativo</option>
            <option>RH</option>
            <option>Operacional</option>
            <option>Comercial</option>
            <option>Financeiro</option>
          </select>

          <div className="md:col-span-4">
            <button
              type="submit"
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-medium transition shadow-md"
            >
              {editingId ? "Salvar Alterações" : "Criar Login do Colaborador"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 border border-purple-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-[#1b1028]">
            Colaboradores cadastrados
          </h2>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-purple-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option>Todos</option>
            <option>Administrador</option>
            <option>Colaborador</option>
            <option>Visualizador</option>
          </select>
        </div>

        {loading ? (
          <p className="text-slate-500">Carregando colaboradores...</p>
        ) : filteredCollaborators.length === 0 ? (
          <p className="text-slate-500">Nenhum colaborador encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="border border-purple-100 rounded-2xl p-5 hover:bg-purple-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    {collaborator.photoURL ? (
                      <img
                        src={collaborator.photoURL}
                        alt={collaborator.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-purple-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-fuchsia-100 flex items-center justify-center">
                        <Users className="text-fuchsia-600" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-[#1b1028]">
                          {collaborator.name}
                        </h3>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleColor(
                            collaborator.role
                          )}`}
                        >
                          {collaborator.role}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                            collaborator.status
                          )}`}
                        >
                          {collaborator.status || "Offline"}
                        </span>
                      </div>

                      <div className="space-y-1 mt-3">
                        <p className="text-slate-600 text-sm flex items-center gap-2">
                          <Mail size={14} />
                          {collaborator.email || "Não informado"}
                        </p>

                        <p className="text-slate-600 text-sm flex items-center gap-2">
                          <Building2 size={14} />
                          {collaborator.sector}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(collaborator)}
                      className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-medium transition"
                    >
                      <Edit size={16} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCollaborator(collaborator)}
                      className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-medium transition"
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

function DashboardCard({ icon, title, value, color = "fuchsia" }) {
  const colors = {
    fuchsia: "text-fuchsia-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
    orange: "text-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-purple-100">
      <div className={`${colors[color]} mb-4`}>{icon}</div>

      <p className="text-slate-500 text-sm">{title}</p>

      <h2 className={`text-3xl font-bold mt-2 ${colors[color]}`}>
        {value}
      </h2>
    </div>
  );
}

export default Collaborators;