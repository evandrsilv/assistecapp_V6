import React, { forwardRef } from 'react';

const PrintableReport = forwardRef(({ task, content, currentUser, taskTypes, signatureDate, status }, ref) => {
    const isFinalized = status === 'FINALIZADO';
    // Helper para formatar categoria
    const getCategoryName = (catId) => {
        if (!catId) return 'N/A';
        const type = taskTypes.find(t => t.id === catId || t.name === catId);
        return type ? type.name : catId;
    };

    return (
        <div ref={ref} className="p-10 bg-white w-[210mm] text-slate-800 font-sans">
            {/* Header AssisTec */}
            <div className="flex justify-between items-center border-b-2 border-brand-600 pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-brand-600">AssisTec</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {isFinalized ? 'RELATÓRIO TÉCNICO FINAL' : 'RELATÓRIO TÉCNICO PARCIAL'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-sm">OS: {task.op || 'N/A'}</p>
                    <p className="text-[10px] text-slate-500">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block">Cliente</label>
                    <p className="font-bold text-sm text-slate-700">{task.client || 'N/A'}</p>
                </div>
                <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block">Tipo de Tarefa</label>
                    <p className="font-bold text-sm text-slate-700">{getCategoryName(task.category)}</p>
                </div>
                <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block">Identificação (PED/IT/RNC)</label>
                    <p className="font-bold text-sm text-slate-700">{task.pedido || '-'}/{task.item || '-'}/{task.rnc || '-'}</p>
                </div>
            </div>

            {/* Content Body */}
            <div className="mb-6">
                <h2 className="text-xs uppercase font-black text-brand-600 mb-2 border-b border-brand-200 pb-1">Descrição Técnica</h2>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
            </div>

            {/* Signatures */}
            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
                <div className="text-center w-48">
                    <div className="border-b border-slate-400 h-8"></div>
                    <p className="text-[10px] mt-1 uppercase font-bold">Assinatura do Técnico</p>
                    <p className="text-[8px] text-slate-500">{currentUser?.username}</p>
                    {signatureDate && <p className="text-[8px] text-slate-400">{new Date(signatureDate).toLocaleString()}</p>}
                </div>
                <div className="text-center w-48">
                    <div className="border-b border-slate-400 h-8"></div>
                    <p className="text-[10px] mt-1 uppercase font-bold">Assinatura do Cliente</p>
                </div>
            </div>
        </div>
    );
});

export default PrintableReport;
