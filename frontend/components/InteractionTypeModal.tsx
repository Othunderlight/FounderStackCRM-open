import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Search, Plus, Trash2, Edit2, Check,
    Mail, MessageSquare, Phone, Linkedin, CheckCircle, Clock,
    User, Users, Target, TrendingUp, Video, Calendar,
    Zap, BarChart, MapPin, CreditCard, Flag, Star,
    Heart, Smile, Send, Inbox, Bell, Award, Briefcase, Coffee,
    ChevronDown, SearchIcon
} from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../src/i18n';
import { cn } from '../lib/utils';
import { InteractionType } from '../types';

export const RELEVANT_ICONS = [
    { name: 'Mail', icon: Mail },
    { name: 'MessageSquare', icon: MessageSquare },
    { name: 'Phone', icon: Phone },
    { name: 'Linkedin', icon: Linkedin },
    { name: 'CheckCircle', icon: CheckCircle },
    { name: 'Clock', icon: Clock },
    { name: 'User', icon: User },
    { name: 'Users', icon: Users },
    { name: 'Target', icon: Target },
    { name: 'TrendingUp', icon: TrendingUp },
    { name: 'Video', icon: Video },
    { name: 'Calendar', icon: Calendar },
    { name: 'Zap', icon: Zap },
    { name: 'BarChart', icon: BarChart },
    { name: 'MapPin', icon: MapPin },
    { name: 'CreditCard', icon: CreditCard },
    { name: 'Flag', icon: Flag },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Smile', icon: Smile },
    { name: 'Send', icon: Send },
    { name: 'Inbox', icon: Inbox },
    { name: 'Bell', icon: Bell },
    { name: 'Award', icon: Award },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Coffee', icon: Coffee },
];

const COLORS = [
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#F472B6", // Pink
    "#F59E0B", // Amber
    "#8B5CF6", // Violet
    "#6366F1", // Indigo
    "#EF4444", // Red
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
];

interface IconPickerProps {
    selectedIcon: string;
    onSelect: (iconName: string) => void;
    color: string;
}

function IconPicker({ selectedIcon, onSelect, color }: IconPickerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredIcons = useMemo(() =>
        RELEVANT_ICONS.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [searchTerm]
    );

    const SelectedIconComp = RELEVANT_ICONS.find(i => i.name === selectedIcon)?.icon || Mail;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors relative"
                style={{ color }}
            >
                <SelectedIconComp className="w-5 h-5" />
                <div className="absolute -bottom-1 -right-1 bg-surface border border-border rounded-full p-0.5">
                    <ChevronDown className="w-2 h-2 text-text-secondary" />
                </div>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-12 left-0 w-64 bg-surface border border-border rounded-xl shadow-2xl z-[60] p-3 animate-in fade-in zoom-in duration-200">
                        <div className="relative mb-3">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search icons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {filteredIcons.map(iconObj => {
                                const IconComp = iconObj.icon;
                                return (
                                    <button
                                        key={iconObj.name}
                                        onClick={() => {
                                            onSelect(iconObj.name);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted transition-all",
                                            selectedIcon === iconObj.name && "bg-accent/10 ring-1 ring-accent/20"
                                        )}
                                        title={iconObj.name}
                                    >
                                        <IconComp className={cn("w-5 h-5", selectedIcon === iconObj.name ? "text-accent" : "text-text-secondary")} />
                                    </button>
                                );
                            })}
                            {filteredIcons.length === 0 && (
                                <div className="col-span-4 py-4 text-center text-xs text-text-secondary">No icons found</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

interface InteractionTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReopen?: () => void;
}

export function InteractionTypeModal({ isOpen, onClose, onReopen }: InteractionTypeModalProps) {
    const { 
        interactionTypes, 
        addInteractionType, 
        updateInteractionType, 
        deleteInteractionType, 
        fetchInteractionTypes, 
        myAccess,
        fetchMyAccess 
    } = useStore();
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Fetch permissions if they haven't been loaded yet when modal opens
    useEffect(() => {
        if (isOpen) {
            if (!myAccess) fetchMyAccess();
            fetchInteractionTypes();
        }
    }, [isOpen, myAccess, fetchMyAccess, fetchInteractionTypes]);

    // RBAC: Check if user has permission to manage configuration (support wildcard '*')
    const canManage = useMemo(() => {
        if (!myAccess?.permissions) return false;
        return myAccess.permissions.includes('*') || myAccess.permissions.includes('config.manage');
    }, [myAccess]);

    // Local state for the list - syncs with store but allows immediate updates
    const [localTypes, setLocalTypes] = useState<InteractionType[]>(interactionTypes);

    // Sync local types when store types change (external changes)
    useEffect(() => {
        setLocalTypes(interactionTypes);
    }, [interactionTypes]);

    // Local state for new/editing item
    const [localItem, setLocalItem] = useState({
        name: '',
        description: '',
        color: COLORS[0],
        icon: 'Mail'
    });

    // For handling delete confirm inline
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddStart = () => {
        setSaveError(null);
        setLocalItem({
            name: '',
            description: '',
            color: COLORS[localTypes.length % COLORS.length],
            icon: 'Mail'
        });
        setIsAdding(true);
        setEditingId(null);
    };

    const handleEditStart = (type: InteractionType) => {
        setSaveError(null);
        setLocalItem({
            name: type.name,
            description: type.description || '',
            color: type.color || COLORS[0],
            icon: type.icon || 'Mail'
        });
        setEditingId(type.id);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!localItem.name.trim()) return;
        setSaveError(null);

        if (editingId) {
            try {
                await updateInteractionType(editingId, localItem);
                setLocalTypes(prev => prev.map(t =>
                    t.id === editingId ? { ...t, ...localItem } : t
                ));
                setEditingId(null);
            } catch (error: any) {
                setSaveError(error.message || "Failed to update interaction type");
            }
        } else {
            try {
                await addInteractionType(localItem);
                useStore.setState({ interactionTypes: [] });
                await fetchInteractionTypes();
                setIsAdding(false);
            } catch (error: any) {
                setSaveError(error.message || "Failed to create interaction type");
            }
        }
    };

    const handleDeleteClick = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteInteractionType(deleteConfirmId);
            setLocalTypes(prev => prev.filter(t => t.id !== deleteConfirmId));
            // Force refresh
            useStore.setState({ interactionTypes: [] });
            await fetchInteractionTypes();
        } catch (error) {
            console.error("Failed to delete:", error);
        }
        setDeleteConfirmId(null);
    };

    const cycleColor = () => {
        const currentIndex = COLORS.indexOf(localItem.color);
        const nextIndex = (currentIndex + 1) % COLORS.length;
        setLocalItem(prev => ({ ...prev, color: COLORS[nextIndex] }));
    };

    const handleClose = () => {
        onClose();
    };

    const modal = (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-accent" />
                            Manage Interaction Types
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">Configure types of interactions for logs and analytics</p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Create / Edit Form */}
                    {canManage && (isAdding || editingId) && (
                        <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                                    {editingId ? 'Edit Interaction Type' : 'New Interaction Type'}
                                </h3>
                                <button
                                    onClick={() => { setIsAdding(false); setEditingId(null); setSaveError(null); }}
                                    className="text-xs text-text-secondary hover:text-text-primary"
                                >
                                    {t("common.cancel")}
                                </button>
                            </div>

                            {saveError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 flex items-start gap-2">
                                    <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-red-500">{saveError}</span>
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <div className="space-y-4">
                                    <IconPicker
                                        selectedIcon={localItem.icon}
                                        onSelect={(icon) => setLocalItem(prev => ({ ...prev, icon }))}
                                        color={localItem.color}
                                    />
                                    <button
                                        onClick={cycleColor}
                                        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-full border border-border/50" style={{ backgroundColor: localItem.color }} />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Type Name (e.g. Email Sent, Call Booked)"
                                            value={localItem.name}
                                            onChange={(e) => { setLocalItem(prev => ({ ...prev, name: e.target.value })); setSaveError(null); }}
                                            className="w-full bg-surface border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                        />
                                    </div>
                                    <div>
                                        <textarea
                                            placeholder="Description (Optional)"
                                            value={localItem.description}
                                            onChange={(e) => setLocalItem(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full bg-surface border border-border rounded-xl px-4 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={!localItem.name.trim()}
                                    className="bg-accent hover:bg-accent-dark text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-4 h-4" />
                                    {editingId ? 'Update Type' : 'Create Type'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List of Types */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary pl-1">
                                Existing Types ({localTypes.length})
                            </h3>
                            {!isAdding && !editingId && canManage && (
                                <button
                                    onClick={handleAddStart}
                                    className="text-xs font-bold text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add New
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {localTypes.map(type => {
                                const IconComp = RELEVANT_ICONS.find(i => i.name === type.icon)?.icon || Mail;
                                return (
                                    <div
                                        key={type.id}
                                        className="group bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent/30 transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50 transition-transform group-hover:scale-105"
                                                style={{ color: type.color }}
                                            >
                                                <IconComp className="w-5 h-5" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-bold text-sm truncate">{type.name}</h4>
                                                <p className="text-[10px] text-text-secondary truncate">{type.description || 'No description'}</p>
                                            </div>
                                        </div>

                                        {canManage && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(type)}
                                                    className="p-2 hover:bg-muted text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                {deleteConfirmId === type.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={handleDeleteClick}
                                                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
                                                            title="Confirm Delete"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(null)}
                                                            className="px-2 py-1 bg-muted hover:bg-muted/80 text-text-secondary text-xs rounded-lg transition-colors"
                                                            title={t("common.cancel")}
                                                        >
                                                            {t("common.cancel")}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirmId(type.id)}
                                                        className="p-2 hover:bg-muted text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {localTypes.length === 0 && (
                                <div className="col-span-2 py-12 text-center border-2 border-dashed border-border rounded-2xl">
                                    <Zap className="w-8 h-8 text-text-secondary/20 mx-auto mb-2" />
                                    <p className="text-sm text-text-secondary">No interaction types configured yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-muted/10 border-t border-border flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 border border-border rounded-xl font-bold hover:bg-muted transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
