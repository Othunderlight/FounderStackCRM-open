import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Task, TaskStatus } from '../types';
import { Plus, MoreHorizontal, User, Calendar, XCircle as XCircleIcon } from 'lucide-react';
import ContextMenu from './ContextMenu';
import { toast } from 'sonner';
import { format, isToday, isAfter, differenceInDays } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from '../src/i18n';

const STAGES: TaskStatus[] = ['Todo', 'In Progress', 'Done'];

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
  isPlaceholder?: boolean;
  isSuccess?: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging, isOverlay, isPlaceholder, isSuccess, onClick, onContextMenu }) => {
  const { selectedIds, selectionType, toggleSelection } = useStore();
  const isSelected = selectedIds.includes(task.id) && selectionType === 'task';

  const getDueDateStatus = (dueDate: string, status: TaskStatus) => {
    if (status === 'Done') return { color: 'text-textSecondary', pulse: false, text: null };

    const now = new Date();
    const due = new Date(dueDate);

    if (isToday(due)) {
      return { color: 'text-green-400', pulse: false, text: 'Today' };
    } else if (isAfter(now, due)) {
      return { color: 'text-red-400', pulse: true, text: 'Overdue' };
    } else {
      const daysDiff = differenceInDays(due, now);
      return {
        color: 'text-blue-400',
        pulse: false,
        text: daysDiff === 1 ? 'Tomorrow' : `In ${daysDiff} days`
      };
    }
  };

  if (isPlaceholder) {
    return (
      <div className="h-[88px] border-2 border-dashed border-accent/50 rounded-lg bg-accent/5" />
    );
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        bg-kanban-card border rounded-lg p-3 cursor-grab transition-all duration-200 relative group
        ${isSelected ? 'border-accent bg-kanban-selected' : 'border-border hover:border-textSecondary/40'}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isOverlay ? 'shadow-xl scale-105 rotate-2 cursor-grabbing border-accent' : 'hover:shadow-lg hover:-translate-y-0.5'}
        ${isSuccess ? 'ring-2 ring-green-500/60' : ''}
      `}
    >
      {isSuccess && (
        <div className="absolute inset-0 bg-green-500/20 rounded-lg animate-pulse" />
      )}
      {!isOverlay && (
        <div
          className={`absolute -top-1.5 -left-1.5 z-10 cursor-pointer transition-all duration-200
            ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100'}
          `}
          onClick={(e) => { e.stopPropagation(); toggleSelection(task.id, 'task'); }}
        >
          {isSelected ? (
            <div className="bg-accent text-white rounded-full p-0.5 shadow-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-textSecondary bg-kanban-card hover:border-textPrimary shadow-sm" />
          )}
        </div>
      )}

      <div className="flex items-start justify-between mb-2 pl-1">
        <div className="font-medium text-sm text-textPrimary pr-6 line-clamp-2">
          {task.title || <span className="text-textSecondary italic">Untitled</span>}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
            className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-card-hover opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 min-w-0">
        {task.dueDate && (() => {
          const dueDateStatus = getDueDateStatus(task.dueDate, task.status);
          return (
            <div className={`flex items-center gap-1.5 text-xs shrink-0 ${dueDateStatus.color} ${dueDateStatus.pulse ? 'animate-pulse' : ''}`}>
              <Calendar size={12} />
              <span>
                {(() => {
                  try { return format(new Date(task.dueDate), "MMM d, yyyy"); }
                  catch { return task.dueDate; }
                })()}
                {dueDateStatus.text && <span className="ml-1 opacity-75">• {dueDateStatus.text}</span>}
              </span>
            </div>
          );
        })()}
        {(task.personName || task.companyName) && <div className="flex items-center gap-1.5 text-xs text-textSecondary min-w-0"><User size={12} className="shrink-0" /><span className="truncate">{task.personName || task.companyName}</span></div>}
      </div>
      <div className="mt-2 text-[10px] text-textSecondary/60 text-left border-t border-border/30 pt-1">
        {(() => {
          try { return format(new Date(task.createdAt), "MMM d, yyyy"); }
          catch { return task.createdAt; }
        })()}
      </div>
    </div>
  );
};

interface SortableTaskCardProps {
  task: Task;
  isSuccess?: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ task, isSuccess, onClick, onContextMenu }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} isSuccess={isSuccess} onClick={onClick} onContextMenu={onContextMenu} />
    </div>
  );
};

interface ColumnProps {
  id: TaskStatus;
  tasks: Task[];
  isOver?: boolean;
  activeId?: UniqueIdentifier;
  insertPosition?: number | null;
  successId?: string | null;
  overColumn?: TaskStatus | null;
  onNewTask: () => void;
  onTaskClick: (task: Task) => void;
  onTaskContextMenu: (e: React.MouseEvent, task: Task) => void;
}

const Column: React.FC<ColumnProps> = ({ id, tasks, isOver, activeId, insertPosition, successId, overColumn, onNewTask, onTaskClick, onTaskContextMenu }) => {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({ id });

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Todo': return 'kanban-status-todo';
      case 'In Progress': return 'kanban-status-inprogress';
      case 'Done': return 'kanban-status-done';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const showRing = isDroppableOver || (tasks.length === 0 && overColumn === id);
  const showPlaceholder = isOver && activeId && insertPosition !== null && insertPosition !== undefined;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-[300px] flex flex-col h-full min-h-[600px] rounded-lg transition-all duration-200
        ${tasks.length === 0 ? 'bg-card/30 border-2 border-dashed border-border/30' : 'bg-transparent'}
        ${showRing ? 'ring-2 ring-accent/50 bg-accent/10 border-accent/50' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-3 px-1 group">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(id)}`}>{id}</span>
          <span className="text-xs text-textSecondary">{tasks.length}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onNewTask} className="p-1 hover:bg-card-hover rounded text-textSecondary hover:text-textPrimary"><Plus size={14} /></button>
          <button className="p-1 hover:bg-card-hover rounded text-textSecondary hover:text-textPrimary"><MoreHorizontal size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-[300px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px]">
            {tasks.length === 0 && isOver ? (
              <div className="flex-1 min-h-[100px] flex items-center justify-center">
                <TaskCard
                  task={{ id: '', title: '', status: id as TaskStatus, assignee: '', createdAt: '' }}
                  isPlaceholder
                  onClick={() => { }}
                  onContextMenu={() => { }}
                />
              </div>
            ) : (
              <>
                {tasks.map((task, index) => (
                  <React.Fragment key={task.id}>
                    {showPlaceholder && index === insertPosition && (
                      <TaskCard
                        task={tasks[0]}
                        isPlaceholder
                        onClick={() => { }}
                        onContextMenu={() => { }}
                      />
                    )}
                    <SortableTaskCard
                      task={task}
                      isSuccess={successId === task.id}
                      onClick={() => onTaskClick(task)}
                      onContextMenu={(e) => onTaskContextMenu(e, task)}
                    />
                  </React.Fragment>
                ))}
                {showPlaceholder && insertPosition === tasks.length && (
                  <TaskCard
                    task={tasks[0] || { id: '', title: '', status: id as TaskStatus, assignee: '', createdAt: '' }}
                    isPlaceholder
                    onClick={() => { }}
                    onContextMenu={() => { }}
                  />
                )}
              </>
            )}
          </div>
        </SortableContext>
        <button
          onClick={onNewTask}
          className="w-full py-2 text-xs text-textSecondary hover:bg-card-hover rounded flex items-center gap-2 px-2 transition-colors opacity-0 hover:opacity-100 mt-2"
        >
          <Plus size={12} /> New
        </button>
      </div>
    </div>
  );
};

const TaskKanban = () => {
  const {
    tasks, updateTask, addTask, openDrawer, deleteTasks,
    selectedIds, selectionType, toggleSelection, clearSelection, setSelection, user,
    confirm, fetchTasks, myAccess
  } = useStore();
  const { t } = useTranslation();

  const canRead = React.useMemo(() => {
    if (!myAccess) return true;
    return myAccess.permissions.includes("*") || myAccess.permissions.includes("tasks.read");
  }, [myAccess]);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, task: Task } | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setContextMenu(null); setActiveId(null); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => { if (selectionType && selectionType !== 'task') clearSelection(); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeTask = activeId ? localTasks.find(t => t.id === activeId) : null;

  const getTasksByStatus = (status: TaskStatus) => localTasks.filter(t => t.status === status);

  const getTaskStatus = (id: UniqueIdentifier): TaskStatus | null => {
    if (STAGES.includes(id as TaskStatus)) return id as TaskStatus;
    const task = localTasks.find(t => t.id === id);
    return task?.status || null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setOverId(null);
      setOverColumn(null);
      setInsertIndex(null);
      return;
    }

    // Direct match for column
    if (STAGES.includes(over.id as TaskStatus)) {
      const targetColumn = over.id as TaskStatus;
      const activeTaskLocal = localTasks.find(t => t.id === active.id);
      if (activeTaskLocal) {
        setOverColumn(targetColumn);
        setInsertIndex(getTasksByStatus(targetColumn).length);
        setOverId(over.id);
        return;
      }
    }

    if ((over.id as string).startsWith('placeholder-')) {
      const targetColumn = (over.id as string).replace('placeholder-', '') as TaskStatus;
      setOverColumn(targetColumn);
      setInsertIndex(0);
      setOverId(over.id);
      return;
    }

    const activeTaskLocal = localTasks.find(t => t.id === active.id);
    if (!activeTaskLocal) return;

    let targetColumn: TaskStatus | null = null;
    let targetIndex = 0;

    if (STAGES.includes(over.id as TaskStatus)) {
      targetColumn = over.id as TaskStatus;
      const columnTasks = getTasksByStatus(targetColumn);
      targetIndex = columnTasks.length;
    } else {
      const overTask = localTasks.find(t => t.id === over.id);
      if (overTask) {
        targetColumn = overTask.status;
        const columnTasks = getTasksByStatus(targetColumn);
        const overIndex = columnTasks.findIndex(t => t.id === over.id);
        const isAfter = over && active.rect.current.translated &&
          (active.rect.current.translated.top > over.rect.top + over.rect.height / 2);
        targetIndex = isAfter ? overIndex + 1 : overIndex;
      }
    }

    if (targetColumn && targetColumn !== activeTaskLocal.status) {
      setOverColumn(targetColumn);
      setInsertIndex(targetIndex);
      setOverId(over.id);
    } else {
      setOverColumn(targetColumn);
      setOverId(over.id);

      if (targetColumn) {
        const columnTasks = getTasksByStatus(targetColumn);
        const overIndex = columnTasks.findIndex(t => t.id === over.id);
        if (overIndex !== -1) {
          const isAfter = over && active.rect.current.translated &&
            (active.rect.current.translated.top > over.rect.top + over.rect.height / 2);
          setInsertIndex(isAfter ? overIndex + 1 : overIndex);
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    setOverColumn(null);
    setInsertIndex(null);

    if (!over) return;

    if ((over.id as string).startsWith('placeholder-')) {
      const targetStatus = (over.id as string).replace('placeholder-', '') as TaskStatus;
      const activeTaskLocal = localTasks.find(t => t.id === active.id);
      if (activeTaskLocal && targetStatus !== activeTaskLocal.status) {
        updateTask(activeTaskLocal.id, { status: targetStatus }).then(() => {
          setSuccessId(activeTaskLocal.id);
          setTimeout(() => setSuccessId(null), 500);
        });
      }
      return;
    }

    const activeTaskLocal = localTasks.find(t => t.id === active.id);
    if (!activeTaskLocal) return;

    const targetStatus = getTaskStatus(over.id) || overColumn;

    if (targetStatus && targetStatus !== activeTaskLocal.status) {
      updateTask(activeTaskLocal.id, { status: targetStatus }).then(() => {
        setSuccessId(activeTaskLocal.id);
        setTimeout(() => setSuccessId(null), 500);
      });
    }
  };

  const handleNewTask = (status: TaskStatus) => {
    const newTask: Task = {
      id: `temp-${Date.now()}`,
      title: 'Untitled',
      status: status,
      dueDate: '',
      assignee: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || 'Me',
      createdBy: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || 'Me',
      createdAt: 'Just now'
    };
    addTask(newTask).then((createdTask) => {
      if (createdTask) openDrawer({ id: createdTask.id, type: 'task' });
    });
  };

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(task.id)) setSelection([task.id], 'task');
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  };

  const handleDelete = () => {
    if (contextMenu) {
      confirm({
        title: t("confirm.deleteTasks"),
        description: t("confirm.deleteTasksConfirm").replace('{count}', String(selectedIds.length)),
        confirmText: t("confirm.delete"),
        onConfirm: async () => {
          try {
            await deleteTasks(selectedIds);
            toast.success(t("confirm.deletedTasks").replace('{count}', String(selectedIds.length)));
            clearSelection();
          } catch (error) {
            toast.error(t("confirm.deleteTasksFailed"));
          }
        }
      });
    }
  };

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-kanban-bg p-6">
        <div className="flex flex-col items-center justify-center py-20 w-full max-w-md">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <XCircleIcon size={32} className="text-red-500/60" />
          </div>
          <h3 className="text-lg font-medium text-textPrimary">
            {t("dataTable.accessDenied")}
          </h3>
          <p className="text-sm text-textSecondary/60 mt-2 text-center leading-relaxed">
            {t("dataTable.noReadPermission", { type: 'task' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full min-h-0 overflow-x-auto p-6 gap-4 bg-kanban-bg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {STAGES.map((status) => {
          const tasksInColumn = getTasksByStatus(status);
          const isOverColumn = overColumn === status || (overId && STAGES.includes(overId as TaskStatus) && overId === status);

          return (
            <Column
              key={status}
              id={status}
              tasks={tasksInColumn}
              isOver={isOverColumn}
              activeId={activeId}
              insertPosition={isOverColumn ? insertIndex : null}
              successId={successId}
              overColumn={overColumn}
              onNewTask={() => handleNewTask(status)}
              onTaskClick={(task) => openDrawer({ id: task.id, type: 'task' })}
              onTaskContextMenu={handleContextMenu}
            />
          );
        })}
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isOverlay onClick={() => { }} onContextMenu={() => { }} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onEdit={() => openDrawer({ id: contextMenu.task.id, type: 'task' })}
        />
      )}
    </div>
  );
};

export default TaskKanban;