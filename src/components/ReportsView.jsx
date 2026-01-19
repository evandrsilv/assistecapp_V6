import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Trash2, ArrowRight, Clock, User, Calendar, Eye, Edit, Printer, X, ChevronDown, Image as ImageIcon, Paperclip } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { CategoryLabels } from '../constants/taskConstants';

const ReportsView = ({ onEditTask, currentUser, categories = [] }) => {
    const [reports, setReports] = useState([]);

    // Helper to get friendly category label
    const getCategoryLabel = (catValue) => {
        if (!catValue) return 'N/A';
        // 1. Check Native Dictionary
        if (CategoryLabels[catValue]) return CategoryLabels[catValue];
        // 2. Check Custom Categories List
        const customCat = categories.find(c => c.label === catValue || c.id === catValue); // DB might store Label or ID
        if (customCat) return customCat.label;
        // 3. Fallback to value itself
        return catValue;
    };
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [dayFilter, setDayFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [taskTypeFilter, setTaskTypeFilter] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('task_reports')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("Erro ao buscar relatórios:", error);
            alert("Erro ao carregar relatórios: " + error.message);
        } else {
            console.log("Relatórios carregados:", data);
            // Fetch related task and user data separately
            const enrichedReports = await Promise.all(data.map(async (report) => {
                const { data: task } = await supabase.from('tasks').select('id, title, client, category, trip_cost, trip_cost_currency').eq('id', report.task_id).single();
                const { data: user } = await supabase.from('users').select('username, color').eq('id', report.user_id).single();
                return { ...report, tasks: task, users: user };
            }));
            setReports(enrichedReports || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este relatório?')) return;
        const { error } = await supabase.from('task_reports').delete().eq('id', id);
        if (!error) fetchReports();
    };

    const handlePrint = (report) => {
        // Convert Markdown to HTML
        const convertMarkdownToHTML = (markdown) => {
            if (!markdown) return '';
            return markdown
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                .replace(/^\- (.*$)/gim, '<li>$1</li>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
        };

        const formattedContent = convertMarkdownToHTML(report.content || report.raw_notes || '');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${report.title}</title>
                    <style>
                        @media print {
                            @page { margin: 2cm; }
                        }
                        body { 
                            font-family: 'Segoe UI', Arial, sans-serif; 
                            padding: 40px;
                            max-width: 900px;
                            margin: 0 auto;
                            line-height: 1.6;
                            color: #1e293b;
                        }
                        h1 { 
                            color: #0f172a; 
                            font-size: 28px;
                            margin-bottom: 10px;
                            border-bottom: 3px solid #3b82f6;
                            padding-bottom: 10px;
                        }
                        h2 { 
                            color: #334155; 
                            font-size: 22px;
                            margin-top: 30px;
                            margin-bottom: 15px;
                            border-left: 4px solid #3b82f6;
                            padding-left: 15px;
                        }
                        h3 { 
                            color: #475569; 
                            font-size: 18px;
                            margin-top: 20px;
                            margin-bottom: 10px;
                        }
                        .meta { 
                            background: #f1f5f9;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 15px;
                        }
                        .meta-item {
                            font-size: 14px;
                        }
                        .meta-item strong { 
                            color: #0f172a;
                            display: block;
                            margin-bottom: 5px;
                        }
                        .content { 
                            line-height: 1.8;
                            font-size: 15px;
                        }
                        .content p {
                            margin-bottom: 15px;
                        }
                        .content strong {
                            color: #0f172a;
                        }
                        .content li {
                            margin-bottom: 8px;
                            margin-left: 20px;
                        }
                        img { 
                            max-width: 100%; 
                            margin: 20px 0;
                            border-radius: 8px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        .media-section {
                            margin-top: 30px;
                            page-break-inside: avoid;
                        }
                        .media-section h2 {
                            margin-bottom: 20px;
                        }
                        .media-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                            gap: 15px;
                        }
                    </style>
                </head>
                <body>
                    <h1>${report.title}</h1>
                    <div class="meta">
                        <div class="meta-item"><strong>Cliente:</strong> ${report.tasks?.client || 'N/A'}</div>
                        <div class="meta-item"><strong>Categoria:</strong> ${report.tasks?.category || 'N/A'}</div>
                        <div class="meta-item"><strong>Data:</strong> ${new Date(report.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        <div class="meta-item"><strong>Status:</strong> ${report.status === 'FINALIZADO' ? 'Finalizado' : 'Em Aberto'}</div>
                        ${report.tasks?.trip_cost ? `
                            <div class="meta-item"><strong>Custo da Viagem:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: report.tasks.trip_cost_currency || 'BRL' }).format(report.tasks.trip_cost)}</div>
                        ` : ''}
                    </div>
                    <div class="content">
                        <p>${formattedContent}</p>
                    </div>
                    ${report.media_urls && report.media_urls.length > 0 ? `
                        <div class="media-section">
                            <h2>Anexos</h2>
                            <div class="media-grid">
                                ${report.media_urls.map(m => {
            if (m.type === 'image') return `<img src="${m.url}" alt="Evidência" />`;
            return `<div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px;"><strong>Documento:</strong> ${m.name || 'Arquivo'}</div>`;
        }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const handleFileView = (url, filename = 'arquivo') => {
        if (!url || !url.startsWith('data:')) {
            window.open(url, '_blank');
            return;
        }

        try {
            const parts = url.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);

            // Se for imagem ou PDF, tentar abrir em nova aba
            if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.location.href = blobUrl;
                } else {
                    // Fallback para download se o bloqueador de popups agir
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    link.click();
                }
            } else {
                // Para documentos (Excel/Word), forçar download
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.click();
            }
        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            alert("Não foi possível abrir este arquivo.");
        }
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.tasks?.client?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesClient = !clientFilter || r.tasks?.client?.toLowerCase().includes(clientFilter.toLowerCase());
        const matchesTaskType = !taskTypeFilter || r.tasks?.category?.toLowerCase().includes(taskTypeFilter.toLowerCase());

        const reportDate = new Date(r.updated_at);
        const matchesYear = !yearFilter || reportDate.getFullYear().toString() === yearFilter;
        const matchesMonth = !monthFilter || (reportDate.getMonth() + 1).toString() === monthFilter;
        const matchesDay = !dayFilter || reportDate.getDate().toString() === dayFilter;

        return matchesSearch && matchesStatus && matchesClient && matchesTaskType && matchesYear && matchesMonth && matchesDay;
    });

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-brand-600" /> Relatórios Inteligentes
                    </h1>
                    <p className="text-slate-500 text-sm">Central de documentos técnicos e evidências.</p>
                </div>
                <button onClick={fetchReports} className="text-brand-600 font-bold text-sm hover:underline">Atualizar</button>
            </div>

            {/* Filters Bar - Cascading Style */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                {/* Client Filter */}
                <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Filtrar Cliente..."
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 min-w-[140px]"
                >
                    <option value="ALL">Todos Status</option>
                    <option value="DRAFT">Parciais</option>
                    <option value="FINALIZADO">Finais</option>
                </select>

                {/* Task Type Filter - Dynamic & Cascading */}
                <select
                    value={taskTypeFilter}
                    onChange={(e) => setTaskTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 min-w-[140px]"
                >
                    <option value="">Todos Tipos</option>
                    {/* 
                        Cascading Logic: Show categories present in reports that match CURRENT Client/Status/Date filters.
                        We filter 'reports' by everything EXCEPT the category filter itself to see what's available.
                     */}
                    {[...new Set(
                        reports.filter(r => {
                            const matchesSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                r.tasks?.client?.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
                            const matchesClient = !clientFilter || r.tasks?.client?.toLowerCase().includes(clientFilter.toLowerCase());

                            const reportDate = new Date(r.updated_at);
                            const matchesYear = !yearFilter || reportDate.getFullYear().toString() === yearFilter;
                            const matchesMonth = !monthFilter || (reportDate.getMonth() + 1).toString() === monthFilter;
                            const matchesDay = !dayFilter || reportDate.getDate().toString() === dayFilter;

                            // Include logic: Match everything BUT category
                            return matchesSearch && matchesStatus && matchesClient && matchesYear && matchesMonth && matchesDay;
                        })
                            .map(r => r.tasks?.category)
                            .filter(Boolean)
                    )].sort().map(cat => (
                        <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                    ))}
                </select>

                {/* Date Filter - Simplified to Year/Month */}
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Ano"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-20 focus:outline-none focus:border-brand-500"
                    />
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 min-w-[120px]"
                    >
                        <option value="">Todos Meses</option>
                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="text-center text-slate-500 py-12">Carregando...</p>
                ) : filteredReports.length === 0 ? (
                    <p className="text-center text-slate-500 py-12">Nenhum relatório encontrado.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReports.map(report => (
                            <div key={report.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 flex-1">{report.title}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${report.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {report.status === 'FINALIZADO' ? 'Relatório Final' : 'Relatório Parcial'}
                                    </span>
                                </div>

                                <div className="space-y-1.5 mb-3">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                                        <User size={12} />
                                        <span className="font-bold">{report.tasks?.client || 'Cliente não informado'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <FileText size={12} />
                                        <span>{getCategoryLabel(report.tasks?.category)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <Clock size={12} />
                                        <span>Atualizado em {new Date(report.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: report.users?.color }}>
                                            {report.users?.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600">{report.users?.username}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setSelectedReport(report)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Visualizar">
                                            <Eye size={14} />
                                        </button>
                                        <button onClick={async () => {
                                            const { data: task } = await supabase.from('tasks').select('*').eq('id', report.task_id).single();
                                            if (task) onEditTask(task);
                                        }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar Tarefa">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => handlePrint(report)} className="p-1.5 text-slate-600 hover:bg-slate-50 rounded transition-colors" title="Imprimir">
                                            <Printer size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(report.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Report Viewer Modal */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReport(null)}>
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">{selectedReport.title}</h2>
                            <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="font-bold text-slate-700">Cliente:</span> {selectedReport.tasks?.client || 'N/A'}</div>
                                <div><span className="font-bold text-slate-700">Categoria:</span> {getCategoryLabel(selectedReport.tasks?.category)}</div>
                                <div><span className="font-bold text-slate-700">Status:</span> {selectedReport.status === 'FINALIZADO' ? 'Relatório Final' : 'Relatório Parcial'}</div>
                                <div><span className="font-bold text-slate-700">Data:</span> {new Date(selectedReport.updated_at).toLocaleDateString()}</div>
                                {selectedReport.tasks?.trip_cost > 0 && (
                                    <div><span className="font-bold text-slate-700">Custo:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: selectedReport.tasks.trip_cost_currency || 'BRL' }).format(selectedReport.tasks.trip_cost)}</div>
                                )}
                            </div>

                            {/* Visualização de Mídias Anexadas */}
                            {selectedReport.media_urls && selectedReport.media_urls.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <details className="group" open>
                                        <summary className="cursor-pointer list-none">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    <Paperclip size={16} />
                                                    VER ANEXOS ({selectedReport.media_urls.length})
                                                </h3>
                                                <ChevronDown size={16} className="text-slate-400 group-open:rotate-180 transition-transform" />
                                            </div>
                                        </summary>
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {selectedReport.media_urls.map((item, idx) => (
                                                <div key={idx} className="relative bg-white rounded-lg overflow-hidden border border-slate-200 group flex flex-col">
                                                    {item.type === 'image' ? (
                                                        <button
                                                            onClick={() => handleFileView(item.url, item.name || `imagem_${idx}`)}
                                                            className="block relative h-40 w-full overflow-hidden"
                                                        >
                                                            <img
                                                                src={item.url}
                                                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                                                alt={`Anexo ${idx + 1}`}
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleFileView(item.url, item.name || `documento_${idx}`)}
                                                            className="flex flex-col items-center justify-center h-40 bg-slate-50 hover:bg-slate-100 transition-colors w-full"
                                                        >
                                                            <FileText size={48} className="text-slate-400 mb-2" />
                                                            <span className="text-[10px] font-bold text-slate-600 px-2 text-center break-all line-clamp-2">
                                                                {item.name || 'Documento'}
                                                            </span>
                                                            <div className="mt-2 text-[9px] text-brand-600 font-bold uppercase">Baixar / Abrir</div>
                                                        </button>
                                                    )}
                                                    <div className="p-2 border-t border-slate-100 flex justify-between items-center">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                            {item.type === 'image' ? 'Imagem' : 'Documento'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            )}

                            <div>
                                <h3 className="font-bold text-slate-700 mb-2">Conteúdo</h3>
                                <div
                                    className="prose prose-sm max-w-none leading-relaxed"
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.8'
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: (selectedReport.content || selectedReport.raw_notes || 'Sem conteúdo')
                                            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
                                            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-l-4 border-blue-500 pl-3">$1</h2>')
                                            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
                                            .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-slate-900">$1</strong>')
                                            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                                            .replace(/^\- (.*$)/gim, '<li class="ml-5 mb-1">$1</li>')
                                            .replace(/\n\n/g, '</p><p class="mb-3">')
                                            .replace(/\n/g, '<br>')
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 border-t border-slate-200">
                            <button onClick={async () => {
                                const { data: task } = await supabase.from('tasks').select('*').eq('id', selectedReport.task_id).single();
                                if (task) { onEditTask(task); setSelectedReport(null); }
                            }} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                <Edit size={16} /> Editar Tarefa
                            </button>
                            <button onClick={() => handlePrint(selectedReport)} className="flex-1 py-2 bg-slate-600 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
