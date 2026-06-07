import { useEffect, useState } from "react";

import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import {
  ShieldCheck,
  Save,
} from "lucide-react";

import AppLayout from "../layouts/AppLayout";
import { db } from "../firebase/config";

function AccessManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setUsers(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar usuários:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function togglePermission(
    userId,
    permission,
    currentValue
  ) {
    try {
      const userRef = doc(db, "users", userId);

      const user = users.find((item) => item.id === userId);

      await updateDoc(userRef, {
        permissions: {
          ...(user.permissions || {}),
          [permission]: !currentValue,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
      alert("Erro ao atualizar permissão.");
    }
  }

  async function changeRole(userId, role) {
    try {
      const userRef = doc(db, "users", userId);

      await updateDoc(userRef, {
        role,
      });

      if (role === "admin") {
        await updateDoc(userRef, {
          permissions: {
            dashboard: true,

            companies: true,
            companyCreate: true,
            companyEdit: true,
            companyDelete: true,

            documents: true,
            documentCreate: true,
            documentEdit: true,
            documentDelete: true,

            tasks: true,
            taskCreate: true,
            taskEdit: true,
            taskDelete: true,

            agenda: true,
            agendaCreate: true,
            agendaEdit: true,
            agendaDelete: true,

            quickRegister: true,
            quickRegisterCreate: true,
            quickRegisterDelete: true,

            collaborators: true,
            collaboratorCreate: true,
            collaboratorEdit: true,
            collaboratorDelete: true,

            accessManagement: true,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Erro ao atualizar perfil.");
    }
  }

  const permissionsGroups = [
    {
      title: "Menus principais",
      permissions: [
        {
          key: "dashboard",
          label: "Dashboard",
          description: "Acessar painel inicial",
        },
        {
          key: "companies",
          label: "Empresas",
          description: "Acessar menu de empresas",
        },
        {
          key: "documents",
          label: "Documentos",
          description: "Acessar central de documentos",
        },
        {
          key: "tasks",
          label: "Tarefas",
          description: "Acessar central de tarefas",
        },
        {
          key: "agenda",
          label: "Agenda",
          description: "Acessar agenda",
        },
        {
          key: "quickRegister",
          label: "Registro rápido",
          description: "Acessar central operacional",
        },
        {
          key: "collaborators",
          label: "Colaboradores",
          description: "Acessar equipe operacional",
        },
        {
          key: "accessManagement",
          label: "Gestão de acessos",
          description: "Acessar permissões do sistema",
        },
      ],
    },
    {
      title: "Permissões internas de empresas",
      permissions: [
        {
          key: "companyCreate",
          label: "Cadastrar empresa",
          description: "Permite criar nova empresa",
        },
        {
          key: "companyEdit",
          label: "Editar empresa",
          description: "Permite alterar dados da empresa",
        },
        {
          key: "companyDelete",
          label: "Apagar empresa",
          description: "Permite excluir empresas",
        },
      ],
    },
    {
      title: "Permissões internas de documentos",
      permissions: [
        {
          key: "documentCreate",
          label: "Cadastrar documento",
          description: "Permite anexar/cadastrar documentos",
        },
        {
          key: "documentEdit",
          label: "Editar documento",
          description: "Permite alterar status/dados do documento",
        },
        {
          key: "documentDelete",
          label: "Apagar documento",
          description: "Permite excluir documentos",
        },
      ],
    },
    {
      title: "Permissões internas de tarefas",
      permissions: [
        {
          key: "taskCreate",
          label: "Criar tarefa",
          description: "Permite criar tarefas",
        },
        {
          key: "taskEdit",
          label: "Editar tarefa",
          description: "Permite alterar tarefas",
        },
        {
          key: "taskDelete",
          label: "Apagar tarefa",
          description: "Permite excluir tarefas",
        },
      ],
    },
    {
      title: "Permissões internas da agenda",
      permissions: [
        {
          key: "agendaCreate",
          label: "Criar compromisso",
          description: "Permite criar eventos na agenda",
        },
        {
          key: "agendaEdit",
          label: "Editar compromisso",
          description: "Permite editar eventos da agenda",
        },
        {
          key: "agendaDelete",
          label: "Apagar compromisso",
          description: "Permite excluir eventos da agenda",
        },
      ],
    },
    {
      title: "Permissões internas da equipe",
      permissions: [
        {
          key: "collaboratorCreate",
          label: "Criar colaborador",
          description: "Permite cadastrar colaborador",
        },
        {
          key: "collaboratorEdit",
          label: "Editar colaborador",
          description: "Permite alterar colaborador",
        },
        {
          key: "collaboratorDelete",
          label: "Apagar colaborador",
          description: "Permite excluir colaborador",
        },
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-fuchsia-100 text-fuchsia-700 p-3 rounded-xl">
          <ShieldCheck size={24} />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[#1b1028]">
            Gestão de Acessos
          </h1>

          <p className="text-slate-600 mt-1">
            Controle menus e permissões internas do sistema.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow border border-purple-100 p-6">
        {loading ? (
          <p className="text-slate-500">
            Carregando usuários...
          </p>
        ) : users.length === 0 ? (
          <p className="text-slate-500">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <div className="space-y-6">
            {users.map((user) => (
              <div
                key={user.id}
                className="border border-purple-100 rounded-2xl p-6"
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#1b1028]">
                      {user.name || "Usuário"}
                    </h2>

                    <p className="text-slate-600 text-sm mt-1">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={user.role || "collaborator"}
                      onChange={(e) =>
                        changeRole(
                          user.id,
                          e.target.value
                        )
                      }
                      className="border border-purple-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      <option value="admin">
                        Administrador
                      </option>

                      <option value="collaborator">
                        Colaborador
                      </option>
                    </select>

                    <div
                      className={`px-4 py-2 rounded-full text-sm font-bold ${
                        user.role === "admin"
                          ? "bg-fuchsia-100 text-fuchsia-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {user.role === "admin"
                        ? "Administrador"
                        : "Colaborador"}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {permissionsGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-lg font-bold text-[#1b1028] mb-4">
                        {group.title}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {group.permissions.map((permission) => (
                          <div
                            key={permission.key}
                            className="border border-purple-100 rounded-xl p-4 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="font-semibold text-[#1b1028]">
                                {permission.label}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {permission.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={user.role === "admin"}
                              onClick={() =>
                                togglePermission(
                                  user.id,
                                  permission.key,
                                  user.permissions?.[
                                    permission.key
                                  ]
                                )
                              }
                              className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                                user.permissions?.[
                                  permission.key
                                ]
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              } ${
                                user.role === "admin"
                                  ? "opacity-60 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {user.permissions?.[
                                permission.key
                              ]
                                ? "Permitido"
                                : "Bloqueado"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2 text-emerald-600">
                  <Save size={18} />

                  <p className="text-sm font-medium">
                    Alterações salvas automaticamente
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AccessManagement;