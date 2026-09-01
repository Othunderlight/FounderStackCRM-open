import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Opportunity, OpportunityStage } from '../types';
import { Plus, MoreHorizontal, XCircle as XCircleIcon } from 'lucide-react';
import ContextMenu from './ContextMenu';
import { toast } from 'sonner';
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

const STAGES: OpportunityStage[] = ['Screening', 'Meeting', 'Proposal', 'Customer'];

interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  isOverlay?: boolean;
  isPlaceholder?: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, isDragging, isOverlay, isPlaceholder, onClick, onContextMenu }) => {
  const { selectedIds, selectionType, toggleSelection } = useStore();
  const isSelected = selectedIds.includes(opportunity.id) && selectionType === 'opportunity';

  if (isPlaceholder) {
    return (
      <div className="h-[90px] border-2 border-dashed border-accent/50 rounded-lg bg-accent/5" />
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
      `}
    >
      {!isOverlay && (
        <div
          className={`absolute -top-1.5 -left-1.5 z-10 cursor-pointer transition-all duration-200
            ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100'}
          `}
          onClick={(e) => { e.stopPropagation(); toggleSelection(opportunity.id, 'opportunity'); }}
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
        <div dir="auto" className="font-medium text-sm text-textPrimary pr-6 line-clamp-2">{opportunity.name}</div>
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
            className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-card-hover opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-textSecondary">$ {opportunity.value.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2 mt-2 min-w-0">
        <div dir="auto" className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card-hover rounded text-[10px] text-textSecondary border border-border/50 min-w-0">
          <BuildingIcon size={10} className="shrink-0" />
          <span className="truncate">{opportunity.companyName}</span>
        </div>
        <div dir="auto" className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card-hover rounded text-[10px] text-textSecondary border border-border/50 min-w-0">
          <UserIcon size={10} className="shrink-0" />
          <span className="truncate">{opportunity.contactName}</span>
        </div>
      </div>
    </div>
  );
};

interface SortableOpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const SortableOpportunityCard: React.FC<SortableOpportunityCardProps> = ({ opportunity, onClick, onContextMenu }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OpportunityCard opportunity={opportunity} isDragging={isDragging} onClick={onClick} onContextMenu={onContextMenu} />
    </div>
  );
};

interface ColumnProps {
  id: OpportunityStage;
  opportunities: Opportunity[];
  isOver?: boolean;
  activeId?: UniqueIdentifier;
  insertPosition?: number | null;
  overColumn?: OpportunityStage | null;
  onNewOpp: () => void;
  onOppClick: (opp: Opportunity) => void;
  onOppContextMenu: (e: React.MouseEvent, opp: Opportunity) => void;
}

const Column: React.FC<ColumnProps> = ({ id, opportunities, isOver, activeId, insertPosition, overColumn, onNewOpp, onOppClick, onOppContextMenu }) => {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({ id });

  const getStageTotal = (stage: OpportunityStage) => {
    return opportunities
      .reduce((acc, curr) => acc + curr.value, 0)
      .toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const getStatusColor = (stage: OpportunityStage) => {
    switch (stage) {
      case 'Screening': return 'bg-pink-900/40 text-pink-400';
      case 'Meeting': return 'bg-blue-900/40 text-blue-400';
      case 'Proposal': return 'bg-yellow-900/40 text-yellow-400';
      case 'Customer': return 'bg-green-900/40 text-green-400';
      default: return 'bg-card-hover text-textSecondary';
    }
  };

  const showRing = isDroppableOver || (opportunities.length === 0 && overColumn === id);
  const showPlaceholder = isOver && activeId && insertPosition !== null && insertPosition !== undefined;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-[280px] flex flex-col h-full min-h-[600px] rounded-lg transition-all duration-200
        ${opportunities.length === 0 ? 'bg-card/30 border-2 border-dashed border-border/30' : 'bg-transparent'}
        ${showRing ? 'ring-2 ring-accent/50 bg-accent/10 border-accent/50' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-3 px-1 group">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(id)}`}>{id}</span>
          <span className="text-xs text-textSecondary">{getStageTotal(id)}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onNewOpp} className="p-1 hover:bg-card-hover rounded text-textSecondary hover:text-textPrimary"><Plus size={14} /></button>
          <button className="p-1 hover:bg-card-hover rounded text-textSecondary hover:text-textPrimary"><MoreHorizontal size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-[300px]">
        <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px]">
            {opportunities.length === 0 && isOver ? (
              <div className="flex-1 min-h-[100px] flex items-center justify-center">
                <OpportunityCard
                  opportunity={{ id: '', name: '', value: 0, companyName: '', contactName: '', stage: id as OpportunityStage, createdAt: '' }}
                  isPlaceholder
                  onClick={() => { }}
                  onContextMenu={() => { }}
                />
              </div>
            ) : (
              <>
                {opportunities.map((opp, index) => (
                  <React.Fragment key={opp.id}>
                    {showPlaceholder && index === insertPosition && (
                      <OpportunityCard
                        opportunity={opportunities[0]}
                        isPlaceholder
                        onClick={() => { }}
                        onContextMenu={() => { }}
                      />
                    )}
                    <SortableOpportunityCard
                      opportunity={opp}
                      onClick={() => onOppClick(opp)}
                      onContextMenu={(e) => onOppContextMenu(e, opp)}
                    />
                  </React.Fragment>
                ))}
                {showPlaceholder && insertPosition === opportunities.length && (
                  <OpportunityCard
                    opportunity={opportunities[0] || { id: '', name: '', value: 0, companyName: '', contactName: '', stage: id as OpportunityStage, createdAt: '' }}
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
          onClick={onNewOpp}
          className="w-full py-2 text-xs text-textSecondary hover:bg-card-hover rounded flex items-center gap-2 px-2 transition-colors opacity-0 hover:opacity-100 mt-2"
        >
          <Plus size={12} /> New
        </button>
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const {
    opportunities, updateOpportunityStage, addOpportunity, openDrawer, deleteOpportunities,
    selectedIds, selectionType, toggleSelection, clearSelection, setSelection,
    confirm, myAccess
  } = useStore();
  const { t } = useTranslation();

  const canRead = React.useMemo(() => {
    if (!myAccess) return true;
    return myAccess.permissions.includes("*") || myAccess.permissions.includes("opportunities.read");
  }, [myAccess]);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [overColumn, setOverColumn] = useState<OpportunityStage | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setContextMenu(null); setActiveId(null); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (selectionType && selectionType !== 'opportunity') clearSelection();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeOpportunity = activeId ? opportunities.find(o => o.id === activeId) : null;

  const getOppsByStage = (stage: OpportunityStage) => opportunities.filter(o => o.stage === stage);

  const getOppStage = (id: UniqueIdentifier): OpportunityStage | null => {
    if (STAGES.includes(id as OpportunityStage)) return id as OpportunityStage;
    const opp = opportunities.find(o => o.id === id);
    return opp?.stage || null;
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
    if (STAGES.includes(over.id as OpportunityStage)) {
      const targetColumn = over.id as OpportunityStage;
      if (activeOpportunity) {
        setOverColumn(targetColumn);
        setInsertIndex(getOppsByStage(targetColumn).length);
        setOverId(over.id);
        return;
      }
    }

    if ((over.id as string).startsWith('placeholder-')) {
      const targetColumn = (over.id as string).replace('placeholder-', '') as OpportunityStage;
      setOverColumn(targetColumn);
      setInsertIndex(0);
      setOverId(over.id);
      return;
    }

    const activeOpp = opportunities.find(o => o.id === active.id);
    if (!activeOpp) return;

    let targetColumn: OpportunityStage | null = null;
    let targetIndex = 0;

    if (STAGES.includes(over.id as OpportunityStage)) {
      targetColumn = over.id as OpportunityStage;
      const columnOpps = getOppsByStage(targetColumn);
      targetIndex = columnOpps.length;
    } else {
      const overOpp = opportunities.find(o => o.id === over.id);
      if (overOpp) {
        targetColumn = overOpp.stage;
        const columnOpps = getOppsByStage(targetColumn);
        const overIndex = columnOpps.findIndex(o => o.id === over.id);
        const isAfter = over && active.rect.current.translated &&
          (active.rect.current.translated.top > over.rect.top + over.rect.height / 2);
        targetIndex = isAfter ? overIndex + 1 : overIndex;
      }
    }

    if (targetColumn && targetColumn !== activeOpp.stage) {
      setOverColumn(targetColumn);
      setInsertIndex(targetIndex);
      setOverId(over.id);
    } else {
      setOverColumn(targetColumn);
      setOverId(over.id);

      if (targetColumn) {
        const columnOpps = getOppsByStage(targetColumn);
        const overIndex = columnOpps.findIndex(o => o.id === over.id);
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
      const targetStage = (over.id as string).replace('placeholder-', '') as OpportunityStage;
      const activeOpp = opportunities.find(o => o.id === active.id);
      if (activeOpp && targetStage !== activeOpp.stage) {
        updateOpportunityStage(activeOpp.id, targetStage);
      }
      return;
    }

    const activeOpp = opportunities.find(o => o.id === active.id);
    if (!activeOpp) return;

    const targetStage = getOppStage(over.id) || overColumn;

    if (targetStage && targetStage !== activeOpp.stage) {
      updateOpportunityStage(activeOpp.id, targetStage);
    }
  };

  const handleNewOpp = (stage: OpportunityStage) => {
    const newOpp: Opportunity = {
      id: Math.random().toString(),
      name: 'New Deal',
      value: 1000,
      companyName: 'Pending',
      contactName: 'Unknown',
      stage: stage,
      createdAt: 'Just now'
    };
    addOpportunity(newOpp).then((createdOpp) => {
      if (createdOpp) openDrawer({ id: createdOpp.id, type: 'opportunity' });
    });
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(id)) setSelection([id], 'opportunity');
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleDelete = () => {
    if (contextMenu) {
      confirm({
        title: t("confirm.deleteOpportunities"),
        description: t("confirm.deleteOpportunitiesConfirm").replace('{count}', String(selectedIds.length)),
        confirmText: t("confirm.delete"),
        onConfirm: async () => {
          try {
            await deleteOpportunities(selectedIds);
            toast.success(t("confirm.deletedOpportunities").replace('{count}', String(selectedIds.length)));
            clearSelection();
          } catch (error) {
            toast.error(t("confirm.deleteOpportunitiesFailed"));
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
            {t("dataTable.noReadPermission", { type: 'opportunity' })}
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
        {STAGES.map((stage) => {
          const oppsInColumn = getOppsByStage(stage);
          const isOverColumn = overColumn === stage || (overId && STAGES.includes(overId as OpportunityStage) && overId === stage);

          return (
            <Column
              key={stage}
              id={stage}
              opportunities={oppsInColumn}
              isOver={isOverColumn}
              activeId={activeId}
              insertPosition={isOverColumn ? insertIndex : null}
              overColumn={overColumn}
              onNewOpp={() => handleNewOpp(stage)}
              onOppClick={(opp) => openDrawer({ id: opp.id, type: 'opportunity' })}
              onOppContextMenu={handleContextMenu}
            />
          );
        })}
        <DragOverlay>
          {activeOpportunity ? (
            <OpportunityCard opportunity={activeOpportunity} isOverlay onClick={() => { }} onContextMenu={() => { }} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onEdit={() => openDrawer({ id: contextMenu.id, type: 'opportunity' })}
        />
      )}
    </div>
  );
};

const BuildingIcon = ({ size, className }: { size: number; className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>;
const UserIcon = ({ size, className }: { size: number; className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

export default KanbanBoard;