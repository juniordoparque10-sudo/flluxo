import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

import {
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { db, auth } from "../../firebase/config";

function KanbanBoard({
  tasks,
  openTaskModal,
}) {
  const columns = [
    {
      id: "Pendente",
      title: "Pendente",
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-200",
    },

    {
      id: "Em andamento",
      title: "Em andamento",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },

    {
      id: "Revisão",
      title: "Revisão",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
    },

    {
      id: "Concluída",
      title: "Concluída",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
  ];

  async function handleDragEnd(result) {
    if (!result.destination) return;

    const sourceColumn =
      result.source.droppableId;

    const destinationColumn =
      result.destination.droppableId;

    if (
      sourceColumn === destinationColumn
    )
      return;

    const taskId =
      result.draggableId;

    const movedTask = tasks.find(
      (task) => task.id === taskId
    );

    if (!movedTask) return;

    try {
      const taskRef = doc(
        db,
        "companies",
        movedTask.companyId,
        "tasks",
        movedTask.id
      );

      await updateDoc(taskRef, {
        status: destinationColumn,

        history: arrayUnion({
          description: `moveu a tarefa para "${destinationColumn}"`,
          userId:
            auth.currentUser?.uid ||
            "",
          userEmail:
            auth.currentUser?.email ||
            "Sistema",
          createdAt:
            new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao mover tarefa."
      );
    }
  }

  function getPriorityColor(
    priority
  ) {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-700";

      case "Baixa":
        return "bg-emerald-100 text-emerald-700";

      default:
        return "bg-fuchsia-100 text-fuchsia-700";
    }
  }

  return (
    <DragDropContext
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">
        {columns.map((column) => {
          const columnTasks =
            tasks.filter(
              (task) =>
                task.status ===
                column.id
            );

          return (
            <div
              key={column.id}
              className={`${column.bg} border ${column.border} rounded-3xl p-5 min-h-[700px]`}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg text-[#1b1028]">
                  {column.title}
                </h2>

                <span className="bg-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                  {columnTasks.length}
                </span>
              </div>

              <Droppable
                droppableId={
                  column.id
                }
              >
                {(provided) => (
                  <div
                    ref={
                      provided.innerRef
                    }
                    {...provided.droppableProps}
                    className="space-y-4 min-h-[500px]"
                  >
                    {columnTasks.map(
                      (
                        task,
                        index
                      ) => (
                        <Draggable
                          key={task.id}
                          draggableId={
                            task.id
                          }
                          index={index}
                        >
                          {(
                            provided
                          ) => (
                            <div
                              ref={
                                provided.innerRef
                              }
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() =>
                                openTaskModal(
                                  task
                                )
                              }
                              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition cursor-pointer border border-purple-100"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="font-bold text-[#1b1028]">
                                  {
                                    task.title
                                  }
                                </h3>

                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                                    task.priority
                                  )}`}
                                >
                                  {
                                    task.priority
                                  }
                                </span>
                              </div>

                              <div className="mt-4 space-y-2">
                                <p className="text-sm text-slate-600">
                                  {
                                    task.companyName
                                  }
                                </p>

                                <p className="text-sm text-slate-500">
                                  👤{" "}
                                  {task.responsible ||
                                    "Sem responsável"}
                                </p>

                                <p className="text-sm text-slate-500">
                                  📅{" "}
                                  {task.dueDate ||
                                    "Sem prazo"}
                                </p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    )}

                    {
                      provided.placeholder
                    }
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

export default KanbanBoard;