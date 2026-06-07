import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { useAuthState } from "react-firebase-hooks/auth";

import {
  Camera,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

import AppLayout from "../layouts/AppLayout";
import { auth, db, storage } from "../firebase/config";

function Profile() {
  const [user] = useAuthState(auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sector: "",
    phone: "",
    photoURL: "",
    role: "collaborator",
  });

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setForm({
            name: data.name || "",
            sector: data.sector || "",
            phone: data.phone || "",
            photoURL: data.photoURL || "",
            role: data.role || "collaborator",
          });
        }

        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar perfil:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setUploading(true);

      const fileName = `${Date.now()}_${file.name}`;

      const fileRef = ref(
        storage,
        `avatars/${user.uid}/${fileName}`
      );

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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) return;

    try {
      setSaving(true);

      const userRef = doc(db, "users", user.uid);

      await setDoc(
        userRef,
        {
          name: form.name,
          sector: form.sector,
          phone: form.phone,
          photoURL: form.photoURL,
          email: user.email,
          role: form.role,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-[#1b1028] font-semibold">
          Carregando perfil...
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-fuchsia-600 to-purple-700 h-40 relative">
            <div className="absolute -bottom-16 left-10">
              <div className="relative">
                {form.photoURL ? (
                  <img
                    src={form.photoURL}
                    alt="Avatar"
                    className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-xl">
                    <UserCircle2
                      size={70}
                      className="text-fuchsia-600"
                    />
                  </div>
                )}

                <label className="absolute bottom-1 right-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white p-3 rounded-full cursor-pointer shadow-lg transition">
                  <Camera size={18} />

                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-24 px-10 pb-10">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl font-black text-[#1b1028]">
                  {form.name || "Meu Perfil"}
                </h1>

                <p className="text-slate-500 mt-2">
                  Gerencie suas informações pessoais no Flluxo.
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={16} />
                    <span className="text-sm">
                      {user?.email}
                    </span>
                  </div>

                  {form.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={16} />
                      <span className="text-sm">
                        {form.phone}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                      form.role === "admin"
                        ? "bg-fuchsia-100 text-fuchsia-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <ShieldCheck size={16} />

                    {form.role === "admin"
                      ? "Administrador"
                      : "Colaborador"}
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 px-5 py-3 rounded-xl text-sm font-medium">
                  Enviando foto...
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-700">
                  Nome completo
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-purple-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-slate-700">
                  Setor
                </label>

                <input
                  type="text"
                  name="sector"
                  value={form.sector}
                  onChange={handleChange}
                  className="w-full border border-purple-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500"
                  placeholder="Ex: Financeiro"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-slate-700">
                  Telefone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border border-purple-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500"
                  placeholder="(84) 99999-9999"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-8 py-4 rounded-2xl font-semibold transition shadow-lg disabled:opacity-50"
                >
                  <Save size={18} />

                  {saving
                    ? "Salvando..."
                    : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Profile;