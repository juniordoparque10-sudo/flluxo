import { useEffect, useState } from "react";

import {
  Upload,
  FileText,
  Trash2,
  Download,
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
  arrayUnion,
} from "firebase/firestore";

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  auth,
  db,
  storage,
} from "../../firebase/config";

function TaskAttachments({
  companyId,
  task,
}) {
  const [attachments, setAttachments] =
    useState([]);

  const [uploading, setUploading] =
    useState(false);

  useEffect(() => {
    if (!companyId || !task?.id)
      return;

    const q = query(
      collection(
        db,
        "companies",
        companyId,
        "tasks",
        task.id,
        "attachments"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe =
      onSnapshot(q, (snapshot) => {
        const list =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        setAttachments(list);
      });

    return () => unsubscribe();
  }, [companyId, task?.id]);

  async function addHistory(
    description
  ) {
    const taskRef = doc(
      db,
      "companies",
      companyId,
      "tasks",
      task.id
    );

    await updateDoc(taskRef, {
      history: arrayUnion({
        description,
        userId:
          auth.currentUser?.uid || "",
        userEmail:
          auth.currentUser?.email ||
          "Sistema",
        createdAt:
          new Date().toISOString(),
      }),
    });
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      const storageRef = ref(
        storage,
        `tasks/${companyId}/${task.id}/${Date.now()}_${
          file.name
        }`
      );

      await uploadBytes(
        storageRef,
        file
      );

      const downloadURL =
        await getDownloadURL(
          storageRef
        );

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "tasks",
          task.id,
          "attachments"
        ),
        {
          name: file.name,
          size: file.size,
          type: file.type,
          url: downloadURL,
          storagePath:
            storageRef.fullPath,

          uploadedBy:
            auth.currentUser?.email ||
            "Sistema",

          createdAt:
            serverTimestamp(),
        }
      );

      await addHistory(
        `anexou o arquivo "${file.name}"`
      );

      alert(
        "Arquivo enviado com sucesso!"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao enviar arquivo."
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(
    attachment
  ) {
    const confirmDelete =
      window.confirm(
        `Remover arquivo "${attachment.name}"?`
      );

    if (!confirmDelete) return;

    try {
      if (attachment.storagePath) {
        const fileRef = ref(
          storage,
          attachment.storagePath
        );

        await deleteObject(fileRef);
      }

      await deleteDoc(
        doc(
          db,
          "companies",
          companyId,
          "tasks",
          task.id,
          "attachments",
          attachment.id
        )
      );

      await addHistory(
        `removeu o arquivo "${attachment.name}"`
      );

      alert(
        "Arquivo removido com sucesso!"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao remover arquivo."
      );
    }
  }

  function formatSize(size) {
    if (!size) return "0 KB";

    const kb = size / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    return `${(
      kb / 1024
    ).toFixed(1)} MB`;
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-purple-100 p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl font-bold text-[#1b1028]">
            Anexos da tarefa
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            PDFs, imagens, planilhas e documentos.
          </p>
        </div>

        <label className="cursor-pointer bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition">
          <Upload size={18} />

          {uploading
            ? "Enviando..."
            : "Enviar arquivo"}

          <input
            type="file"
            hidden
            onChange={handleUpload}
          />
        </label>
      </div>

      {attachments.length === 0 ? (
        <div className="border border-dashed border-purple-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500">
            Nenhum arquivo anexado ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map(
            (attachment) => (
              <div
                key={attachment.id}
                className="border border-purple-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <FileText className="text-fuchsia-600" />
                  </div>

                  <div>
                    <h4 className="font-semibold text-[#1b1028]">
                      {
                        attachment.name
                      }
                    </h4>

                    <p className="text-sm text-slate-500">
                      {formatSize(
                        attachment.size
                      )}{" "}
                      •{" "}
                      {
                        attachment.uploadedBy
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#1b1028] hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                  >
                    <Download size={16} />
                    Abrir
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      removeAttachment(
                        attachment
                      )
                    }
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                  >
                    <Trash2 size={16} />
                    Remover
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default TaskAttachments;