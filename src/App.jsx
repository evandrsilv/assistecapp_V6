import { supabase } from './supabaseClient';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Plus, Search, LayoutDashboard, Calendar as CalendarIcon, CheckSquare,
    Edit2, Trash2, Clock, Users, ListChecks, Grid,
    X, Sparkles, Loader2, User, Activity, FileText, Hash, Package, Tag, Briefcase, Phone, Mail, Layers,
    ChevronLeft, ChevronRight, ChevronDown, MapPin, Factory, AlertCircle, Info,
    LogIn, Download, Bell, LogOut, History, Paperclip, Image, Film, Music, File,
    UserPlus, Lock, Unlock, Map as MapIcon, Check, Building2, RefreshCw, FolderOpen, Filter, Settings, Plane,
    LayoutGrid, LayoutList, StickyNote, Eye, EyeOff, PanelRight, PanelLeft, PanelBottom, Square, Printer, Menu, Calendar, Mic, DollarSign
} from 'lucide-react';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import ClientReport from './components/ClientReport';
import ClientManager from './components/ClientManager';
import ReportsView from './components/ReportsView';
import ReportEditor from './components/ReportEditor';
import TaskReport from './components/TaskReport';
import PoliView from './components/PoliView';
import PoliPanel from './components/PoliPanel';
import UserAvatar from './components/UserAvatar';
import { convertFileToBase64, generateId } from './utils/helpers';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import TaskModal from './components/TaskModal';
import {
    TaskStatus, Priority, Category, CategoryLabels, STAGES_BY_CATEGORY,
    StatusLabels, StatusColors, PriorityColors, StageStatusLabels,
    INITIAL_NATIVE_CATEGORIES
} from './constants/taskConstants';

// --- THEMES ---

const THEMES = {
    DEFAULT: {
        name: 'Clássico',
        bg: '#dae2ed',
        sidebar: 'bg-white',
        card: 'bg-white border-slate-200',
        header: 'bg-white/60 backdrop-blur-md border-slate-200',
        text: 'text-slate-700',
        subtext: 'text-slate-400',
        border: 'border-slate-200'
    },
    MIDNIGHT: {
        name: 'Midnight',
        bg: '#0f172a',
        sidebar: 'bg-slate-900 border-r border-white/10 text-white',
        card: 'bg-slate-800/80 border-white/10 text-slate-100',
        header: 'bg-slate-900/80 backdrop-blur-xl border-white/10',
        text: 'text-white',
        subtext: 'text-slate-400',
        border: 'border-white/10'
    },
    CUSTOM: {
        name: 'Personalizado',
        bg: 'var(--app-bg)',
        sidebar: 'bg-white/40 backdrop-blur-2xl border-white/30',
        card: 'bg-white/60 backdrop-blur-lg border-white/40 shadow-xl shadow-black/5',
        header: 'bg-white/30 backdrop-blur-3xl border-white/40',
        text: 'text-slate-800',
        subtext: 'text-slate-500',
        border: 'border-white/30'
    }
};

// --- COMPONENTES ---


// 0.1 Profile Modal
const ProfileModal = ({ isOpen, onClose, currentUser, onUpdate }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#64748b');
    const [appBg, setAppBg] = useState('#e2e8f0');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [themeStyle, setThemeStyle] = useState('DEFAULT'); // DEFAULT, MIDNIGHT, GLASS
    const [poliInteraction, setPoliInteraction] = useState('MEDIUM');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser) {
            setName(currentUser.username);
            setColor(currentUser.color || '#64748b');
            setAppBg(currentUser.app_bg || '#e2e8f0');
            setAvatarUrl(currentUser.avatar_url || '');
            setThemeStyle(currentUser.theme_style || 'DEFAULT');
            setPoliInteraction(currentUser.poli_interaction || 'MEDIUM');
        }
    }, [isOpen, currentUser]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate({
                username: name,
                color,
                app_bg: appBg,
                avatar_url: avatarUrl,
                theme_style: themeStyle,
                poli_interaction: poliInteraction
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Editar Perfil</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-center mb-6">
                        <UserAvatar user={{ username: name, color, avatar_url: avatarUrl }} size={80} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Exibição</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-brand-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Foto de Perfil</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        try {
                                            const b64 = await convertFileToBase64(file);
                                            setAvatarUrl(b64);
                                        } catch (err) {
                                            alert('Erro ao carregar imagem');
                                        }
                                    }
                                }}
                                className="hidden"
                                id="avatar-upload"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-all text-sm font-medium text-slate-600"
                            >
                                <Paperclip size={18} />
                                <span>Anexar Imagem</span>
                            </label>
                            {avatarUrl && (
                                <button
                                    type="button"
                                    onClick={() => setAvatarUrl('')}
                                    className="p-2 text-red-500 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Carregue uma imagem do seu computador para o avatar.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Estilo Visual (Tema)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'DEFAULT', label: 'Clássico', icon: Sparkles },
                                { id: 'MIDNIGHT', label: 'Midnight', icon: Lock },
                                { id: 'CUSTOM', label: 'Personalizado', icon: Layers }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setThemeStyle(t.id)}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${themeStyle === t.id ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                                >
                                    <t.icon size={16} className={themeStyle === t.id ? 'text-brand-600' : 'text-slate-400'} />
                                    <span className={`text-[10px] font-bold ${themeStyle === t.id ? 'text-brand-700' : 'text-slate-500'}`}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Cor do Avatar</label>
                        <div className="flex gap-2 flex-wrap">
                            {['#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'} transition-all`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full mt-2 h-8 cursor-pointer" />
                    </div>
                    {themeStyle === 'CUSTOM' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 border-t pt-4">Cor de Fundo do App</label>
                            <div className="flex gap-2 flex-wrap mb-2">
                                {['#e2e8f0', '#f1f5f9', '#f8fafc', '#d1d5db', '#1e293b', '#0f172a', '#111827', '#000000'].map(bg => (
                                    <button
                                        key={bg}
                                        type="button"
                                        onClick={() => setAppBg(bg)}
                                        className={`w-8 h-8 rounded-lg border-2 ${appBg === bg ? 'border-brand-500 scale-110 shadow-md' : 'border-slate-200 hover:border-slate-300'} transition-all`}
                                        style={{ backgroundColor: bg }}
                                        title={bg}
                                    />
                                ))}
                            </div>
                            <input type="color" value={appBg} onChange={(e) => setAppBg(e.target.value)} className="w-full h-8 cursor-pointer rounded border border-slate-200" />
                        </div>
                    )}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Sparkles size={16} className="text-brand-600" />
                            Interação da POLI
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'DISABLED', label: 'Desativada' },
                                { id: 'LOW', label: 'Mínima' },
                                { id: 'MEDIUM', label: 'Normal' },
                                { id: 'HIGH', label: 'Aumentada' }
                            ].map(lv => (
                                <button
                                    key={lv.id}
                                    type="button"
                                    onClick={() => setPoliInteraction(lv.id)}
                                    className={`py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all ${poliInteraction === lv.id
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                        }`}
                                >
                                    {lv.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            Define o quanto a POLI deve interagir e sugerir durante o uso do app.
                        </p>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <LayoutDashboard size={16} className="text-brand-600" />
                            Layout do Menu
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => onUpdate({ username: name, color, app_bg: appBg, avatar_url: avatarUrl, theme_style: themeStyle, poli_interaction: poliInteraction, layout_mode: 'VERTICAL' })}
                                className={`py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${currentUser.layout_mode !== 'HORIZONTAL'
                                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                    }`}
                            >
                                <PanelLeft size={14} /> Vertical
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdate({ username: name, color, app_bg: appBg, avatar_url: avatarUrl, theme_style: themeStyle, poli_interaction: poliInteraction, layout_mode: 'HORIZONTAL' })}
                                className={`py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${currentUser.layout_mode === 'HORIZONTAL'
                                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                    }`}
                            >
                                <PanelBottom size={14} className="rotate-180" /> Horizontal
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Salvar Alterações
                    </button>
                </form>
            </div>
        </div>
    );
};

// 1. Settings Modal
const SettingsModal = ({ isOpen, onClose, customCategories, onSaveCategories, tasks }) => {
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('LIST');
    const [editingId, setEditingId] = useState(null);

    const [editLabel, setEditLabel] = useState('');
    const [editFields, setEditFields] = useState({ op: true, pedido: true, item: true, rnc: false, visitation: true, deadlineMode: 'PRIORITY' });
    const [editStages, setEditStages] = useState([]);
    const [newStageName, setNewStageName] = useState('');

    useEffect(() => {
        if (isOpen) setCategories(JSON.parse(JSON.stringify(customCategories)));
    }, [isOpen, customCategories]);

    if (!isOpen) return null;

    const handleEdit = (cat) => {
        if (cat.isNative) return;
        setEditingId(cat.id);
        setEditLabel(cat.label);
        setEditFields({ ...cat.fields });
        setEditStages([...cat.stages]);
        setActiveTab('EDIT');
    };

    const handleCreate = () => {
        const newId = crypto.randomUUID();
        setEditingId(newId);
        setEditLabel('Nova Categoria');
        setEditFields({ op: true, pedido: true, item: true, rnc: false, visitation: true, deadlineMode: 'PRIORITY' });
        setEditStages([]);
        setActiveTab('EDIT');
    };

    const handleDelete = (id) => {
        const categoryToDelete = categories.find(c => c.id === id);
        if (!categoryToDelete) return;

        // Check for usage in ANY tasks (active or done)
        const isUsed = tasks.some(t => t.category === categoryToDelete.label);

        if (isUsed) {
            alert('Não é possível excluir este tipo de tarefa pois existem tarefas (em andamento ou finalizadas) associadas a ele.');
            return;
        }

        if (confirm('Tem certeza que deseja excluir este tipo de tarefa?')) {
            const newCats = categories.filter(c => c.id !== id);
            setCategories(newCats);
            onSaveCategories(newCats);
        }
    };

    const saveCurrentEdit = () => {
        if (!editingId) return;
        const newConfig = { id: editingId, label: editLabel, isNative: false, fields: editFields, stages: editStages };
        let newCategories = [...categories];
        const index = newCategories.findIndex(c => c.id === editingId);
        if (index >= 0) newCategories[index] = newConfig;
        else newCategories.push(newConfig);

        setCategories(newCategories);
        onSaveCategories(newCategories);
        setActiveTab('LIST');
        setEditingId(null);
    };

    const addStage = () => {
        if (newStageName.trim()) { setEditStages([...editStages, newStageName.trim()]); setNewStageName(''); }
    };

    const removeStage = (idx) => setEditStages(editStages.filter((_, i) => i !== idx));
    const moveStage = (idx, direction) => {
        if (idx + direction < 0 || idx + direction >= editStages.length) return;
        const newStages = [...editStages];
        const temp = newStages[idx];
        newStages[idx] = newStages[idx + direction];
        newStages[idx + direction] = temp;
        setEditStages(newStages);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2"><Settings className="text-brand-600" /><h2 className="text-xl font-bold text-slate-800">Gerenciar Tipos de Tarefa</h2></div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {activeTab === 'LIST' ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800 mb-6"><p>Crie novos tipos de tarefas personalizados com campos e etapas específicas.</p></div>
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <div key={cat.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div><h3 className="font-bold text-slate-800">{cat.label}</h3><p className="text-xs text-slate-500">{cat.isNative ? 'PadrÃ£o do Sistema' : `${cat.stages.length} etapas definidas`}</p></div>
                                        <div className="flex gap-2">{cat.isNative ? (<span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">Nativo</span>) : (<><button onClick={() => handleEdit(cat)} className="px-3 py-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-medium">Editar</button><button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></>)}</div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleCreate} className="w-full py-3 mt-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-brand-500 hover:text-brand-600 font-medium flex items-center justify-center gap-2 transition-colors"><Plus size={20} /> Criar Novo Tipo Personalizado</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome</label>
                                <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: Manutenção" />
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Campos</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editFields.op} onChange={(e) => setEditFields({ ...editFields, op: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" /><span className="text-sm text-slate-700">Campo OP</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editFields.pedido} onChange={(e) => setEditFields({ ...editFields, pedido: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" /><span className="text-sm text-slate-700">Campo Pedido</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editFields.item} onChange={(e) => setEditFields({ ...editFields, item: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" /><span className="text-sm text-slate-700">Campo Item</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editFields.rnc} onChange={(e) => setEditFields({ ...editFields, rnc: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" /><span className="text-sm text-slate-700">Campo RNC</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editFields.visitation} onChange={(e) => setEditFields({ ...editFields, visitation: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" /><span className="text-sm text-slate-700">Agendamento de Visita</span></label>
                                </div>
                                <div className="mt-4"><label className="block text-sm font-bold text-slate-700 mb-1">Modo de Prazo</label><select value={editFields.deadlineMode} onChange={(e) => setEditFields({ ...editFields, deadlineMode: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md"><option value="PRIORITY">Prioridade + Data</option><option value="DATE">Apenas Data</option></select></div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Etapas</h3>
                                <div className="space-y-2 mb-4">
                                    {editStages.map((stage, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                                            <div className="flex flex-col gap-0.5 text-slate-400"><button onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="hover:text-brand-600 disabled:opacity-30">â–²</button><button onClick={() => moveStage(idx, 1)} disabled={idx === editStages.length - 1} className="hover:text-brand-600 disabled:opacity-30">â–¼</button></div>
                                            <span className="flex-1 font-medium text-slate-700">{stage}</span>
                                            <button onClick={() => removeStage(idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2"><input type="text" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStage())} placeholder="Nova etapa..." className="flex-1 px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-brand-500" /><button onClick={addStage} className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700">Adicionar</button></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4"><button onClick={() => setActiveTab('LIST')} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancelar</button><button onClick={saveCurrentEdit} className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg flex items-center gap-2"><Check size={18} /> Salvar Tipo</button></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// 3. Task Card
const StatusBgColors = {
    [TaskStatus.TO_START]: 'bg-slate-100 border-slate-300',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 border-blue-300',
    [TaskStatus.WAITING_CLIENT]: 'bg-amber-100 border-amber-300',
    [TaskStatus.CANCELED]: 'bg-red-100 border-red-300',
    [TaskStatus.DONE]: 'bg-emerald-100 border-emerald-300',

};

const TaskCard = ({ task, onEdit, onDelete, users, currentUser }) => {
    // Nova lÃ³gica de permissÃ£o: 
    // - Tarefas PÃšBLICAS: Todos podem editar/arrastar.
    // - Tarefas PRIVADAS: Somente criador ou atribuÃ­dos podem editar/arrastar.
    const canEdit = useMemo(() => {
        if (!currentUser) return false;
        if (task.visibility === 'PUBLIC') return true;
        if (task.user_id === currentUser.id) return true;
        if (task.assigned_users && task.assigned_users.includes(currentUser.id)) return true;
        return false;
    }, [task, currentUser]);

    const handleDragStart = (e) => {
        if (!canEdit) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const dateStr = task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== TaskStatus.DONE;
    const activeStagesCount = task.stages ? Object.values(task.stages).filter((s) => s?.active).length : 0;
    const completedStagesCount = task.stages ? Object.values(task.stages).filter(s => ['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status)).length : 0;
    const progressPct = activeStagesCount > 0 ? Math.round((completedStagesCount / activeStagesCount) * 100) : 0;

    const themeStyle = currentUser?.theme_style || 'DEFAULT';

    return (
        <div
            draggable={canEdit}
            onDragStart={handleDragStart}
            className={`${themeStyle === 'MIDNIGHT' ? 'bg-slate-800/90 border-white/10' : 'bg-white border-slate-200'} p-3 rounded-xl shadow-sm border hover:shadow-md transition-all group relative animate-slide flex flex-col cursor-pointer card-hover`}
            onClick={() => onEdit(task)}
        >
            <div className="flex justify-between items-start mb-1.5">
                <div className="flex gap-1 items-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${PriorityColors[task.priority]}`}>
                        {task.priority === Priority.LOW ? 'Baixa' : task.priority === Priority.MEDIUM ? 'Média' : 'Alta'}
                    </span>
                    {task.visibility === 'PRIVATE' && <Lock size={10} className="text-amber-500" title="Privada" />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={12} /></button>
                </div>
            </div>

            <h3 className={`font-bold ${themeStyle === 'MIDNIGHT' ? 'text-white' : 'text-slate-800'} mb-1 leading-tight text-xs break-words`}>
                {task.client && task.client !== task.title && (
                    <span className={`${themeStyle === 'MIDNIGHT' ? 'text-slate-400' : 'text-slate-600'} block text-[10px] uppercase tracking-wide opacity-75`}>{task.client}</span>
                )}
                {task.title}
            </h3>
            {task.description && <p className={`${themeStyle === 'MIDNIGHT' ? 'text-slate-400' : 'text-slate-500'} text-[10px] mb-2 line-clamp-1 leading-relaxed`}>{task.description}</p>}

            <div className="mt-auto space-y-1.5">
                <div className={`flex items-center justify-between text-[10px] pt-1.5 border-t ${themeStyle === 'MIDNIGHT' ? 'border-white/10' : 'border-slate-200/50'}`}>
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : themeStyle === 'MIDNIGHT' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {dateStr ? <><Calendar size={10} /><span>{dateStr}</span></> : null}
                    </div>
                    {/* Assignees Avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                        {users && task.assigned_users && task.assigned_users.map(uId => {
                            const u = users.find(user => user.id === uId);
                            if (!u) return null;
                            return <UserAvatar key={uId} user={u} size={16} />;
                        })}
                    </div>
                </div >
                {activeStagesCount > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500">{progressPct}%</span>
                    </div>
                )}
            </div >
            {/* Corner Fold Effect */}
            < div className="absolute top-0 right-0 w-3 h-3 bg-slate-100 rounded-bl-lg opacity-50 group-hover:opacity-100 transition-opacity" ></div >
        </div >
    );
};

// 4. Notes Panel
const NotesPanel = ({ isOpen, onClose, notes, onSave, onDelete, currentUser, horizontal = false }) => {
    const [content, setContent] = useState('');
    const [date, setDate] = useState('');
    const [isPublic, setIsPublic] = useState(true); // Public by default
    const [priority, setPriority] = useState('LOW');
    const [loading, setLoading] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' or 'MY'
    const [showToday, setShowToday] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const todayStr = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    useEffect(() => {
        if (editingNote) {
            setContent(editingNote.content);
            setDate(editingNote.note_date || '');
            setIsPublic(editingNote.is_public);
            setPriority(editingNote.priority || 'LOW');
            setIsFormOpen(true);
        } else {
            setContent('');
            setDate('');
            setIsPublic(true); // Public by default so all users can see
            setPriority('LOW');
            // Don't auto-close form when cancelling edit, to allow adding new note easily if needed
        }
    }, [editingNote]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            const payload = {
                content,
                note_date: date || null,
                is_public: isPublic,
                priority
            };
            if (editingNote) payload.id = editingNote.id;

            await onSave(payload);
            setEditingNote(null);
            setContent('');
            setDate('');
            setIsPublic(false);
            setPriority('LOW');
            setIsFormOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotes = useMemo(() => {
        let list = [...notes];
        if (filterMode === 'MY') {
            list = list.filter(n => n.user_id === currentUser.id);
        }
        if (showToday) {
            list = list.filter(n => {
                // Notes with dates: show only if date matches today
                if (n.note_date) {
                    return n.note_date === todayStr;
                }
                // Notes without dates: always show (they're treated as current day)
                return true;
            });
        }
        return list;
    }, [notes, filterMode, showToday, currentUser, todayStr]);

    const priorityColors = {
        LOW: 'bg-sky-100 border-sky-200 shadow-sky-100/30',
        MEDIUM: 'bg-amber-100 border-amber-300 shadow-amber-100/30',
        HIGH: 'bg-rose-100 border-rose-300 shadow-rose-100/30'
    };

    if (!isOpen) return null;

    return (
        <div className={`
            ${horizontal ? 'w-full' : 'w-[280px] md:w-80'} 
            h-full max-h-full bg-white md:rounded-xl border border-slate-200 flex flex-col shadow-sm
            fixed inset-0 z-[100] md:relative md:z-auto md:inset-auto
            animate-in slide-in-from-right duration-300 overflow-hidden
        `}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <StickyNote size={18} className="text-brand-500" /> Notas e Lembretes
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 ${horizontal ? 'space-y-4 md:space-y-0 flex flex-col md:flex-row gap-4' : 'space-y-4'}`}>
                {/* Left side in horizontal, or top in vertical */}
                <div className={`${horizontal ? 'w-full md:w-72 shrink-0 space-y-4' : 'space-y-4'}`}>
                    {/* Filters */}
                    <div className="flex flex-col gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/50">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFilterMode('ALL')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${filterMode === 'ALL' ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                Todas Públicas
                            </button>
                            <button
                                onClick={() => setFilterMode('MY')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${filterMode === 'MY' ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                Minhas Notas
                            </button>
                        </div>
                        <button
                            onClick={() => setShowToday(!showToday)}
                            className={`w-full py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${showToday ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                        >
                            <CalendarIcon size={12} /> {showToday ? 'Mostrando Hoje' : 'Filtrar por Hoje'}
                        </button>
                    </div>

                    {/* New Note Toggle - Cleaner & Smaller */}
                    {!isFormOpen && !editingNote && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50/50 transition-all flex items-center justify-center gap-2 group bg-white/50"
                        >
                            <Plus size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-tight">Nova Anotação</span>
                        </button>
                    )}

                    {isFormOpen && (
                        <form onSubmit={handleSubmit} className="space-y-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{editingNote ? 'Editar Nota' : 'Nova Nota'}</span>
                                <button type="button" onClick={() => { setEditingNote(null); setIsFormOpen(false); }} className="text-slate-400 hover:text-red-500 p-1"><X size={14} /></button>
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Escreva um lembrete..."
                                className="w-full h-24 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none bg-slate-50/50 font-medium placeholder:text-slate-400"
                                required
                            />
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold bg-slate-50/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${isPublic ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    >
                                        {isPublic ? <Users size={14} /> : <Lock size={14} />}
                                        {isPublic ? 'Público' : 'Privado'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={`py-1.5 text-[9px] font-black rounded-lg uppercase transition-all border ${priority === p ? (p === 'HIGH' ? 'bg-rose-600 border-rose-700 text-white shadow-md' : p === 'MEDIUM' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-700 border-slate-800 text-white shadow-md') : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            {p === 'LOW' ? 'Baixa' : p === 'MEDIUM' ? 'Média' : 'Alta'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-black py-2.5 rounded-xl text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 uppercase tracking-widest ${editingNote ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'}`}
                            >
                                {loading ? 'Salvando...' : editingNote ? 'Salvar Alterações' : 'Criar Agora'}
                            </button>
                        </form>
                    )}
                </div>

                <div className={`flex-1 py-1 ${horizontal ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 content-start' : 'space-y-3'}`}>
                    {filteredNotes.map(note => (
                        <div key={note.id} className={`p-4 rounded-2xl border-2 group relative transition-all shadow-md h-fit ${priorityColors[note.priority || 'LOW']}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tighter ${note.priority === 'HIGH' ? 'text-rose-800' : note.priority === 'MEDIUM' ? 'text-orange-900' : 'text-slate-500'}`}>
                                    {note.is_public ? <Users size={12} className="opacity-70" /> : <Lock size={12} className="opacity-70" />}
                                    {note.note_date ? new Date(note.note_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}
                                </span>
                                {note.user_id === currentUser.id && (
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                        <button onClick={() => setEditingNote(note)} className="p-1.5 bg-white/50 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-white transition-all shadow-sm border border-slate-200" title="Editar"><Edit2 size={12} /></button>
                                        <button onClick={() => onDelete(note.id)} className="p-1.5 bg-white/50 rounded-lg text-slate-700 hover:text-red-600 hover:bg-white transition-all shadow-sm border border-slate-200" title="Excluir"><Trash2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                            <p className={`text-xs whitespace-pre-wrap leading-relaxed font-bold break-words line-clamp-3 text-ellipsis overflow-hidden ${note.priority === 'HIGH' ? 'text-rose-950' : note.priority === 'MEDIUM' ? 'text-orange-950' : 'text-slate-800'}`}>{note.content}</p>
                            {note.user_id !== currentUser.id && (
                                <div className="mt-3 pt-2.5 border-t border-black/5 text-[10px] text-slate-600 font-bold flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-[8px] border border-brand-200">
                                        {note.users?.username?.[0].toUpperCase()}
                                    </div>
                                    <span className="italic">@{note.users?.username || 'Usuário'}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredNotes.length === 0 && (
                        <div className={`text-center py-10 opacity-40 ${horizontal ? 'col-span-full' : ''}`}>
                            <StickyNote size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs text-slate-500 italic">Nenhuma nota encontrada</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 5. Calendar View

// 5. Activity Log
const LogActionLabels = {
    'TAREFA_CRIADA': 'Tarefa Criada',
    'TAREFA_ATUALIZADA': 'Tarefa Atualizada',
    'TAREFA_EXCLUIDA': 'Tarefa Excluída',
    'TAREFA_REABERTA': 'Tarefa Reaberta',
    'COMENTARIO_ADICIONADO': 'Comentário Adicionado',
    'ANEXO_ADICIONADO': 'Anexo Adicionado',
    'ANEXO_REMOVIDO': 'Anexo Removido',
    'VIAGEM_ADICIONADA': 'Viagem Adicionada',
    'ETAPA_ATUALIZADA': 'Etapa Atualizada',
    'MOVIMENTAÇÃO_TAREFAS': 'Movimentação de Tarefas',
    'STATUS_ALTERADO': 'Status Alterado',
    'NOTA_CRIADA': 'Nota Criada',
    'NOTA_ATUALIZADA': 'Nota Atualizada',
    'NOTA_EXCLUIDA': 'Nota Excluída',
    'CLIENTE_ATUALIZADO': 'Cliente Atualizado'
};

const ActivityLogView = ({ logs, users }) => {
    const [filterUser, setFilterUser] = useState('');

    // Create a map for quick user lookup: id -> username
    const userMap = useMemo(() => {
        return users.reduce((acc, u) => ({ ...acc, [u.id]: u.username }), {});
    }, [users]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (filterUser && log.user_id !== filterUser) return false;
            return true;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [logs, filterUser]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-100 p-2 rounded-lg text-brand-600"><History size={20} /></div>
                    <div><h2 className="text-lg font-bold text-slate-800">Atividades</h2><p className="text-xs text-slate-500">Histórico de alterações</p></div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-brand-500 text-slate-600"
                    >
                        <option value="">Todos Usuários</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                        <History size={48} className="mb-2 opacity-20" />
                        <p>Nenhuma atividade registrada.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredLogs.map(log => {
                            const userName = userMap[log.user_id] || 'Desconhecido';
                            const userInitial = userName.charAt(0).toUpperCase();

                            return (
                                <div key={log.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0" title={userName}>
                                        {userInitial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">{LogActionLabels[log.action] || log.action}</p>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{userName}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-snug mt-1">{log.details}</p>
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <div className="mt-1 text-[10px] text-slate-400 font-mono bg-slate-100 p-1 rounded inline-block">
                                                {JSON.stringify(log.metadata)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// 6. Client History
const ClientHistoryView = ({ tasks, onOpenClientReport, users, currentUser, onEditTask, selectedClient, setSelectedClient }) => {
    // const [selectedClient, setSelectedClient] = useState(null); // State lifted to App
    const [searchTerm, setSearchTerm] = useState('');
    const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);

    // Filters
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterVisitation, setFilterVisitation] = useState('ALL'); // ALL, YES, NO

    const clients = useMemo(() => {
        const unique = Array.from(new Set(tasks.filter(t => t.client).map(t => t.client)));
        // Case-insensitive sorting
        return unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [tasks]);

    const filteredClients = clients.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

    const clientTasks = useMemo(() => {
        if (!selectedClient) return [];
        let list = tasks.filter(t => t.client === selectedClient);

        // Apps Filters
        if (filterCategory) list = list.filter(t => t.category === filterCategory);

        if (filterVisitation !== 'ALL') {
            const isRequired = filterVisitation === 'YES';
            list = list.filter(t => (t.visitation && t.visitation.required) === isRequired);
        }

        if (filterMonth) {
            list = list.filter(t => {
                if (!t.createdAt) return false;
                const d = new Date(t.createdAt);
                return (d.getMonth() + 1) === parseInt(filterMonth);
            });
        }

        if (filterYear) {
            list = list.filter(t => {
                if (!t.createdAt) return false;
                const d = new Date(t.createdAt);
                return d.getFullYear() === parseInt(filterYear);
            });
        }

        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [tasks, selectedClient, filterCategory, filterVisitation, filterMonth, filterYear]);

    const handlePrint = () => {
        if (!onOpenClientReport) {
            console.error('onOpenClientReport prop is missing');
            return;
        }
        onOpenClientReport({
            clientName: selectedClient,
            tasks: clientTasks,
            filters: {
                category: filterCategory,
                month: filterMonth,
                year: filterYear,
                visitation: filterVisitation
            }
        });
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i); // Last 5 years + current
    const months = [
        { val: 1, label: 'Janeiro' }, { val: 2, label: 'Fevereiro' }, { val: 3, label: 'Março' },
        { val: 4, label: 'Abril' }, { val: 5, label: 'Maio' }, { val: 6, label: 'Junho' },
        { val: 7, label: 'Julho' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Setembro' },
        { val: 10, label: 'Outubro' }, { val: 11, label: 'Novembro' }, { val: 12, label: 'Dezembro' }
    ];

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <ClientManager
                isOpen={isClientManagerOpen}
                onClose={() => setIsClientManagerOpen(false)}
                currentUser={currentUser}
            />
            {/* Sidebar List - Hidden on Print */}
            <div className={`w-full md:w-1/3 min-w-[280px] border-r border-slate-200 bg-slate-50 flex flex-col print:hidden ${selectedClient ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Briefcase size={20} className="text-brand-600" /> Carteira</h2>
                    <button
                        onClick={() => setIsClientManagerOpen(true)}
                        className="bg-brand-50 text-brand-600 p-2 rounded-lg hover:bg-brand-100 transition-colors"
                        title="Gerenciar Clientes"
                    >
                        <Settings size={18} />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredClients.map(client => (
                        <button key={client} onClick={() => { setSelectedClient(client); }} className={`w-full text-left p-4 flex justify-between items-center ${selectedClient === client ? 'bg-white border-l-4 border-l-brand-600 shadow-sm' : 'border-l-4 border-transparent hover:bg-white'}`}>
                            <span className="font-medium text-slate-700">{client}</span>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{tasks.filter(t => t.client === client).length}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 ${!selectedClient ? 'hidden md:flex' : 'flex'}`} id="client-print-area">
                {!selectedClient ? <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden"><FolderOpen size={48} className="mb-4" /><p>Selecione um cliente para ver o histórico</p></div> :
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header & Filters */}
                        <div className="p-6 pb-2 print:p-0">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 md:mb-1 md:hidden">
                                        <button onClick={() => setSelectedClient(null)} className="p-2 -ml-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg flex items-center gap-1">
                                            <ChevronLeft size={20} />
                                            <span className="text-sm font-bold">Voltar</span>
                                        </button>
                                    </div>
                                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 break-words">
                                        <User className="text-brand-500 shrink-0" size={20} />
                                        <span className="break-words">{selectedClient}</span>
                                    </h1>
                                    <div className="text-sm text-slate-500">{clientTasks.length} tarefas encontradas</div>
                                </div>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors print:hidden shrink-0">
                                    <Download size={16} />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </button>
                            </div>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap gap-2 mb-4 bg-white p-3 rounded-lg border border-slate-200 print:hidden shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase">Filtros:</span>
                                </div>
                                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-md px-2 py-1.5 outline-none focus:border-brand-500">
                                    <option value="">Todos os Meses</option>
                                    {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                                </select>
                                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-md px-2 py-1.5 outline-none focus:border-brand-500">
                                    <option value="">Todos os Anos</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-md px-2 py-1.5 outline-none focus:border-brand-500">
                                    <option value="">Todas Categorias</option>
                                    {Object.keys(CategoryLabels).map(k => <option key={k} value={k}>{CategoryLabels[k]}</option>)}
                                </select>
                                <select value={filterVisitation} onChange={(e) => setFilterVisitation(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-md px-2 py-1.5 outline-none focus:border-brand-500">
                                    <option value="ALL">Viagens: Todas</option>
                                    <option value="YES">Com Viagem Necessária</option>
                                    <option value="NO">Sem Viagem</option>
                                </select>
                                {(filterMonth || filterYear || filterCategory || filterVisitation !== 'ALL') && (
                                    <button onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterCategory(''); setFilterVisitation('ALL'); }} className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto">Limpar filtros</button>
                                )}
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                            {clientTasks.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">Nenhuma tarefa encontrada com os filtros selecionados.</div>
                            ) : (
                                clientTasks.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => onEditTask && onEditTask(t)}
                                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 break-inside-avoid print:shadow-none print:border-slate-300 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0 mb-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-800 text-sm sm:text-base break-words">{t.title}</h3>
                                                {t.visibility === 'PRIVATE' && <Lock size={14} className="text-amber-500 shrink-0" title="Privada" />}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {/* Assignees in history */}
                                                <div className="flex -space-x-1 overflow-hidden">
                                                    {users && t.assigned_users && t.assigned_users.map(uId => {
                                                        const u = users.find(user => user.id === uId);
                                                        if (!u) return null;
                                                        return (
                                                            <div key={uId} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white font-bold text-[8px]" style={{ backgroundColor: u.color }} title={u.username}>
                                                                {u.username[0].toUpperCase()}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border h-fit whitespace-nowrap ${StatusColors[t.status]}`}>{StatusLabels[t.status]}</div>
                                            </div>
                                        </div>
                                        {t.description && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded mb-2 print:bg-transparent print:p-0 print:mb-1">{t.description}</p>}

                                        {/* Show travels summary if exists */}
                                        {t.visitation && t.visitation.required && t.travels && t.travels.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                <p className="text-xs font-bold text-slate-500 mb-1">Registro de Viagens:</p>
                                                <div className="space-y-1">
                                                    {t.travels.map((travel, idx) => (
                                                        <div key={idx} className="text-xs flex gap-2 text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                                            <span className="font-mono font-medium">{new Date(travel.date).toLocaleDateString()}</span>
                                                            <span>|</span>
                                                            <span className="text-slate-800">{travel.team && Array.isArray(travel.team) ? travel.team.join(', ') : travel.team}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {t.attachments && t.attachments.length > 0 && (
                                            <div className="mt-2 print:hidden">
                                                <div className="text-xs font-bold text-slate-500 mb-1 flex gap-1"><Paperclip size={12} />Arquivos</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {t.attachments.map(a => (<div key={a.id} className="flex justify-between items-center p-2 border rounded bg-white"><span className="text-xs truncate">{a.name}</span><a href={a.content} download={a.name} className="text-brand-600"><Download size={14} /></a></div>))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>}
            </div>

            {/* Print Styles for Client History */}
            <style>{`
                @media print {
                    #client-print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; background: white; z-index: 50; }
                    body * { visibility: hidden; }
                    #client-print-area, #client-print-area * { visibility: visible; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div >
    );
};

// 7. Map View
const MapView = ({ tasks, mapFilter, setMapFilter, users }) => {
    // Custom Icons
    const blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const technicians = useMemo(() => {
        const set = new Set();
        tasks.forEach(t => {
            if (t.travels) {
                t.travels.forEach(tr => {
                    const team = Array.isArray(tr.team) ? tr.team : [tr.team];
                    team.forEach(m => { if (m && m.trim()) set.add(m.trim()); });
                });
            }
        });
        return Array.from(set).sort();
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!t.geo || !t.geo.lat) return false;

            // Status Filter
            if (mapFilter.status === 'ACTIVE') {
                if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) return false;
            } else if (mapFilter.status === 'FINISHED') {
                if (t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED) return false;
            }
            // If 'ALL', no status filter

            // Date Filter (using travel dates or due_date)
            if (mapFilter.month !== 'ALL' || mapFilter.year !== 'ALL') {
                let matchDate = false;
                const datesToCheck = [];
                if (t.due_date) datesToCheck.push(t.due_date);
                if (t.created_at) datesToCheck.push(t.created_at);
                if (t.createdAt) datesToCheck.push(t.createdAt);
                if (t.travels) t.travels.forEach(tr => { if (tr.date) datesToCheck.push(tr.date); });

                if (datesToCheck.length === 0) return false;

                matchDate = datesToCheck.some(d => {
                    const dateObj = new Date(d);
                    const mMatch = mapFilter.month === 'ALL' || (dateObj.getUTCMonth() + 1).toString() === mapFilter.month;
                    const yMatch = mapFilter.year === 'ALL' || dateObj.getUTCFullYear().toString() === mapFilter.year;
                    return mMatch && yMatch;
                });
                if (!matchDate) return false;
            }

            // Technician Filter
            if (mapFilter.userId !== 'ALL') {
                if (!t.travels) return false;
                const hasTech = t.travels.some(tr => {
                    const team = Array.isArray(tr.team) ? tr.team : [tr.team];
                    return team.some(m => m === mapFilter.userId);
                });
                if (!hasTech) return false;
            }

            // Visitation Requirement Check (Only show pins if visitation is required)
            if (!t.visitation?.required) return false;

            return true;
        });
    }, [tasks, mapFilter]);

    useEffect(() => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        });
    }, []);

    const months = [
        { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' },
        { v: '4', l: 'Abril' }, { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' },
        { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Setembro' },
        { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' }
    ];

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            {/* Map Filters Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap gap-3 items-center z-10 shrink-0">
                <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1 shadow-sm">
                    <Filter size={14} className="text-slate-400" />
                    <select
                        value={mapFilter.status}
                        onChange={e => setMapFilter(p => ({ ...p, status: e.target.value }))}
                        className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                    >
                        <option value="ACTIVE">Viagens Ativas</option>
                        <option value="FINISHED">Viagens Finalizadas</option>
                        <option value="ALL">Todas as Viagens</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={mapFilter.month}
                        onChange={e => setMapFilter(p => ({ ...p, month: e.target.value }))}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none hover:border-brand-500 transition-colors"
                    >
                        <option value="ALL">Todos os Meses</option>
                        {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                    <select
                        value={mapFilter.year}
                        onChange={e => setMapFilter(p => ({ ...p, year: e.target.value }))}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none hover:border-brand-500 transition-colors"
                    >
                        <option value="ALL">Todos os Anos</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                    <Users size={14} className="text-slate-400" />
                    <select
                        value={mapFilter.userId}
                        onChange={e => setMapFilter(p => ({ ...p, userId: e.target.value }))}
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none hover:border-brand-500 transition-colors"
                    >
                        <option value="ALL">Quem foi? (Todos)</option>
                        {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-4 ml-auto">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Ativas</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Finalizadas</div>
                </div>
            </div>

            <div className="flex-1 relative z-0">
                {filteredTasks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 text-slate-400 backdrop-blur-[1px]">
                        <div className="text-center">
                            <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="font-medium">Nenhum local encontrado para estes filtros.</p>
                        </div>
                    </div>
                )}
                <MapContainer center={[-23.5505, -46.6333]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    {filteredTasks.map(t => {
                        const isFinished = t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED;
                        return (
                            <Marker
                                key={t.id}
                                position={[t.geo.lat, t.geo.lng]}
                                icon={isFinished ? greenIcon : blueIcon}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="text-[10px] font-black uppercase tracking-tight text-brand-600">{StatusLabels[t.status]}</div>
                                            {t.visibility === 'PRIVATE' && <Lock size={10} className="text-amber-500" title="Privada" />}
                                        </div>
                                        <div className="font-bold text-slate-800 border-b pb-1 mb-1">{t.client || t.title}</div>
                                        <div className="text-xs text-slate-600 flex items-start gap-1"><MapPin size={10} className="mt-0.5 shrink-0" /> {t.location}</div>
                                        {/* Assignees in Map Popup */}
                                        {t.assigned_users && t.assigned_users.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {t.assigned_users.map(uId => {
                                                    const u = (users || []).find(user => user.id === uId);
                                                    if (!u) return null;
                                                    return (
                                                        <div key={uId} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px]" style={{ backgroundColor: u.color }} title={u.username}>
                                                            {u.username[0].toUpperCase()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {t.travels && t.travels.length > 0 && (
                                            <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                                                Última equipe: {t.travels[t.travels.length - 1].team?.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
};


// 7.5 Travels View
const TravelsView = ({ tasks, onEditTask }) => {
    const [filters, setFilters] = useState({ client: '', status: '', team: '', date: '', dateMode: 'ALL', category: '' });

    // Flatten tasks into trips
    const trips = useMemo(() => {
        const list = [];
        tasks.forEach(task => {
            if (!task.visitation?.required) return;

            // If has specific travels
            if (task.travels && task.travels.length > 0) {
                task.travels.forEach(t => {
                    list.push({
                        id: t.id,
                        taskId: task.id,
                        client: task.client || task.title,
                        taskStatus: task.status,
                        category: task.category,
                        location: task.location, // Global location
                        date: t.date,
                        isDateDefined: t.isDateDefined,
                        team: Array.isArray(t.team) ? t.team : [t.team],
                        contacts: t.contacts,
                        role: t.role,
                        description: task.description,
                        trip_cost: task.trip_cost,
                        trip_cost_currency: task.trip_cost_currency
                    });
                });
            } else {
                // Legacy or just marked as required but no trips added yet (shows as generic trip)
                list.push({
                    id: task.id + '_main',
                    taskId: task.id,
                    client: task.client || task.title,
                    taskStatus: task.status,
                    category: task.category,
                    location: task.location,
                    date: task.due_date, // Fallback
                    isDateDefined: !!task.due_date,
                    team: [],
                    contacts: task.contacts?.client || '',
                    role: '',
                    description: task.description,
                    trip_cost: task.trip_cost,
                    trip_cost_currency: task.trip_cost_currency
                });
            }
        });
        return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [tasks]);

    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            if (filters.client && !trip.client.toLowerCase().includes(filters.client.toLowerCase())) return false;
            if (filters.status && trip.taskStatus !== filters.status) return false;
            if (filters.category && trip.category !== filters.category) return false;
            if (filters.team) {
                const search = filters.team.toLowerCase();
                if (!trip.team.some(m => m.toLowerCase().includes(search))) return false;
            }
            if (filters.date) {
                if (!trip.date) return false;
                const tripDate = new Date(trip.date);
                const filterDate = new Date(filters.date);

                if (filters.dateMode === 'DAY') {
                    if (trip.date !== filters.date) return false;
                } else if (filters.dateMode === 'MONTH') {
                    const dStr = trip.date.substring(0, 7);
                    const fStr = filters.date.substring(0, 7);
                    if (dStr !== fStr) return false;
                }
            }
            return true;
        });
    }, [trips, filters]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
            {/* Header & Filters */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Plane className="text-brand-600" /> Controle de Viagens
                        </h2>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-3 mt-1">
                            <span>{filteredTrips.length} Viagens Filtradas</span>
                            <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                                <DollarSign size={10} />
                                <span>Custo Total: {
                                    Object.entries(filteredTrips.reduce((acc, curr) => {
                                        const c = curr.trip_cost_currency || 'BRL';
                                        acc[c] = (acc[c] || 0) + (parseFloat(curr.trip_cost) || 0);
                                        return acc;
                                    }, {})).map(([curr, total]) => `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: curr }).format(total)}`).join(' | ') || 'R$ 0,00'
                                }</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"><Download size={16} /> Imprimir Relatório</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="relative"><Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} /><input type="text" placeholder="Filtrar Cliente..." value={filters.client} onChange={e => setFilters(p => ({ ...p, client: e.target.value }))} className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand-500" /></div>

                    <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-600">
                        <option value="">Todos Status</option>
                        {Object.keys(TaskStatus).map(k => <option key={k} value={k}>{StatusLabels[k]}</option>)}
                    </select>

                    <select value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-600">
                        <option value="">Todos Tipos</option>
                        {Object.keys(CategoryLabels).map(k => <option key={k} value={k}>{CategoryLabels[k]}</option>)}
                    </select>

                    <div className="relative"><Users className="absolute left-2.5 top-2.5 text-slate-400" size={14} /><input type="text" placeholder="Filtrar Equipe..." value={filters.team} onChange={e => setFilters(p => ({ ...p, team: e.target.value }))} className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand-500" /></div>

                    <div className="flex gap-1 md:col-span-2">
                        <select value={filters.dateMode} onChange={e => setFilters(p => ({ ...p, dateMode: e.target.value }))} className="w-24 px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-600">
                            <option value="ALL">Todo Período</option>
                            <option value="MONTH">Mês</option>
                            <option value="DAY">Dia</option>
                        </select>
                        {filters.dateMode !== 'ALL' && (
                            <input type={filters.dateMode === 'MONTH' ? 'month' : 'date'} value={filters.date} onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-600" />
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white p-4 lg:p-0 " id="print-area">
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm print:shadow-none">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Data</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Cliente / Local</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Detalhes</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Equipe</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Custo</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Contato</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTrips.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">Nenhuma viagem encontrada para os filtros.</td></tr>
                            ) : (
                                filteredTrips.map((trip, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => { const original = tasks.find(t => t.id === trip.taskId); if (original && onEditTask) onEditTask(original); }}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold ${!trip.isDateDefined ? 'text-amber-600' : 'text-slate-700'}`}>
                                                    {trip.isDateDefined ? new Date(trip.date).toLocaleDateString() : 'A Definir'}
                                                </span>
                                                {trip.isDateDefined && <span className="text-[10px] text-slate-400 uppercase">{new Date(trip.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-sm text-slate-800">{trip.client}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={10} /> {trip.location || 'Local não definido'}</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mb-1">{CategoryLabels[trip.category]}</div>
                                            {trip.description && <p className="text-xs text-slate-400 line-clamp-2 mt-1">{trip.description}</p>}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-wrap gap-1">
                                                {trip.team.length > 0 ? trip.team.map((m, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium border border-blue-100">{m}</span>
                                                )) : <span className="text-[10px] text-slate-300 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-xs font-bold text-slate-700">
                                                {trip.trip_cost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: trip.trip_cost_currency || 'BRL' }).format(trip.trip_cost) : '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-xs text-slate-700 font-medium">{trip.contacts || '-'}</div>
                                            <div className="text-[10px] text-slate-400">{trip.role}</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${StatusColors[trip.taskStatus]}`}>
                                                {StatusLabels[trip.taskStatus]}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden space-y-4 pb-10">
                    {filteredTrips.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">Nenhuma viagem encontrada para os filtros.</div>
                    ) : (
                        filteredTrips.map((trip, idx) => (
                            <div
                                key={idx}
                                onClick={() => { const original = tasks.find(t => t.id === trip.taskId); if (original && onEditTask) onEditTask(original); }}
                                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 cursor-pointer active:scale-[0.98] transition-all"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-bold ${!trip.isDateDefined ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {trip.isDateDefined ? new Date(trip.date).toLocaleDateString() : 'A Definir'}
                                        </span>
                                        {trip.isDateDefined && <span className="text-[10px] text-slate-400 uppercase">{new Date(trip.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${StatusColors[trip.taskStatus]}`}>
                                        {StatusLabels[trip.taskStatus]}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-800">{trip.client}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12} /> {trip.location || 'Local não definido'}</div>
                                    </div>
                                    {trip.trip_cost > 0 && (
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Custo</div>
                                            <div className="text-xs font-bold text-emerald-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: trip.trip_cost_currency || 'BRL' }).format(trip.trip_cost)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 py-1">
                                    <div className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">{CategoryLabels[trip.category]}</div>
                                    {trip.team.map((m, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium border border-blue-100">{m}</span>
                                    ))}
                                </div>
                                {trip.description && <p className="text-xs text-slate-500 line-clamp-2 italic">"{trip.description}"</p>}
                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <div className="text-xs text-slate-700 font-medium">{trip.contacts || 'Sem contato'}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-tight">{trip.role}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; }
                    /* Hide scrollbars in print */
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>
        </div>
    );
};

// --- APP ---




// 9. APP
const App = () => {
    // POLI Global State
    const [suggestions, setSuggestions] = useState([]);
    const [isPoliPanelOpen, setIsPoliPanelOpen] = useState(false);
    const [isKanbanFilterOpen, setIsKanbanFilterOpen] = useState(false);
    const [isCustomTypesDropdownOpen, setIsCustomTypesDropdownOpen] = useState(false);
    const customTypesDropdownRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [customCategories, setCustomCategories] = useState(INITIAL_NATIVE_CATEGORIES);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOnlineListOpen, setIsOnlineListOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [focusedColumn, setFocusedColumn] = useState(null);
    const [collapsedColumns, setCollapsedColumns] = useState({});
    const [columnWidths, setColumnWidths] = useState({});
    const [columnHeights, setColumnHeights] = useState({});
    const [resizingColumn, setResizingColumn] = useState(null);
    const [kanbanViewMode, setKanbanViewMode] = useState('list');
    const [mapFilter, setMapFilter] = useState({
        status: 'ACTIVE',
        month: 'ALL',
        year: new Date().getFullYear().toString(),
        userId: 'ALL'
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('kanban');
    const [selectedClient, setSelectedClient] = useState(null); // Lifted state for Client History
    const [calendarLayout, setCalendarLayout] = useState('RIGHT'); // RIGHT, LEFT, BOTTOM, FULL
    const [kanbanUserFilter, setKanbanUserFilter] = useState('ALL'); // ALL, MY
    const [selectedBoard, setSelectedBoard] = useState('ALL');
    const [columnFilters, setColumnFilters] = useState({});
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // New States for Online Users
    const [users, setUsers] = useState([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Notes & Reminders State
    const [notes, setNotes] = useState([]);
    const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);

    // Click Outside Refs

    // Handle Click Outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isCustomTypesDropdownOpen && customTypesDropdownRef.current && !customTypesDropdownRef.current.contains(event.target)) {
                setIsCustomTypesDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCustomTypesDropdownOpen]);

    // Kanban Date Filter State
    const [kanbanDate, setKanbanDate] = useState(new Date());
    const [kanbanFilterMode, setKanbanFilterMode] = useState('YEAR'); // 'YEAR' or 'MONTH'

    // Client Report State
    const [isClientReportOpen, setIsClientReportOpen] = useState(false);
    const [clientReportData, setClientReportData] = useState(null);

    // Task Report State
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportTask, setReportTask] = useState(null);
    const [reportData, setReportData] = useState(null);

    const todayStr = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const themeStyle = useMemo(() => currentUser?.theme_style || 'DEFAULT', [currentUser]);

    const theme = useMemo(() => {
        const baseTheme = THEMES[themeStyle] || THEMES.DEFAULT;
        if (themeStyle === 'CUSTOM') {
            return {
                ...baseTheme,
                bg: currentUser?.app_bg || '#f1f5f9'
            };
        }
        return baseTheme;
    }, [themeStyle, currentUser?.app_bg]);

    // Micro-animations and Style Injector
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'dynamic-animations';
        style.innerHTML = `
            @keyframes slideIn {
                from {opacity: 0; transform: translateY(10px); }
            to {opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
                from {opacity: 0; }
            to {opacity: 1; }
            }
            .animate-slide {animation: slideIn 0.3s ease-out forwards; }
            .animate-fade {animation: fadeIn 0.4s ease-out forwards; }
            .glass-effect {backdrop - filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
            .card-hover:hover {transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .scrollbar-hide::-webkit-scrollbar {display: none; }
            .custom-scrollbar::-webkit-scrollbar {width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-thumb {background: #cbd5e1; border-radius: 10px; }
            .theme-midnight .custom-scrollbar::-webkit-scrollbar-thumb {background: #475569; }
            .theme-custom .custom-scrollbar::-webkit-scrollbar-thumb {background: rgba(255,255,255,0.3); }
            `;
        document.head.appendChild(style);
        return () => {
            const el = document.getElementById('dynamic-animations');
            if (el) el.remove();
        };
    }, []);

    const isToday = (dateStr) => {
        if (!dateStr) return false;
        // If it's an ISO string or has time, extract just the date part locally
        try {
            if (dateStr.includes('T') || dateStr.includes(' ')) {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                const ly = d.getFullYear();
                const lm = String(d.getMonth() + 1).padStart(2, '0');
                const ld = String(d.getDate()).padStart(2, '0');
                return `${ly}-${lm}-${ld}` === todayStr;
            }
            return dateStr === todayStr;
        } catch (e) {
            return false;
        }
    };

    const todayTasksCount = useMemo(() => {
        return tasks.filter(t => {
            if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) return false;

            // 1. Check main due date
            if (isToday(t.due_date)) return true;

            // 2. Check active stages with dates
            if (t.stages) {
                const hasStageToday = Object.values(t.stages).some(s =>
                    s && s.active && isToday(s.date) &&
                    !['COMPLETED', 'SOLUCIONADO', 'FINALIZADO', 'DEVOLVIDO'].includes(s.status)
                );
                if (hasStageToday) return true;
            }

            // 3. Check travels
            if (t.travels && Array.isArray(t.travels)) {
                if (t.travels.some(tr => tr.isDateDefined && isToday(tr.date))) return true;
            }

            return false;
        }).length;
    }, [tasks, todayStr]);

    const filteredTasksVisibility = useMemo(() => {
        if (!currentUser) return [];
        return tasks.filter(t => {
            // Visibility Check
            const isOwner = t.user_id === currentUser.id;
            const isAssigned = t.assigned_users && t.assigned_users.includes(currentUser.id);
            if (t.visibility === 'PRIVATE' && !isOwner && !isAssigned) return false;

            // Search Filter
            const matchesSearch = (t.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (t.client?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [tasks, currentUser, searchTerm]);

    const allClients = useMemo(() => {
        const set = new Set(tasks.map(t => t.client).filter(Boolean));
        return Array.from(set).sort();
    }, [tasks]);

    const kanbanBoards = useMemo(() => {
        if (!currentUser) return { ALL: { label: 'Tarefas', tasks: [] } };

        // Filter tasks by kanbanDate (month/year)
        const kanbanYear = kanbanDate.getFullYear();
        const kanbanMonth = kanbanDate.getMonth();

        const dateFilteredTasks = filteredTasksVisibility.filter(t => {
            const dateToCheck = t.due_date || t.created_at || t.createdAt;
            if (!dateToCheck) return true;

            const taskDate = new Date(dateToCheck);
            if (isNaN(taskDate.getTime())) return true; // Show invalid dates too

            if (kanbanFilterMode === 'YEAR') {
                return taskDate.getFullYear() === kanbanYear;
            } else if (kanbanFilterMode === 'MONTH') {
                return taskDate.getFullYear() === kanbanYear && taskDate.getMonth() === kanbanMonth;
            } else {
                // DAY mode
                return taskDate.getFullYear() === kanbanYear &&
                    taskDate.getMonth() === kanbanMonth &&
                    taskDate.getDate() === kanbanDate.getDate();
            }
        });

        const boards = {
            ALL: { label: 'Todas as Tarefas', tasks: dateFilteredTasks }
        };

        customCategories.forEach(cat => {
            boards[cat.id] = {
                label: cat.label,
                tasks: dateFilteredTasks.filter(t => t.category === cat.id)
            };
        });

        return boards;
    }, [customCategories, filteredTasksVisibility, currentUser, kanbanDate, kanbanFilterMode]);

    const todayNotesCount = useMemo(() => notes.filter(n => {
        // Notes with dates: check if date matches today
        if (n.note_date || n.date) {
            return isToday(n.note_date) || isToday(n.date);
        }
        // Notes without dates: always count as today's notes
        return true;
    }).length, [notes, todayStr]);
    const formattedHeaderDate = useMemo(() => {
        const d = new Date();
        const month = d.toLocaleDateString('pt-BR', { month: 'long' });
        return `${d.getDate()} de ${month.charAt(0).toUpperCase() + month.slice(1)}`;
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchTasks();
            fetchLogs();
            fetchNotes();
            fetchCustomCategories();

            // Load Preferences
            const savedCollapsed = localStorage.getItem(`assistec_collapsed_${currentUser.id}`);
            if (savedCollapsed) setCollapsedColumns(JSON.parse(savedCollapsed));
            const savedWidths = localStorage.getItem(`assistec_widths_${currentUser.id}`);
            if (savedWidths) setColumnWidths(JSON.parse(savedWidths));
            const savedHeights = localStorage.getItem(`assistec_heights_${currentUser.id}`);
            if (savedHeights) setColumnHeights(JSON.parse(savedHeights));
            const savedMapFilter = localStorage.getItem(`assistec_mapfilter_${currentUser.id}`);
            if (savedMapFilter) setMapFilter(JSON.parse(savedMapFilter));
            const savedViewMode = localStorage.getItem(`assistec_viewmode_${currentUser.id}`);
            if (savedViewMode) setKanbanViewMode(savedViewMode);

            // Heartbeat & User Fetch
            updateHeartbeat();
            fetchUsers();
            fetchNotes();

            // Load Preferences
            const savedNotesPanel = localStorage.getItem(`assistec_notes_open_${currentUser.id}`);
            if (savedNotesPanel) setIsNotesPanelOpen(JSON.parse(savedNotesPanel));

            // Polling periÃ³dico para sincronizaÃ§Ã£o em tempo real
            // Mais confiÃ¡vel que Realtime e nÃ£o depende de configuraÃ§Ãµes do Supabase
            console.log('ðŸ”„ Iniciando sincronizaÃ§Ã£o automÃ¡tica (polling a cada 3s)...');

            const syncInterval = setInterval(() => {
                fetchTasks();
                fetchNotes();
                fetchCustomCategories();
            }, 2000); // Atualiza a cada 2 segundos para sincronizaÃ§Ã£o mais rÃ¡pida

            const heartbeatInterval = setInterval(() => {
                updateHeartbeat();
                fetchUsers();
            }, 60000); // Every minute

            return () => {
                clearInterval(syncInterval);
                clearInterval(heartbeatInterval);
            };
        } else {
            setTasks([]);
            setLogs([]);
            setCustomCategories(INITIAL_NATIVE_CATEGORIES);
            setUsers([]);
            setCollapsedColumns({});
            setKanbanViewMode('list');
        }
    }, [currentUser]);

    // Save Preferences
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_collapsed_${currentUser.id}`, JSON.stringify(collapsedColumns));
        }
    }, [collapsedColumns, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_widths_${currentUser.id}`, JSON.stringify(columnWidths));
        }
    }, [columnWidths, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_heights_${currentUser.id}`, JSON.stringify(columnHeights));
        }
    }, [columnHeights, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_mapfilter_${currentUser.id}`, JSON.stringify(mapFilter));
        }
    }, [mapFilter, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_viewmode_${currentUser.id}`, kanbanViewMode);
        }
    }, [kanbanViewMode, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_notes_open_${currentUser.id}`, JSON.stringify(isNotesPanelOpen));
        }
    }, [isNotesPanelOpen, currentUser]);

    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingColumn) return;
            const columnId = resizingColumn;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const columnElement = document.getElementById(`kanban-column-${columnId}`);
            if (!columnElement) return;

            const rect = columnElement.getBoundingClientRect();
            let newWidth = mouseX - rect.left;
            let newHeight = mouseY - rect.top;

            // Width Constraints
            if (newWidth < 60) {
                setCollapsedColumns(p => ({ ...p, [columnId]: true }));
                setResizingColumn(null);
                return;
            }
            if (newWidth > 800) newWidth = 800;

            // Height Constraints
            if (newHeight < 100) newHeight = 100;
            if (newHeight > 2000) newHeight = 2000;

            // If we are dragging a collapsed column open
            if (collapsedColumns[columnId] && newWidth > 120) {
                setCollapsedColumns(p => ({ ...p, [columnId]: false }));
            }

            setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
            setColumnHeights(prev => ({ ...prev, [columnId]: newHeight }));
        };

        const handleMouseUp = () => setResizingColumn(null);

        if (resizingColumn) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumn, collapsedColumns]);

    const updateHeartbeat = async () => {
        if (!currentUser) return;
        await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, username, last_seen, color');
        if (data) setUsers(data);
    };

    const handleUpdateProfile = async (updates) => {
        if (!currentUser) return;
        try {
            const { data, error } = await supabase.from('users').update(updates).eq('id', currentUser.id).select().single();
            if (error) throw error;
            setCurrentUser(data); // Update local state
            setUsers(users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u)); // Update user list
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            // Fallback: Apply local update even if DB fails (e.g. missing column) so UI works
            setCurrentUser(prev => ({ ...prev, ...updates }));

            // Only alert for non-schema errors to avoid spamming the user if they haven't run migration yet
            if (!error.message?.includes('layout_mode')) {
                alert(`Erro ao atualizar perfil: ${error.message}\n${error.details || ''}`);
            }
        }
    };

    async function fetchTasks() {
        if (!currentUser) return;
        const { data, error } = await supabase.from('tasks')
            .select('*')
            .or(`visibility.eq.PUBLIC,user_id.eq.${currentUser.id},assigned_users.cs.{${currentUser.id}}`)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching tasks:', error);
        } else {
            // Merge with existing tasks to preserve all fields
            setTasks(prevTasks => {
                const newTasksMap = new Map();

                // First, add all new/updated tasks from server
                (data || []).forEach(t => {
                    const standardized = {
                        ...t,
                        createdAt: t.created_at || t.createdAt || new Date().toISOString()
                    };
                    newTasksMap.set(t.id, standardized);
                });

                // Then, merge with existing tasks to preserve fields that might be missing from server
                prevTasks.forEach(oldTask => {
                    if (newTasksMap.has(oldTask.id)) {
                        const serverTask = newTasksMap.get(oldTask.id);

                        // LÃ³gica de SincronizaÃ§Ã£o Inteligente:
                        // Prioriza o dado do servidor, a menos que o dado local seja estritamente mais recente.
                        // Isso permite que mudanÃ§as de outros usuÃ¡rios cheguem, mas evita que o polling 
                        // sobrescreva o que o usuÃ¡rio acabou de clicar (antes do salvamento no banco).

                        const serverUpdated = new Date(serverTask.updated_at || serverTask.created_at || 0).getTime();
                        const localUpdated = new Date(oldTask.updated_at || oldTask.created_at || 0).getTime();

                        if (localUpdated > serverUpdated + 1000) {
                            // Se o local for mais recente por mais de 1 segundo, mantÃ©m local para evitar flicker
                            newTasksMap.set(oldTask.id, {
                                ...serverTask,
                                ...oldTask,
                                client: oldTask.client || serverTask.client,
                                title: oldTask.title || serverTask.title,
                            });
                        } else {
                            // Caso contrÃ¡rio, aceita o que veio do servidor
                            newTasksMap.set(oldTask.id, {
                                ...oldTask,
                                ...serverTask,
                                createdAt: serverTask.created_at || oldTask.createdAt
                            });
                        }
                    }
                });

                return Array.from(newTasksMap.values());
            });
        }
    }

    async function fetchLogs() {
        // Fetch all logs to allow team visibility
        const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (error) console.error('Error fetching logs:', error);
        else setLogs(data);
    }

    const fetchCustomCategories = async () => {
        // Agora busca TODAS as categorias customizadas para que sejam pÃºblicas para a equipe
        const { data, error } = await supabase.from('custom_categories').select('*');
        if (error) console.error('Error fetching custom categories:', error);
        else {
            const mapped = (data || []).map(c => ({
                ...c,
                isNative: c.is_native // Map DB snake_case to frontend camelCase
            }));
            setCustomCategories([...INITIAL_NATIVE_CATEGORIES, ...mapped]);
        }
    };

    const fetchNotes = async () => {
        if (!currentUser) return;
        // Fetch notes that are either public or owned by the currentUser
        const { data, error } = await supabase.from('notes')
            .select('*, users(username)')
            .or(`is_public.eq.true,user_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching notes:', error);
        else setNotes(data || []);
    };

    const handleSaveNote = async (noteData) => {
        if (!currentUser) return;
        const { id, ...payload } = noteData;

        const { error } = await supabase.from('notes').upsert({
            id: id,
            ...payload,
            user_id: currentUser.id
        });

        if (error) {
            console.error('Error saving note:', error);
            alert('Erro ao salvar nota');
        } else {
            fetchNotes();
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Excluir esta nota?')) return;
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) console.error('Error deleting note:', error);
        else fetchNotes();
    };

    const logActivity = async (action, details, metadata = {}) => {
        if (!currentUser) return;
        const { error } = await supabase.from('logs').insert({
            user_id: currentUser.id,
            action,
            details,
            metadata,
            timestamp: new Date().toISOString()
        });
        if (error) console.error('Error logging activity:', error);
        else fetchLogs();
    };

    const handleSaveTask = async (taskData) => {
        // Handle both snake_case and camelCase from different sources
        const dueDateValue = taskData.due_date || taskData.dueDate || null;
        // Separando prop reportRequired e report para nÃ£o enviar para tabela 'tasks'
        const { dueDate, due_date, createdAt, reportRequired, report, ...otherProps } = taskData;
        const taskId = editingTask?.id || taskData.id;

        let finalTaskId = taskId;

        if (taskId) {
            // Update existing task
            const oldTask = tasks.find(t => t.id === taskId);

            // Mesclar dados: se taskData vier incompleto (ex: drag no calendÃ¡rio), preservamos o que jÃ¡ existe
            const taskToSave = {
                ...(oldTask || {}),
                ...otherProps,
                client: taskData.client || oldTask?.client || '',
                title: taskData.title || taskData.client || oldTask?.title || '',
                due_date: dueDateValue !== null ? dueDateValue : (oldTask?.due_date || null),
                updated_at: new Date().toISOString()
            };

            const { id, users, createdAt, created_at, ...updatePayload } = taskToSave;

            // Clean report fields from updatePayload if they accidentally got merged from oldTask
            delete updatePayload.reportRequired;
            delete updatePayload.reportData;
            delete updatePayload.report;

            // Explicitly ensure client is preserved
            if (oldTask && oldTask.client && !updatePayload.client) {
                updatePayload.client = oldTask.client;
            }

            // Explicitly ensure travels are included if present in original data
            if (otherProps.travels) {
                updatePayload.travels = otherProps.travels;
            }

            // CRÍTICO: Garantir que attachments sejam salvos
            if (otherProps.attachments) {
                updatePayload.attachments = otherProps.attachments;
                console.log('App: Salvando attachments:', otherProps.attachments.length, 'arquivos');
            }

            // Cascade Status to Stages
            if (taskToSave.status === TaskStatus.CANCELED || taskToSave.status === TaskStatus.DONE) {
                const newStageStatus = taskToSave.status === TaskStatus.DONE ? 'COMPLETED' : 'CANCELED';
                if (updatePayload.stages || taskData.stages) {
                    const sourceStages = updatePayload.stages || taskData.stages;
                    const cascadedStages = {};
                    Object.keys(sourceStages).forEach(k => {
                        cascadedStages[k] = { ...sourceStages[k], status: newStageStatus };
                    });
                    updatePayload.stages = cascadedStages;
                } else {
                    if (taskData.stages) {
                        const cascadedStages = {};
                        Object.keys(taskData.stages).forEach(k => {
                            cascadedStages[k] = { ...taskData.stages[k], status: newStageStatus };
                        });
                        updatePayload.stages = cascadedStages;
                    }
                }
            }

            const { data, error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId).select().single();
            if (error) {
                console.error('Error updating task:', error);
                alert(`Erro ao atualizar tarefa: ${error.message}`);
                return; // Stop if task save failed
            } else {
                // Merge old task data with new data to preserve all fields
                const oldTask = tasks.find(t => t.id === taskId);
                const standardizedData = {
                    ...oldTask, // Preserve all old fields
                    ...data,    // Override with new data from Supabase
                    createdAt: data.created_at || data.createdAt,
                    // Re-attach local report state so UI doesn't lose it immediately before refetch (optional)
                    reportRequired,
                    reportData: report
                };
                setTasks(tasks.map(t => t.id === taskId ? standardizedData : t));
                logActivity('TAREFA_ATUALIZADA', `Tarefa "${data.client || data.title}" atualizada.`, { taskId });
            }
        } else {
            // Create
            const taskToSave = {
                ...otherProps,
                client: taskData.client || otherProps.client || '', // Explicitly include client
                title: taskData.client || taskData.title || '', // Ensure title is never null
                user_id: currentUser.id,
                due_date: dueDateValue,
                updated_at: new Date().toISOString()
            };

            // Clean report fields
            delete taskToSave.reportRequired;
            delete taskToSave.report;
            delete taskToSave.reportData;

            const { data, error } = await supabase.from('tasks').insert(taskToSave).select().single();
            if (error) {
                console.error('Error creating task. Sent data:', taskToSave, 'Supabase error:', error);
                alert(`Erro ao criar tarefa: ${error.message}`);
                return; // Stop if task save failed
            } else {
                finalTaskId = data.id;
                const standardizedData = {
                    ...data,
                    createdAt: data.created_at || data.createdAt,
                    reportRequired,
                    reportData: report
                };
                setTasks([standardizedData, ...tasks]);
                logActivity('TAREFA_CRIADA', `Nova tarefa para "${data.client || data.title}" criada.`, { taskId: data.id });

                // If the user created a specific folder for this task's report immediately (unlikely but possible), update it.
                // But report creation usually requires an ID first.
            }
        }

        // --- Handle Report Saving ---
        if (reportRequired && finalTaskId) {
            // Check if report exists
            const { data: existingReport } = await supabase
                .from('task_reports')
                .select('id')
                .eq('task_id', finalTaskId)
                .single();

            const reportPayload = {
                task_id: finalTaskId,
                user_id: currentUser.id,
                // If we have report data from the editor, use it. Otherwise, init empty if just checking the box.
                content: report?.content || '',
                raw_notes: report?.raw_notes || '',
                media_urls: report?.media_urls || [],
                status: report?.status || 'DRAFT',
                ai_generated: report?.ai_generated || false,
                last_edited_by: currentUser.id,
                updated_at: new Date().toISOString()
            };

            let reportError = null;

            if (existingReport) {
                const { error: updateErr } = await supabase
                    .from('task_reports')
                    .update(reportPayload)
                    .eq('id', existingReport.id);
                reportError = updateErr;
            } else {
                const { error: insertErr } = await supabase
                    .from('task_reports')
                    .insert(reportPayload);
                reportError = insertErr;
            }

            if (reportError) {
                console.error('Error saving report:', reportError);
                // We don't alert blocking error here because the task was saved successfully, 
                // but we should maybe warn.
            }
        }

        setIsModalOpen(false);
        setEditingTask(undefined);
    };

    const handleDeleteTask = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (window.confirm('Tem certeza que deseja excluir permanentemente? Isso apagará todo o histórico.')) {
            // Delete logs first
            const { error: logsError } = await supabase.from('logs').delete().contains('metadata', { taskId: taskId });
            if (logsError) console.error('Error deleting logs:', logsError);

            // Delete task
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);

            if (error) {
                console.error('Error deleting task:', error);
            } else {
                setTasks(tasks.filter(t => t.id !== taskId));
                // We don't log 'TAREFA_EXCLUIDA' because the logs are gone anyway for this task,
                // and keeping a log for a deleted task contradicts "hard delete with no history" request.
                // But global logs might want to know. However, user said "historico delas tambÃ©m sumam".
                fetchLogs(); // Refresh logs to clear them from view
            }
        }
    };

    const handleOpenClientReport = (reportData) => {
        setClientReportData(reportData);
        setIsClientReportOpen(true);
    };

    const fetchCompleteTaskData = async (taskId) => {
        try {
            // Fetch activity logs for this task
            const { data: activityLogs, error: logsError } = await supabase
                .from('logs')
                .select('*, users(username, color)')
                .contains('metadata', { taskId: taskId })
                .order('timestamp', { ascending: true });

            if (logsError) console.error('Error fetching activity logs:', logsError);

            // Fetch attachments for this task (if you have an attachments table)
            // For now, we'll assume attachments might be stored or we return empty array
            const attachments = []; // TODO: Implement if you have attachments table

            // Get assigned users details
            const task = tasks.find(t => t.id === taskId);
            const assignedUsers = task?.assigned_users
                ? users.filter(u => task.assigned_users.includes(u.id))
                : [];

            // Get category label
            const categoryConfig = customCategories.find(c => c.id === task?.category);
            const categoryLabel = categoryConfig?.label || task?.category;

            return {
                activityLogs: activityLogs || [],
                attachments,
                assignedUsers,
                categoryLabel
            };
        } catch (error) {
            console.error('Error fetching complete task data:', error);
            return {
                activityLogs: [],
                attachments: [],
                assignedUsers: [],
                categoryLabel: ''
            };
        }
    };

    const handleOpenReport = async (task) => {
        setReportTask(task);
        const data = await fetchCompleteTaskData(task.id);
        setReportData(data);
        setIsReportOpen(true);
    };


    const handleTaskDrop = async (taskId, newStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Reopen Protocol: Block Dragging from DONE/CANCELED to active
        if ((task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELED) && newStatus !== TaskStatus.DONE && newStatus !== TaskStatus.CANCELED) {
            alert('Para reabrir uma tarefa finalizada ou cancelada, é necessário editá-la e informar o motivo da reabertura.');
            return;
        }

        // If canceling, open modal to force reason
        if (newStatus === TaskStatus.CANCELED) {
            setEditingTask({ ...task, status: newStatus });
            setIsModalOpen(true);
            return;
        }

        let updatedStages = { ...task.stages };
        if (newStatus === TaskStatus.DONE) {
            // Automatically complete all stages
            Object.keys(updatedStages).forEach(s => {
                updatedStages[s] = { ...updatedStages[s], status: 'FINALIZADO' };
            });
        }

        const updates = {
            status: newStatus,
            stages: updatedStages,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
        if (error) {
            console.error('Error dropping task:', error);
            alert('Erro ao mover tarefa');
        } else {
            // Merge old task data with new data to preserve all fields
            const oldTask = tasks.find(t => t.id === taskId);
            const standardizedData = {
                ...oldTask, // Preserve all old fields
                ...data,    // Override with new data from Supabase
                createdAt: data.created_at || data.createdAt
            };
            setTasks(tasks.map(t => t.id === taskId ? standardizedData : t));
            logActivity('MOVIMENTAÇÃO_TAREFAS', `Tarefa "${task.client || task.title}" movida para ${StatusLabels[newStatus]} via Drag & Drop.`, { taskId });
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        // Optionally, clear local storage or session data here
    };

    const handleSaveCategories = async (newCategories) => {
        try {
            const customCatsToSave = newCategories
                .filter(c => !c.isNative)
                .map(c => ({
                    id: c.id, // Explicitly keep the ID
                    label: c.label,
                    fields: c.fields,
                    stages: c.stages,
                    is_native: false,
                    user_id: currentUser.id
                }));

            // Use UPSERT instead of delete-all-insert to prevent ID loss/change
            if (customCatsToSave.length > 0) {
                const { error } = await supabase.from('custom_categories').upsert(customCatsToSave);
                if (error) throw error;
            } else {
                // Even if empty, we might need to handle deletions separately if we had a proper deletion tracking
                // For now, this logic implies we only ADD/UPDATE via this modal.
            }

            // To handle deletions correctly with upsert, we would need to know which IDs were removed.
            // But since the modal passes the 'whole new list', deletion is tricky with upsert alone UNLESS we delete those NOT in the list.
            // Let's stick to the safer delete-insert strategy BUT WITH UUIDs to minimize format errors, 
            // OR improve it to: delete WHERE user_id = current AND id NOT IN (new IDs).

            const currentIds = customCatsToSave.map(c => c.id);
            if (currentIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('custom_categories')
                    .delete()
                    .not('id', 'in', `(${currentIds.join(',')})`);
                if (deleteError) console.error("Error cleaning up old categories:", deleteError);
            } else {
                // If list is empty, delete all (making categories global)
                await supabase.from('custom_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }

            await fetchCustomCategories();
            setIsSettingsOpen(false);
            alert('Categorias salvas com sucesso!');
        } catch (err) {
            console.error('Error saving categories:', err);
            alert(`Erro ao salvar categorias: ${err.message}`);
        }
    };


    if (!currentUser) {
        return <LoginScreen onLogin={setCurrentUser} />;
    }





    // ... inside App component render ...
    const layoutMode = currentUser?.layout_mode || 'VERTICAL';

    return (
        <div
            className={`flex h-screen font-sans transition-all duration-500 ${currentUser?.theme_style === 'MIDNIGHT' ? 'theme-midnight' : currentUser?.theme_style === 'CUSTOM' ? 'theme-custom' : ''} ${layoutMode === 'HORIZONTAL' ? 'flex-col' : 'flex-row'}`}
            style={{ backgroundColor: theme.bg }}
        >
            {/* Mobile Sidebar Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* HORIZONTAL NAVBAR (Only visible in Horizontal Mode for Desktop) */}
            {layoutMode === 'HORIZONTAL' && (
                <nav className={`hidden md:flex items-center justify-between px-6 py-3 border-b ${theme.border} ${theme.sidebar} shadow-sm z-50 shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-brand-600">
                            <CheckSquare size={24} />
                            <h1 className="text-xl font-bold tracking-tight">Assistec</h1>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-1">
                            {[
                                { id: 'kanban', label: 'Tarefas', icon: LayoutDashboard },
                                { id: 'calendar', label: 'Calendário', icon: CalendarIcon },
                                { id: 'map', label: 'Mapa', icon: MapIcon },
                                { id: 'clients', label: 'Clientes', icon: Briefcase },
                                { id: 'travels', label: 'Viagens', icon: Plane },
                                { id: 'reports', label: 'Relatórios', icon: FileText },
                                { id: 'poli', label: 'POLI', icon: Sparkles }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setViewMode(item.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
                            {/* User Profile Trigger */}
                            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors">
                                <UserAvatar user={currentUser} size={24} />
                                <span className="text-xs font-bold text-slate-700">{currentUser.username}</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setViewMode('activity')}
                            className={`p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all ${viewMode === 'activity' ? 'bg-brand-50 text-brand-600' : ''}`}
                            title="Atividades"
                        >
                            <History size={18} />
                        </button>

                        <button
                            onClick={() => {
                                const newMode = layoutMode === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL';
                                handleUpdateProfile({ layout_mode: newMode });
                            }}
                            className={`p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all`}
                            title={layoutMode === 'HORIZONTAL' ? "Mudar para Vertical" : "Mudar para Horizontal"}
                        >
                            {layoutMode === 'HORIZONTAL' ? <PanelLeft size={18} /> : <PanelBottom size={18} className="rotate-180" />}
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Configurações">
                            <Settings size={18} />
                        </button>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Sair">
                            <LogOut size={18} />
                        </button>
                    </div>
                </nav>
            )}

            {/* VERTICAL SIDEBAR (Visible in Vertical Mode OR Mobile) */}
            <aside className={`
                ${layoutMode === 'HORIZONTAL' ? 'md:hidden' : 'md:flex'} // Hide in desktop if Horizontal
                ${isSidebarCollapsed ? 'w-20' : 'w-64'}
                ${theme.sidebar} border-r ${theme.border}
                flex flex-col shrink-0 transition-all duration-300 shadow-xl overflow-hidden
                fixed inset-y-0 left-0 z-50 md:relative
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className={`p-4 border-b ${theme.border} flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden animate-fade">
                            <CheckSquare size={32} className="text-brand-600 shrink-0" />
                            <h1 className="text-2xl font-bold text-brand-600 truncate">Assistec</h1>
                        </div>
                    )}
                    {isSidebarCollapsed && (
                        <div className="flex flex-col items-center gap-2">
                            <CheckSquare size={24} className="text-brand-600" />
                        </div>
                    )}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-1.5 hover:bg-black/5 rounded-lg ${theme.text} opacity-50 hover:opacity-100 transition-all hidden md:block`}>
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(false)} className={`p-1.5 hover:bg-black/5 rounded-lg ${theme.text} opacity-50 hover:opacity-100 transition-all md:hidden`}>
                        <X size={20} />
                    </button>
                </div>
                {!isSidebarCollapsed && (
                    <div className="px-4 pb-2">
                        <p className={`text-xs ${theme.subtext} mt-2 truncate`}>Bem-vindo, <span className={`font-semibold ${theme.text}`}>{currentUser.username}</span></p>
                    </div>
                )}

                <nav className="flex-1 p-2 space-y-1">
                    {[
                        { id: 'kanban', label: 'Tarefas', icon: LayoutDashboard, color: 'text-blue-500' },
                        { id: 'calendar', label: 'Calendário', icon: CalendarIcon, color: 'text-indigo-500' },
                        { id: 'map', label: 'Mapa', icon: MapIcon, color: 'text-emerald-500' },
                        { id: 'clients', label: 'Clientes', icon: Briefcase, color: 'text-orange-500' },
                        { id: 'travels', label: 'Viagens', icon: Plane, color: 'text-sky-500' },
                        { id: 'reports', label: 'Relatórios', icon: FileText, color: 'text-indigo-600' },
                        { id: 'poli', label: 'POLI', icon: Sparkles, color: 'text-purple-500' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setViewMode(item.id); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === item.id ? 'bg-brand-500/10 text-brand-600' : `${theme.text} hover:bg-black/5 opacity-80 hover:opacity-100`} group`}
                            title={isSidebarCollapsed ? item.label : ''}
                        >
                            <item.icon size={20} className={`${isSidebarCollapsed ? item.color + ' scale-110' : ''} ${viewMode === item.id ? 'text-brand-600' : ''}`} />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>
                <div className={`p-2 border-t ${theme.border} mt-2 space-y-2`}>
                    <button onClick={() => setIsProfileOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium ${theme.text} hover:bg-black/5 transition-all active:scale-95`}>
                        <UserAvatar user={currentUser} size={isSidebarCollapsed ? 28 : 24} />
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col items-start leading-none overflow-hidden">
                                <span className="font-bold truncate w-full text-left">{currentUser.username}</span>
                                <span className="text-[10px] text-brand-600 font-bold">Editar Perfil</span>
                            </div>
                        )}
                    </button>

                    <div className={`pt-2 ${isSidebarCollapsed ? 'flex justify-center' : 'px-3'}`}>
                        {isSidebarCollapsed ? (
                            <div className="relative group cursor-pointer" title="Equipe Online">
                                <span className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-brand-200">
                                    {users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 5 * 60 * 1000)).length}
                                </span>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsOnlineListOpen(!isOnlineListOpen)}
                                    className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-2 hover:text-slate-600 focus:outline-none group"
                                >
                                    <span className="flex items-center gap-2">
                                        Equipe Online
                                        {!isOnlineListOpen && (
                                            <span className="bg-brand-100 text-brand-600 px-1.5 rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity">
                                                {users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 5 * 60 * 1000)).length}
                                            </span>
                                        )}
                                    </span>
                                    <ChevronRight size={14} className={`transform transition-transform ${isOnlineListOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isOnlineListOpen && (
                                    <div className="flex flex-wrap gap-1 animate-in slide-in-from-top-2 duration-200">
                                        {users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 5 * 60 * 1000)).map(u => (
                                            <UserAvatar key={u.id} user={u} size={28} showStatus={true} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className={`border-t ${theme.border} my-2`}></div>

                    <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium ${theme.text} opacity-70 hover:opacity-100 hover:bg-black/5 transition-all`} title="Configurações">
                        <Settings size={20} />{!isSidebarCollapsed && <span>Configurações</span>}
                    </button>

                    <button
                        onClick={() => {
                            const newMode = layoutMode === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL';
                            handleUpdateProfile({ layout_mode: newMode });
                        }}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-xs font-medium ${theme.text} opacity-60 hover:opacity-100 hover:bg-black/5 transition-all`}
                        title={layoutMode === 'HORIZONTAL' ? "Mudar para Vertical" : "Mudar para Horizontal"}
                    >
                        {layoutMode === 'HORIZONTAL' ? <PanelLeft size={16} /> : <PanelBottom size={16} className="rotate-180" />}
                        {!isSidebarCollapsed && <span>{layoutMode === 'HORIZONTAL' ? 'Menu Vertical' : 'Menu Horizontal'}</span>}
                    </button>


                    {/* Moved Atividades Here */}
                    <button
                        onClick={() => { setViewMode('activity'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-xs font-medium ${theme.text} opacity-60 hover:opacity-100 hover:bg-black/5 transition-all`}
                        title="Atividades"
                    >
                        <History size={16} />{!isSidebarCollapsed && <span>Atividades</span>}
                    </button>

                    <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all`} title="Sair">
                        <LogOut size={20} />{!isSidebarCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
                <header className="mb-2 flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">

                    {/* LEFT: Search (Desktop & Mobile) */}
                    <div className="order-2 md:order-1 flex items-center gap-2">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`p-1.5 ${theme.text} hover:bg-black/5 rounded-lg md:hidden shrink-0 border border-slate-200 bg-white`}
                        >
                            <Menu size={18} />
                        </button>

                        <div className="flex-1 md:w-64 max-w-sm relative group animate-slide z-40">
                            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors ${theme.subtext} group-focus-within:text-brand-600`} size={14} />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`w-full pl-8 pr-3 py-1.5 ${theme.card} rounded-full shadow-sm outline-none focus:ring-2 focus:ring-brand-500 text-xs md:text-sm transition-all text-current placeholder:opacity-50 border border-slate-200/60`}
                            />
                            {/* Autocomplete Dropdown */}
                            {searchTerm.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                                    {(() => {
                                        const allClients = Array.from(new Set(tasks.filter(t => t.client).map(t => t.client))).sort();
                                        const suggestions = allClients.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

                                        if (suggestions.length === 0) return <div className="p-3 text-xs text-slate-400 italic text-center">Nenhum cliente encontrado</div>;

                                        return (
                                            <ul className="max-h-60 overflow-y-auto custom-scrollbar">
                                                {suggestions.map(client => (
                                                    <li
                                                        key={client}
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setViewMode('clients');
                                                            setSearchTerm('');
                                                            setIsMobileMenuOpen(false);
                                                        }}
                                                        className="px-4 py-2 text-xs md:text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-600 cursor-pointer border-b border-slate-50 last:border-none flex items-center gap-2"
                                                    >
                                                        <User size={14} className="opacity-50" />
                                                        {client}
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CENTER: Date & Counters */}
                    <div className={`order-1 md:order-2 p-1.5 md:p-0 ${theme.header} md:bg-transparent rounded-xl md:rounded-none shadow-sm md:shadow-none border md:border-none ${theme.border} flex items-center justify-center gap-4 animate-fade`}>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight text-brand-600 leading-none mb-0.5">Hoje</span>
                            <span className={`text-xs md:text-sm font-bold ${theme.text} leading-none whitespace-nowrap`}>{formattedHeaderDate}</span>
                        </div>

                        <div className="h-6 w-px bg-slate-200/80" />

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5" title="Tarefas para hoje">
                                <div className="p-1 px-2 bg-brand-500/10 text-brand-600 rounded-md flex items-center gap-1.5 transition-transform hover:scale-105">
                                    <CalendarIcon size={12} />
                                    <span className="text-xs md:text-sm font-black">{todayTasksCount}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5" title="Notas de hoje">
                                <div className="p-1 px-2 bg-amber-500/10 text-amber-600 rounded-md flex items-center gap-1.5 transition-transform hover:scale-105">
                                    <StickyNote size={12} />
                                    <span className="text-xs md:text-sm font-black">{todayNotesCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="order-3 md:order-3 flex items-center justify-end gap-2">
                        {/* POLI Quick Chat / Suggestions Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setIsPoliPanelOpen(!isPoliPanelOpen)}
                                className={`bg-purple-100 text-purple-600 p-1.5 rounded-full hover:bg-purple-200 transition-all hover:scale-105 shadow-sm hidden md:flex relative ${isPoliPanelOpen ? 'ring-2 ring-purple-400 ring-offset-2' : ''}`}
                                title="Sugestões da POLI"
                            >
                                <Sparkles size={16} />
                                {suggestions.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                                        {suggestions.length}
                                    </span>
                                )}
                            </button>
                            {isPoliPanelOpen && (
                                <PoliPanel
                                    suggestions={suggestions}
                                    setSuggestions={setSuggestions}
                                    onClose={() => setIsPoliPanelOpen(false)}
                                    currentUser={currentUser}
                                />
                            )}
                        </div>

                        {viewMode === 'calendar' && (
                            <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg gap-0.5 shadow-sm">
                                {[
                                    { id: 'RIGHT', icon: PanelRight },
                                    { id: 'LEFT', icon: PanelLeft },
                                    { id: 'BOTTOM', icon: PanelBottom },
                                    { id: 'FULL', icon: Square }
                                ].map(lay => (
                                    <button
                                        key={lay.id}
                                        onClick={() => setCalendarLayout(lay.id)}
                                        className={`p-1 rounded-md transition-all ${calendarLayout === lay.id ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <lay.icon size={10} />
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }}
                            className="flex items-center justify-center md:gap-1.5 bg-brand-600 text-white font-bold w-8 h-8 md:w-auto md:px-4 md:py-1.5 rounded-full shadow-md hover:bg-brand-700 transition-all active:scale-95 group shrink-0 text-xs"
                        >
                            <Plus size={16} className="md:group-hover:rotate-90 transition-transform duration-300" />
                            <span className="hidden md:inline">Nova Tarefa</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 min-h-0 flex flex-col">
                    {viewMode === 'kanban' && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="mb-2 sticky top-0 bg-slate-100 z-30 -ml-6 pl-6 pr-6 py-2 border-b border-slate-200 shrink-0 flex items-center gap-3">
                                {/* Row 2: Categories Row (Compact Snapping Scroll) */}
                                <div className="flex-1 flex items-center gap-2 overflow-x-visible relative min-w-0">
                                    <div className="flex-1 flex space-x-2 overflow-x-auto custom-scrollbar scrollbar-hide snap-x select-none">
                                        {Object.entries(kanbanBoards).map(([key, board]) => {
                                            const category = customCategories.find(cat => cat.id === key);
                                            const isNative = !category || category.isNative;
                                            if (!isNative && key !== 'ALL') return null;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => setSelectedBoard(key)}
                                                    className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all border snap-start ${selectedBoard === key ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                >
                                                    {board.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Compact Editadas Dropdown */}
                                    {customCategories.some(cat => !cat.isNative) && (
                                        <div className="relative shrink-0" ref={customTypesDropdownRef}>
                                            <button
                                                onClick={() => setIsCustomTypesDropdownOpen(!isCustomTypesDropdownOpen)}
                                                className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 transition-all border ${customCategories.some(cat => !cat.isNative && selectedBoard === cat.id) ? 'bg-brand-100 border-brand-400 text-brand-700' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                                            >
                                                Editadas
                                                <ChevronDown size={12} className={`transition-transform duration-300 ${isCustomTypesDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isCustomTypesDropdownOpen && (
                                                <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 min-w-[160px] overflow-hidden py-1 animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar px-1">
                                                        {customCategories.filter(cat => !cat.isNative).map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => { setSelectedBoard(cat.id); setIsCustomTypesDropdownOpen(false); }}
                                                                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all ${selectedBoard === cat.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Filter Button & Popover (Moved to Right) */}
                                <div className="relative shrink-0">
                                    <button
                                        onClick={() => setIsKanbanFilterOpen(!isKanbanFilterOpen)}
                                        className={`h-8 px-3 rounded-lg flex items-center gap-2 transition-all border ${isKanbanFilterOpen ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <Filter size={14} />
                                        <span className="text-xs font-bold hidden md:inline">Filtros</span>
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${isKanbanFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isKanbanFilterOpen && (
                                        <div className="absolute top-full right-0 mt-2 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col gap-3 min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-200">
                                            {/* Date Selectors */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período</label>
                                                <div className="flex bg-slate-50 rounded-lg border border-slate-200 flex items-center h-9 px-1 overflow-hidden">
                                                    <select
                                                        value={kanbanFilterMode === 'DAY' ? kanbanDate.getDate() : 'ALL'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === 'ALL') {
                                                                setKanbanFilterMode('MONTH');
                                                            } else {
                                                                setKanbanFilterMode('DAY');
                                                                const newDate = new Date(kanbanDate);
                                                                newDate.setDate(parseInt(val));
                                                                setKanbanDate(newDate);
                                                            }
                                                        }}
                                                        className="bg-transparent text-xs font-bold text-slate-700 outline-none w-[60px] px-1 h-full cursor-pointer hover:bg-slate-100 transition-colors border-r border-slate-200"
                                                    >
                                                        <option value="ALL">Mês</option>
                                                        {Array.from({ length: new Date(kanbanDate.getFullYear(), kanbanDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => (
                                                            <option key={d} value={d}>Dia {String(d).padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={kanbanDate.getMonth()}
                                                        onChange={(e) => {
                                                            const newDate = new Date(kanbanDate);
                                                            newDate.setMonth(parseInt(e.target.value));
                                                            setKanbanDate(newDate);
                                                        }}
                                                        className="bg-transparent text-xs font-bold text-slate-700 outline-none w-[50px] px-1 h-full cursor-pointer hover:bg-slate-100 transition-colors border-r border-slate-200 appearance-none text-center"
                                                    >
                                                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                                                            <option key={i} value={i}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={kanbanDate.getFullYear()}
                                                        onChange={(e) => {
                                                            const newDate = new Date(kanbanDate);
                                                            newDate.setFullYear(parseInt(e.target.value));
                                                            setKanbanDate(newDate);
                                                        }}
                                                        className="bg-transparent text-xs font-bold text-brand-600 outline-none flex-1 px-1 h-full cursor-pointer hover:bg-slate-100 transition-colors appearance-none text-center"
                                                    >
                                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                            <option key={y} value={y}>{y}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                {/* User Filter */}
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visualizar</label>
                                                    <div className="flex bg-slate-100 p-0.5 rounded-lg h-9 border border-slate-200">
                                                        <button
                                                            onClick={() => setKanbanUserFilter('ALL')}
                                                            className={`flex-1 rounded-md text-[10px] font-bold uppercase transition-all ${kanbanUserFilter === 'ALL' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            Todas
                                                        </button>
                                                        <button
                                                            onClick={() => setKanbanUserFilter('MY')}
                                                            className={`flex-1 rounded-md text-[10px] font-bold uppercase transition-all ${kanbanUserFilter === 'MY' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            Minhas
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* View Mode */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layout</label>
                                                    <div className="flex bg-slate-100 p-0.5 rounded-lg h-9 border border-slate-200">
                                                        <button
                                                            onClick={() => setKanbanViewMode('list')}
                                                            className={`w-9 h-full flex items-center justify-center rounded-md transition-all ${kanbanViewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <LayoutList size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setKanbanViewMode('grid')}
                                                            className={`w-9 h-full flex items-center justify-center rounded-md transition-all ${kanbanViewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <LayoutGrid size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 flex gap-4 items-start overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
                                {Object.keys(TaskStatus).map(statusKey => {
                                    if (focusedColumn && focusedColumn !== statusKey) return null;
                                    const isFocused = focusedColumn === statusKey;
                                    const isCollapsed = collapsedColumns[statusKey];
                                    const customWidth = columnWidths[statusKey];
                                    const customHeight = columnHeights[statusKey];

                                    const priorities = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
                                    let columnTasks = kanbanBoards[selectedBoard]?.tasks.filter(t => t.status === statusKey) || [];

                                    // Ownership Filter
                                    if (kanbanUserFilter === 'MY') {
                                        columnTasks = columnTasks.filter(t =>
                                            t.user_id === currentUser.id ||
                                            (t.assigned_users && t.assigned_users.includes(currentUser.id))
                                        );
                                    }

                                    const colFilter = columnFilters[statusKey] || '';
                                    if (colFilter) {
                                        columnTasks = columnTasks.filter(t => (t.client || '').toLowerCase().includes(colFilter.toLowerCase()));
                                    }

                                    columnTasks.sort((a, b) => {
                                        const pA = priorities[a.priority] || 0;
                                        const pB = priorities[b.priority] || 0;
                                        if (pB !== pA) return pB - pA;
                                        return new Date(a.due_date || a.created_at || a.createdAt) - new Date(b.due_date || b.created_at || b.createdAt);
                                    });

                                    // Render Collapsed View (Squares)
                                    if (!isFocused && isCollapsed) {
                                        const label = StatusLabels[statusKey];
                                        const isDone = statusKey === TaskStatus.DONE;
                                        const isCanceled = statusKey === TaskStatus.CANCELED;
                                        const isPending = statusKey === TaskStatus.PENDING;
                                        const isInProgress = statusKey === TaskStatus.IN_PROGRESS;
                                        const isWaiting = statusKey === TaskStatus.WAITING_CLIENT;

                                        let bgClass = 'bg-white border-slate-200 shadow-slate-100';
                                        let textClass = 'text-slate-700';

                                        if (isDone) { bgClass = 'bg-emerald-50 border-emerald-200 shadow-emerald-100'; textClass = 'text-emerald-700'; }
                                        else if (isCanceled) { bgClass = 'bg-red-50 border-red-200 shadow-red-100'; textClass = 'text-red-700'; }
                                        else if (isPending) { bgClass = 'bg-slate-50 border-slate-200 shadow-slate-100'; textClass = 'text-slate-700'; }
                                        else if (isInProgress) { bgClass = 'bg-blue-50 border-blue-200 shadow-blue-100'; textClass = 'text-blue-700'; }
                                        else if (isWaiting) { bgClass = 'bg-amber-50 border-amber-200 shadow-amber-100'; textClass = 'text-amber-700'; }

                                        return (
                                            <div
                                                key={statusKey}
                                                id={`kanban-column-${statusKey}`}
                                                className={`w-28 h-28 ${bgClass} border-2 rounded-2xl flex flex-col items-center justify-center p-2 cursor-pointer hover:shadow-lg transition-all shrink-0 select-none relative group shadow-sm drop-target`}
                                                onClick={() => setCollapsedColumns(p => ({ ...p, [statusKey]: false }))}
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-4', 'ring-brand-500/20'); }}
                                                onDragLeave={(e) => { e.currentTarget.classList.remove('ring-4', 'ring-brand-500/20'); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('ring-4', 'ring-brand-500/20');
                                                    const taskId = e.dataTransfer.getData('taskId');
                                                    handleTaskDrop(taskId, statusKey);
                                                }}
                                            >
                                                {/* Corner Resize Handle to Expand */}
                                                <div
                                                    className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize hover:bg-brand-500/20 rounded-br-2xl"
                                                    onMouseDown={(e) => { e.stopPropagation(); setResizingColumn(statusKey); }}
                                                />

                                                <span className={`text-[10px] font-black uppercase text-center leading-tight mb-2 ${textClass}`}>
                                                    {label}
                                                </span>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${isDone ? 'bg-emerald-100 text-emerald-800' : isCanceled ? 'bg-red-100 text-red-800' : isPending ? 'bg-slate-100 text-slate-800' : isInProgress ? 'bg-blue-100 text-blue-800' : isWaiting ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                                                    {columnTasks.length}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Render Expanded View
                                    return (
                                        <div
                                            key={statusKey}
                                            id={`kanban-column-${statusKey}`}
                                            style={{
                                                width: isFocused ? '100%' : (customWidth || 320),
                                                height: '100%',
                                                minHeight: '300px'
                                            }}
                                            className={`${StatusBgColors[statusKey]} rounded-2xl p-4 border-2 border-transparent shadow-sm flex flex-col transition-all duration-300 relative ${isFocused ? 'max-w-5xl mx-auto' : 'shrink-0'}`}
                                            onDoubleClick={() => setFocusedColumn(isFocused ? null : statusKey)}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-500/30', 'bg-brand-50/10'); }}
                                            onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand-500/30', 'bg-brand-50/10'); }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove('border-brand-500/30', 'bg-brand-50/10');
                                                const taskId = e.dataTransfer.getData('taskId');
                                                handleTaskDrop(taskId, statusKey);
                                            }}
                                        >
                                            {/* Corner Resize Handle */}
                                            {!isFocused && (
                                                <div
                                                    className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize hover:bg-brand-500/30 rounded-br-2xl transition-colors z-20 flex items-end justify-end p-0.5 group"
                                                    onMouseDown={(e) => { e.stopPropagation(); setResizingColumn(statusKey); }}
                                                    title="Arraste para redimensionar (L x A)"
                                                >
                                                    <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-400 group-hover:border-brand-600 rounded-br-sm"></div>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-3 mb-5 px-1 shrink-0">
                                                <div className="flex justify-between items-center select-none">
                                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
                                                        {StatusLabels[statusKey]}
                                                        <span className="bg-white/60 px-2 py-0.5 rounded-full text-[10px] text-slate-600 shadow-sm border border-white/50">{columnTasks.length}</span>
                                                    </h3>

                                                    <div className="flex items-center gap-1">
                                                        {isFocused && (
                                                            <button onClick={() => setFocusedColumn(null)} className="flex items-center gap-1.5 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase text-slate-700 transition-all border border-slate-200 shadow-sm"><X size={14} /> Voltar</button>
                                                        )}
                                                        {!isFocused && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setColumnWidths(p => { const n = { ...p }; delete n[statusKey]; return n; });
                                                                        setColumnHeights(p => { const n = { ...p }; delete n[statusKey]; return n; });
                                                                    }}
                                                                    className="text-slate-400 hover:text-brand-600 p-1.5 hover:bg-white/50 rounded-full transition-colors"
                                                                    title="Resetar Tamanho"
                                                                >
                                                                    <RefreshCw size={14} />
                                                                </button>
                                                                <button onClick={() => setCollapsedColumns(p => ({ ...p, [statusKey]: true }))} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-white/50 rounded-full transition-colors" title="Recolher Aba"><ChevronLeft size={16} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Filtrar..."
                                                        value={columnFilters[statusKey] || ''}
                                                        onChange={e => setColumnFilters(p => ({ ...p, [statusKey]: e.target.value }))}
                                                        className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-white/40 border border-white/20 focus:bg-white transition-all outline-none placeholder:text-slate-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className={`overflow-y-auto flex-1 custom-scrollbar pr-1.5 ${kanbanViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 content-start' : 'space-y-3'}`}>
                                                {columnTasks.map(task => (
                                                    <TaskCard key={task.id} task={task} onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }} onDelete={handleDeleteTask} users={users} currentUser={currentUser} />
                                                ))}
                                                {columnTasks.length === 0 && (
                                                    <div className={`${kanbanViewMode === 'grid' ? 'col-span-1 sm:col-span-2' : ''} text-center py-8 text-slate-500 text-sm italic opacity-75 bg-white/20 rounded-lg mx-2 border border-white/20`}>
                                                        Nenhuma tarefa
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                    }
                    {
                        viewMode === 'calendar' && (
                            <div className={`flex-1 flex overflow-hidden relative ${calendarLayout === 'BOTTOM' ? 'flex-col' : calendarLayout === 'LEFT' ? 'flex-row-reverse' : 'flex-row'}`}>

                                <div className="flex-1 overflow-auto bg-white md:rounded-xl m-1 md:m-4 shadow-sm border border-slate-200">
                                    <CalendarView
                                        tasks={tasks.filter(t => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)}
                                        onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                                        onUpdateTask={handleSaveTask}
                                        notes={notes}
                                        currentUser={currentUser}
                                    />
                                </div>
                                {isNotesPanelOpen && calendarLayout !== 'FULL' && (
                                    <div className={`shrink-0 flex flex-col ${calendarLayout === 'BOTTOM' ? 'h-64 px-4 pb-4' : 'h-[calc(100%-2rem)] my-4 mr-4 mx-4'}`}>
                                        <NotesPanel
                                            isOpen={isNotesPanelOpen}
                                            onClose={() => setIsNotesPanelOpen(false)}
                                            notes={notes}
                                            onSave={handleSaveNote}
                                            onDelete={handleDeleteNote}
                                            currentUser={currentUser}
                                            horizontal={calendarLayout === 'BOTTOM'}
                                        />
                                    </div>
                                )}
                                {!isNotesPanelOpen && calendarLayout !== 'FULL' && (
                                    <button
                                        onClick={() => setIsNotesPanelOpen(true)}
                                        className={`bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-colors shadow-sm ${calendarLayout === 'BOTTOM' ? 'h-10 mx-4 mb-4 rounded-b-xl border-t-0' : 'w-10 md:w-10 my-1 md:my-4 mr-1 md:mr-4 rounded-r-xl border-l-0 py-4 flex-col'}`}
                                        title="Abrir Notas"
                                    >
                                        <StickyNote size={20} className={calendarLayout === 'BOTTOM' ? 'mr-3' : 'mb-4'} />
                                        <div className={`${calendarLayout === 'BOTTOM' ? '' : 'rotate-90 origin-center'} whitespace-nowrap text-[10px] font-black uppercase tracking-widest ${calendarLayout === 'BOTTOM' ? '' : 'mt-4'}`}>Notas</div>
                                    </button>
                                )}
                            </div>
                        )
                    }
                    {viewMode === 'activity' && <div className="flex-1 overflow-y-auto custom-scrollbar"><ActivityLogView logs={logs} users={users} /></div>}
                    {viewMode === 'clients' && <div className="flex-1 overflow-y-auto custom-scrollbar"><ClientHistoryView tasks={tasks} onOpenClientReport={handleOpenClientReport} users={users} currentUser={currentUser} onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); }} selectedClient={selectedClient} setSelectedClient={setSelectedClient} /></div>}
                    {viewMode === 'travels' && <div className="flex-1 overflow-y-auto custom-scrollbar"><TravelsView tasks={tasks} onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); }} /></div>}
                    {viewMode === 'map' && <div className="flex-1 flex flex-col"><MapView tasks={tasks} mapFilter={mapFilter} setMapFilter={setMapFilter} users={users} /></div>}
                    {viewMode === 'reports' && <ReportsView tasks={tasks} users={users} currentUser={currentUser} categories={customCategories} onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); }} />}
                    {viewMode === 'poli' && <PoliView currentUser={currentUser} tasks={tasks} clients={Array.from(new Set(tasks.filter(t => t.client).map(t => ({ id: t.client, name: t.client })))) /* Mock clients from tasks for now */} suggestions={suggestions} setSuggestions={setSuggestions} />}
                </div >
            </main >

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask}
                customCategories={customCategories}
                currentUser={currentUser}
                onDelete={handleDeleteTask}
                logs={logs}
                users={users}
                allClients={allClients}
                onOpenReport={handleOpenReport}
            />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} customCategories={customCategories} onSaveCategories={handleSaveCategories} tasks={tasks} />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} currentUser={currentUser} onUpdate={handleUpdateProfile} />

            {
                isReportOpen && reportTask && reportData && (
                    <TaskReport
                        task={reportTask}
                        data={reportData}
                        onClose={() => setIsReportOpen(false)}
                        currentUser={currentUser}
                    />
                )
            }

            {
                isClientReportOpen && clientReportData && (
                    <ClientReport
                        clientName={clientReportData.clientName}
                        tasks={clientReportData.tasks}
                        filters={clientReportData.filters}
                        onClose={() => setIsClientReportOpen(false)}
                        currentUser={currentUser}
                    />
                )
            }
        </div >
    );
};
export default App;
