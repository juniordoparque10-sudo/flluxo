import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import AppLayout from "../layouts/AppLayout";
import DocumentSection from "../components/DocumentSection";
import TaskSection from "../components/TaskSection";
import { db } from "../firebase/config";

function CompanyDetails() {
  const { id } = useParams();

  const [company, setCompany] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loadingCompany, setLoadingCompany] =
    useState(true);

  const [loadingItems, setLoadingItems] =
    useState(true);

  const [highlightedItem, setHighlightedItem] =
    useState(null);

  useEffect(() => {
    if (!id) return;

    const companyRef = doc(db, "companies", id);

    const unsubscribe = onSnapshot(
      companyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCompany({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setCompany(null);
        }

        setLoadingCompany(false);
      },
      (error) => {
        console.error(
          "Erro ao carregar empresa:",
          error
        );

        setLoadingCompany(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const documentsQuery = query(
      collection(
        db,
        "companies",
        id,
        "documents"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribeDocuments = onSnapshot(
      documentsQuery,
      (snapshot) => {
        const list = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        setDocuments(list);
        setLoadingItems(false);
      },
      (error) => {
        console.error(
          "Erro ao carregar documentos:",
          error
        );

        setLoadingItems(false);
      }
    );

    return () => unsubscribeDocuments();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const tasksQuery = query(
      collection(db, "companies", id, "tasks"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const list = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        setTasks(list);
        setLoadingItems(false);
      },
      (error) => {
        console.error(
          "Erro ao carregar tarefas:",
          error
        );

        setLoadingItems(false);
      }
    );

    return () => unsubscribeTasks();
  }, [id]);

  function handleNeedClick(link) {
    const element =
      document.querySelector(link);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const itemId = link
      .replace("#document-", "")
      .replace("#task-", "");

    setHighlightedItem(itemId);

    setTimeout(() => {
      setHighlightedItem(null);
    }, 4000);
  }

  if (loadingCompany) {
    return (
      <AppLayout>
        <h1 className="text-3xl font-bold text-[#1b1028]">
          Carregando empresa...
        </h1>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <h1 className="text-3xl font-bold text-[#1b1028]">
          Empresa não encontrada
        </h1>
      </AppLayout>
    );
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  function getDaysDiff(date) {
    if (!date) return null;

    const dueDate = new Date(date);

    dueDate.setHours(0, 0, 0, 0);

    return Math.ceil(
      (dueDate - today) /
        (1000 * 60 * 60 * 24)
    );
  }

  const pendingDocuments =
    documents.filter(
      (document) =>
        document.status !== "Pago" &&
        document.status !== "Arquivado"
    );

  const pendingTasks = tasks.filter(
    (task) =>
      task.status !== "Concluída"
  );

  const overdueDocuments =
    pendingDocuments.filter(
      (document) => {
        const days = getDaysDiff(
          document.dueDate
        );

        return (
          days !== null && days < 0
        );
      }
    );

  const overdueTasks =
    pendingTasks.filter((task) => {
      const days = getDaysDiff(
        task.dueDate
      );

      return days !== null && days < 0;
    });

  const needs = [
    ...overdueDocuments.map((item) => ({
      id: item.id,
      title: item.name,
      type: "Documento vencido",
      date: item.dueDate,
      level: "red",
      link: `#document-${item.id}`,
    })),

    ...overdueTasks.map((item) => ({
      id: item.id,
      title: item.title,
      type: "Tarefa atrasada",
      date: item.dueDate,
      level: "red",
      link: `#task-${item.id}`,
    })),
  ];

  function getNeedColor(level) {
    if (level === "red") {
      return "border-red-200 bg-red-100 text-red-700";
    }

    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }

  return (
    <AppLayout>
      <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-8 shadow">
        <div className="flex items-center gap-5">
          {company.logoURL ? (
            <img
              src={company.logoURL}
              alt="Logo"
              className="w-24 h-24 rounded-2xl object-cover border border-purple-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-fuchsia-100 flex items-center justify-center">
              <span className="text-fuchsia-700 font-bold text-2xl">
                {company.name?.charAt(0)}
              </span>
            </div>
          )}

          <div>
            <h1 className="text-3xl font-bold text-[#1b1028]">
              {company.name}
            </h1>

            <p className="text-slate-500 mt-2">
              Responsável:{" "}
              {company.responsible ||
                "Não informado"}
            </p>

            <p className="text-slate-500">
              CNPJ:{" "}
              {company.cnpj ||
                "Não informado"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-8 shadow">
        <h2 className="text-2xl font-bold text-[#1b1028] mb-5">
          Necessidades da empresa
        </h2>

        {needs.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
            <p className="text-emerald-700 font-semibold">
              Nenhuma necessidade crítica no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {needs.map((need) => (
              <button
                key={`${need.type}-${need.id}`}
                type="button"
                onClick={() =>
                  handleNeedClick(
                    need.link
                  )
                }
                className={`w-full text-left border rounded-xl p-5 hover:scale-[1.01] hover:shadow-lg transition ${getNeedColor(
                  need.level
                )}`}
              >
                <p className="font-bold text-lg">
                  {need.title}
                </p>

                <p className="text-sm mt-1">
                  {need.type}
                </p>

                <p className="text-sm mt-1">
                  Prazo:{" "}
                  {need.date ||
                    "Sem prazo"}
                </p>

                <p className="text-xs font-semibold mt-3 opacity-80">
                  Clique para ir direto ao problema
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div id="documentos">
        <DocumentSection
          companyId={company.id}
          highlightedItem={
            highlightedItem
          }
        />
      </div>

      <div id="tarefas" className="mt-8">
        <TaskSection
          companyId={company.id}
          highlightedItem={
            highlightedItem
          }
        />
      </div>
    </AppLayout>
  );
}

export default CompanyDetails;