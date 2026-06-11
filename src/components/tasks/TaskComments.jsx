import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { MessageSquare, Send } from "lucide-react";

import { auth, db } from "../../firebase/config";
import { createNotification } from "../../services/notificationService";

function TaskComments({
  companyId,
  companyName,
  task,
}) {
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!companyId || !task?.id) return;

    const commentsQuery = query(
      collection(
        db,
        "companies",
        companyId,
        "tasks",
        task.id,
        "comments"
      ),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setComments(list);
    });

    return () => unsubscribe();
  }, [companyId, task?.id]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!comment.trim()) {
      alert("Digite um comentário.");
      return;
    }

    try {
      setSaving(true);

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "tasks",
          task.id,
          "comments"
        ),
        {
          message: comment,
          userId: user?.uid || "",
          userEmail: user?.email || "Sistema",
          createdAt: serverTimestamp(),
        }
      );

      const followers = task.followers || [];

      for (const followerId of followers) {
        if (followerId === user?.uid) continue;

        await createNotification({
          title: "Novo comentário na tarefa",
          message: `${user?.email || "Alguém"} comentou em "${
            task.title
          }" na empresa ${companyName}.`,
          type: "task-status",
          companyId,
          taskId: task.id,
          targetUrl: `/empresas/${companyId}#task-${task.id}`,
          targetUserId: followerId,
          excludeUserId: user?.uid || "",
        });
      }

      setComment("");
    } catch (error) {
      console.error("Erro ao comentar:", error);
      alert("Erro ao salvar comentário.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date) {
    if (!date) return "";

    if (date?.toDate) {
      return date.toDate().toLocaleString("pt-BR");
    }

    return new Date(date).toLocaleString("pt-BR");
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-purple-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="text-fuchsia-600" />

        <h3 className="text-xl font-bold text-[#1b1028]">
          Comentários
        </h3>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 mb-5"
      >
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-purple-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 min-h-24"
          placeholder="Comente uma atualização dessa tarefa..."
        />

        <button
          type="submit"
          disabled={saving}
          className="self-start flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 py-3 rounded-xl font-medium disabled:opacity-50"
        >
          <Send size={18} />
          {saving ? "Enviando..." : "Enviar comentário"}
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="text-slate-500">
          Nenhum comentário ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((item) => (
            <div
              key={item.id}
              className="border border-purple-100 rounded-xl p-4 bg-purple-50"
            >
              <p className="text-[#1b1028]">
                {item.message}
              </p>

              <p className="text-xs text-slate-500 mt-2">
                {item.userEmail} • {formatDate(item.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskComments;