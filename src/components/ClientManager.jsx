import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Search, MapPin, Phone, Save, Briefcase, ChevronLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ClientManager = ({ isOpen, onClose, currentUser }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        phone: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: ''
    });

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchClients();
            resetForm();
        }
    }, [isOpen, currentUser]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            // alert('Erro ao carregar clientes'); // Suppressed alert to reduce noise, console is enough
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            // Build Address String intelligently
            const parts = [];
            if (formData.street) parts.push(formData.street);
            if (formData.number) parts.push(formData.number);

            let addressStr = parts.join(', ');
            if (formData.neighborhood) addressStr += ` - ${formData.neighborhood}`;
            if (formData.city || formData.state) addressStr += ` - ${formData.city || ''}/${formData.state || ''}`;

            const payload = {
                name: formData.name.trim(),
                phone: formData.phone,
                street: formData.street,
                number: formData.number,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
                user_id: currentUser.id,
                address: addressStr // Cleaner address string
            };

            let error;
            if (formData.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', formData.id);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('clients')
                    .insert(payload);
                error = insertError;
            }

            if (error) {
                // Detailed error handling
                if (error.code === '23505') {
                    alert('Já existe um cliente cadastrado com este nome (ou endereço/telefone se forem únicos). Verifique se não há duplicidade.');
                } else {
                    console.error('Supabase Error:', error);
                    alert(`Erro ao salvar: ${error.message || error.details || 'Erro desconhecido'}`);
                }
                // Do not throw here, just return to stop processing
                return;
            }

            await fetchClients();
            resetForm();
            setIsEditing(false);
        } catch (error) {
            console.error('Unexpected Javascript Error:', error);
            alert('Um erro inesperado ocorreu. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchClients();
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Erro ao excluir cliente');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (client) => {
        setFormData({
            id: client.id,
            name: client.name,
            phone: client.phone || '',
            street: client.street || '',
            number: client.number || '',
            neighborhood: client.neighborhood || '',
            city: client.city || '',
            state: client.state || '',
            // If editing an old legacy record that only has 'address', we might want to try to parse it or just leave blank
            // For now, simpler to assume new fields or manual entry.
        });
        setIsEditing(true);
    };

    const resetForm = () => {
        setFormData({ id: null, name: '', phone: '', street: '', number: '', neighborhood: '', city: '', state: '' });
        setIsEditing(false);
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        {isEditing && (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="md:hidden p-2 -ml-2 hover:bg-slate-200 rounded-lg text-brand-600 transition-colors"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div className={`bg-orange-100 p-2 md:p-2.5 rounded-xl text-orange-600 ${isEditing ? 'hidden md:block' : 'block'}`}>
                            <Briefcase size={24} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate">
                                {isEditing ? (
                                    <span className="md:hidden">{formData.id ? 'Editar Cliente' : 'Novo Cliente'}</span>
                                ) : null}
                                <span className={isEditing ? 'hidden md:inline' : ''}>Gerenciar Clientes</span>
                            </h2>
                            <p className={`text-xs md:text-sm text-slate-500 truncate ${isEditing ? 'hidden md:block' : 'block'}`}>
                                Cadastre clientes para usar nas tarefas
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / List */}
                    <div className={`${isEditing ? 'hidden md:flex' : 'flex'} w-full md:w-1/2 border-r border-slate-100 flex-col bg-white overflow-hidden`}>
                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar clientes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            <button
                                onClick={() => { resetForm(); setIsEditing(true); }}
                                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium text-sm flex items-center justify-center gap-2 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all mb-4"
                            >
                                <Plus size={18} /> Novo Cliente
                            </button>

                            {filteredClients.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p className="text-sm">Nenhum cliente encontrado</p>
                                </div>
                            ) : (
                                filteredClients.map(client => (
                                    <div
                                        key={client.id}
                                        className={`p-4 rounded-xl border transition-all text-left group ${formData.id === client.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-700">{client.name}</h3>
                                                {client.address_verified && (
                                                    <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Endereço Verificado pela POLI">
                                                        <ShieldCheck size={10} />
                                                        POLI
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEdit(client); }}
                                                    className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                                                    className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {(client.street || client.address) && (
                                            <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-1">
                                                <MapPin size={12} className="mt-0.5 shrink-0" />
                                                <span className="line-clamp-2">
                                                    {client.street
                                                        ? `${client.street}, ${client.number || 'S/N'} - ${client.city}/${client.state}`
                                                        : client.address}
                                                </span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Phone size={12} />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Content / Edit Form */}
                    <div className={`${isEditing ? 'flex' : 'hidden md:flex'} w-full md:w-1/2 bg-slate-50 flex-col items-center justify-start md:justify-center p-0 md:p-8 overflow-y-auto custom-scrollbar`}>
                        {isEditing ? (
                            <form onSubmit={handleSave} className="w-full md:max-w-sm bg-white p-6 md:rounded-2xl md:shadow-sm md:border md:border-slate-200 animate-in zoom-in-95 duration-200 my-0 md:my-auto min-h-full md:min-h-0">
                                <h3 className="hidden md:flex text-lg font-bold text-slate-800 mb-6 items-center gap-2">
                                    {formData.id ? <Edit2 size={18} className="text-brand-500" /> : <Plus size={18} className="text-brand-500" />}
                                    {formData.id ? 'Editar Cliente' : 'Novo Cliente'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome do Cliente *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                            placeholder="Ex: Empresa Ltda"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Rua</label>
                                            <input
                                                type="text"
                                                value={formData.street}
                                                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="Rua das Flores"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Número</label>
                                            <input
                                                type="text"
                                                value={formData.number}
                                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="123"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Bairro</label>
                                        <input
                                            type="text"
                                            value={formData.neighborhood}
                                            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                            placeholder="Centro"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Cidade</label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="São Paulo"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">UF</label>
                                            <input
                                                type="text"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="SP"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Telefone (Opcional)</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                            placeholder="Ex: (11) 99999-9999"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-brand hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Salvando...' : <><Save size={16} /> Salvar</>}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center text-slate-400">
                                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Briefcase size={32} className="opacity-50" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-600 mb-2">Selecione ou Crie um Cliente</h3>
                                <p className="text-sm max-w-xs mx-auto">Gerencie seus contatos para agilizar o preenchimento de tarefas.</p>
                                <button
                                    onClick={() => { resetForm(); setIsEditing(true); }}
                                    className="mt-6 px-6 py-2.5 bg-brand-600 text-white rounded-full font-bold text-sm shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all"
                                >
                                    Criar Novo Cliente
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientManager;
