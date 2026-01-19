import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Loader2, Plus, X, Paperclip, FileText, Trash2, Eye, CheckCircle2, AlertCircle, FileDown, Save, Printer, CheckCircle, Edit } from 'lucide-react';
import { generateReportWithGemini, analyzeMediaWithIA } from '../services/aiService';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { useReactToPrint } from 'react-to-print';

import { CategoryLabels, INITIAL_NATIVE_CATEGORIES } from '../constants/taskConstants';
import PrintableReport from './PrintableReport';

// Configurar o worker do PDF.js para processamento no frontend
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Tipos de tarefa nativos
const NATIVE_TASK_TYPES = INITIAL_NATIVE_CATEGORIES.map(cat => ({
    id: cat.id,
    name: cat.label,
    isNative: true
}));

const ReportEditor = ({ task: initialTask, report, onSave, onFinalize, currentUser, onAddStage, onOpenPrint, onClose }) => {
    // Estado para manter os dados completos da tarefa (incluindo OP, Pedido, etc.)
    const [task, setTask] = useState(initialTask);

    const [manualStatus, setManualStatus] = useState(report?.status || 'EM_ABERTO');
    const isFinalized = manualStatus === 'FINALIZADO';

    // Definindo título inicial baseado no status
    const defaultTitle = manualStatus === 'FINALIZADO'
        ? `Relatório Final - ${task.client || ''}`
        : `Relatório Parcial - ${task.client || ''}`;

    const [title, setTitle] = useState(report?.title || defaultTitle);
    const [taskTypes, setTaskTypes] = useState(NATIVE_TASK_TYPES);
    const [rawNotes, setRawNotes] = useState(report?.raw_notes || '');
    const [content, setContent] = useState(report?.content || '');
    const [mediaList, setMediaList] = useState(report?.media_urls || []);
    const [suggestedActions, setSuggestedActions] = useState(report?.suggested_actions || []);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingMediaIdx, setEditingMediaIdx] = useState(null);
    const [tempDescription, setTempDescription] = useState('');
    const [useAI, setUseAI] = useState(true);
    const [showPrintPreview, setShowPrintPreview] = useState(false);


    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const pdfRef = useRef(null);

    const confirmPrint = () => {
        // Lógica nativa baseada na aba Relatórios (ReportsView.jsx)
        const printWindow = window.open('', '_blank');

        // Helper to format content
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

        const formattedContent = convertMarkdownToHTML(content || rawNotes || '');
        const currentCategoryName = taskTypes.find(t => t.id === task.category_id || t.name === task.category)?.name
            || CategoryLabels[task.category_id || task.category]
            || task.category
            || 'N/A';
        const currentDate = new Date().toLocaleDateString('pt-BR');

        // Styles from ReportsView.jsx adapted slightly for editing context
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório - ${task.client || 'Sem Cliente'}</title>
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
                        .meta-item { font-size: 14px; }
                        .meta-item strong { color: #0f172a; display: block; margin-bottom: 5px; }
                        .content { line-height: 1.8; font-size: 15px; }
                        .content p { margin-bottom: 15px; }
                        .content strong { color: #0f172a; }
                        .content li { margin-bottom: 8px; margin-left: 20px; }
                        img { max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .media-section { margin-top: 30px; page-break-inside: avoid; }
                        .media-section h2 { margin-bottom: 20px; }
                        .media-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
                        .signatures {
                            margin-top: 50px;
                            padding-top: 30px;
                            border-top: 1px solid #cbd5e1;
                            display: flex;
                            justify-content: space-between;
                            page-break-inside: avoid;
                        }
                        .sig-block { text-align: center; width: 45%; }
                        .sig-line { border-bottom: 1px solid #1e293b; height: 30px; margin-bottom: 10px; }
                        .sig-role { font-size: 10px; text-transform: uppercase; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>AssisTec - ${manualStatus === 'FINALIZADO' ? 'Relatório Final' : 'Relatório Parcial'}</h1>
                    <div class="meta">
                        <div class="meta-item"><strong>Cliente:</strong> ${task.client || 'N/A'}</div>
                        <div class="meta-item"><strong>Categoria:</strong> ${currentCategoryName}</div>
                        <div class="meta-item"><strong>OS:</strong> ${task.op || task.os_number || 'N/A'}</div>
                        <div class="meta-item"><strong>Data:</strong> ${currentDate}</div>
                        <div class="meta-item"><strong>ID:</strong> ${task.purchase_order || '-'}/${task.item_number || '-'}/${task.rnc_number || '-'}</div>
                    </div>
                    
                    <div class="content">
                        ${formattedContent ? formattedContent : '<p><em>Sem descrição técnica.</em></p>'}
                    </div>

                    ${mediaList && mediaList.length > 0 ? `
                        <div class="media-section">
                            <h2>Anexos</h2>
                            <div class="media-grid">
                                ${mediaList.map(m => {
            const mUrl = m.url || (m.file ? URL.createObjectURL(m.file) : '');
            if (m.type === 'image') return `<img src="${mUrl}" alt="${m.name}" />`;
            return `<div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center;"><strong>Documento:</strong> ${m.name || 'Arquivo'}</div>`;
        }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="signatures">
                        <div class="sig-block">
                            <div class="sig-line"></div>
                            <div class="sig-role">Técnico Responsável</div>
                            <div style="font-size: 10px; color: #64748b;">${currentUser?.username || ''}</div>
                        </div>
                        <div class="sig-block">
                            <div class="sig-line"></div>
                            <div class="sig-role">Cliente</div>
                        </div>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        // Delay to allow images to load
        setTimeout(() => {
            printWindow.print();
            setShowPrintPreview(false); // Close preview modal after print trigger
        }, 1000);
    };

    const handleOpenPrintPreview = () => {
        setShowPrintPreview(true);
    };

    // Efeito para carregar dados completos da tarefa e tipos (native + custom)
    useEffect(() => {
        const loadData = async () => {
            // 1. Carregar dados completos da tarefa (garantir OP, Pedido, etc.)
            if (initialTask?.id) {
                const { data: fullTask, error: taskError } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', initialTask.id)
                    .single();

                if (!taskError && fullTask) {
                    setTask(fullTask);
                }
            }

            // 2. Carregar categorias customizadas
            try {
                // Tenta buscar na tabela nova de categorias customizadas
                const { data: customCats, error: customError } = await supabase
                    .from('custom_categories')
                    .select('*');

                if (!customError && customCats) {
                    const formattedCustom = customCats.map(c => ({
                        id: c.id,
                        name: c.label || c.name, // Fallback safe
                        isNative: false
                    }));
                    setTaskTypes([...NATIVE_TASK_TYPES, ...formattedCustom]);
                } else {
                    // Se falhar ou tabela não existir, tenta task_types (legado)
                    const { data: legacyCats, error: legacyError } = await supabase
                        .from('task_types')
                        .select('id, name');

                    if (!legacyError && legacyCats) {
                        setTaskTypes([...NATIVE_TASK_TYPES, ...legacyCats]);
                    }
                }
            } catch (err) {
                setTaskTypes(formattedNative);
            }
        };
        loadData();
    }, [initialTask]);

    // --- Resiliência: LocalStorage para Rascunhos ---
    useEffect(() => {
        const draftKey = `assistec_draft_report_${task.id}`;
        if (!report?.id) { // Só carrega draft se não houver um relatório salvo no DB (novo relatório)
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                setRawNotes(draft.rawNotes || '');
                setContent(draft.content || '');
                setTitle(draft.title || title);
                if (draft.mediaList) {
                    setMediaList(draft.mediaList);
                }
            }
        } else if (report?.media_urls && Array.isArray(report.media_urls)) {
            // Load existing media from saved report
            setMediaList(report.media_urls.map(m => ({ ...m, file: null })));
        }
    }, [task.id, report?.id]);

    useEffect(() => {
        const draftKey = `assistec_draft_report_${task.id}`;
        const timeout = setTimeout(() => {
            // Salvar rascunho incluindo a lista de mídias (apenas as que têm URL e não são blobs temporários gigantes)
            const mediaToSave = mediaList.map(m => ({
                ...m,
                file: null // Nunca salvar o objeto File no localStorage
            }));
            localStorage.setItem(draftKey, JSON.stringify({ rawNotes, content, title, mediaList: mediaToSave }));
        }, 1000);
        return () => clearTimeout(timeout);
    }, [rawNotes, content, title, mediaList, task.id]);

    // CRÍTICO: Resetar estados quando task ou report mudam
    useEffect(() => {
        console.log('ReportEditor: Resetando estados - Task:', task.id, 'Report:', report?.id);

        const newDefaultTitle = manualStatus === 'FINALIZADO'
            ? `Relatório Final - ${task.client || ''}`
            : `Relatório Parcial - ${task.client || ''}`;


        // Atualiza título se report mudar externamente
        // Se não há report (novo relatório) OU se o report mudou, resetar tudo
        if (!report || !report.id) {
            console.log('ReportEditor: Criando NOVO relatório - limpando estados');
            setTitle(newDefaultTitle);
            setRawNotes('');
            setContent('');
            setMediaList([]);
            setSuggestedActions([]);
            setManualStatus('EM_ABERTO');
        } else {
            console.log('ReportEditor: Editando relatório existente - carregando dados');
            setTitle(report.title || newDefaultTitle);
            setRawNotes(report.raw_notes || '');
            setContent(report.content || '');
            setMediaList(report.media_urls || []);
            setSuggestedActions(report.suggested_actions || []);
            setManualStatus(report.status || 'EM_ABERTO');
        }
    }, [task.id, report?.id, report?.status]); // Adicionado report?.status para reagir a mudanças de status



    // Função para comprimir imagens
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const maxSize = 1200;
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize;
                            width = maxSize;
                        } else {
                            width = (width / height) * maxSize;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const extractTextFromPDF = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            // Ler até 10 páginas para não sobrecarregar a IA
            const maxPages = Math.min(pdf.numPages, 10);
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `[Página ${i}]: ${pageText}\n`;
            }
            return fullText;
        } catch (error) {
            console.error('Erro ao ler PDF:', error);
            return '[Erro na extração de texto do PDF]';
        }
    };

    const extractTextFromDocx = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (error) {
            console.error('Erro ao ler Word:', error);
            return '[Erro na extração de texto do Word]';
        }
    };

    const extractTextFromExcel = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let fullText = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const text = XLSX.utils.sheet_to_txt(sheet);
                fullText += `--- Planilha: ${sheetName} ---\n${text}\n`;
            });
            return fullText;
        } catch (error) {
            console.error('Erro ao ler Excel:', error);
            return '[Erro na extração de texto do Excel]';
        }
    };

    const handleFileUpload = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        console.log('ReportEditor: Arquivos selecionados:', files.length);

        const newMedia = await Promise.all(files.map(async (file) => {
            let processedFile = file;
            let fileType = 'document';
            let extractedText = '';

            // Comprimir apenas imagens
            if (file.type.startsWith('image/')) {
                console.log('ReportEditor: Comprimindo imagem:', file.name);
                const compressedBlob = await compressImage(file);
                processedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
                fileType = 'image';
            } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
                fileType = 'document';
                extractedText = await extractTextFromPDF(file);
            } else if (file.type.includes('word') || file.type.includes('msword') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
                fileType = 'document';
                extractedText = await extractTextFromDocx(file);
            } else if (file.type.includes('excel') || file.type.includes('sheet') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
                fileType = 'document';
                extractedText = await extractTextFromExcel(file);
            }

            return {
                type: fileType,
                file: processedFile,
                url: URL.createObjectURL(processedFile),
                timestamp: new Date().toISOString(),
                name: file.name,
                extractedText: extractedText,
                aiDescription: '',
                isAnalyzing: false,
                analysisError: false
            };
        }));

        console.log('ReportEditor: Adicionando arquivos à lista:', newMedia);
        setMediaList(prev => {
            const updated = [...prev, ...newMedia];
            console.log('ReportEditor: MediaList atualizada:', updated);
            return updated;
        });
    };



    const handleImportTaskAttachments = async () => {
        if (!task.attachments || task.attachments.length === 0) {
            alert("Não há anexos nesta tarefa para importar.");
            return;
        }

        setIsGenerating(true); // Usar o loader para indicar processamento
        try {
            const newMedia = await Promise.all(task.attachments.map(async (att) => {
                // Verificar se o anexo é imagem ou documento pelo nome/url
                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || att.url);
                let extractedText = '';

                if (!isImage) {
                    try {
                        console.log(`[Import] Extraindo texto do anexo: ${att.name}`);
                        const response = await fetch(att.url);
                        if (response.ok) {
                            const blob = await response.blob();
                            const file = new File([blob], att.name || 'documento', { type: blob.type });

                            if (file.type.includes('pdf') || att.name?.toLowerCase().endsWith('.pdf')) {
                                extractedText = await extractTextFromPDF(file);
                            } else if (file.type.includes('word') || att.name?.toLowerCase().endsWith('.docx')) {
                                extractedText = await extractTextFromDocx(file);
                            } else if (file.type.includes('excel') || att.name?.toLowerCase().endsWith('.xlsx')) {
                                extractedText = await extractTextFromExcel(file);
                            }
                        }
                    } catch (e) {
                        console.warn(`Erro ao extrair texto do anexo importado ${att.name}:`, e);
                        extractedText = `[Aviso: Texto do documento "${att.name}" não pôde ser extraído automaticamente.]`;
                    }
                }

                return {
                    type: isImage ? 'image' : 'document',
                    file: null, // Pode ser remoto ou base64 do rascunho
                    url: att.url || att.content,
                    timestamp: att.timestamp || new Date().toISOString(),
                    name: att.name || (isImage ? 'imagem_tarefa' : 'documento_tarefa'),
                    extractedText: extractedText,
                    aiDescription: '',
                    isAnalyzing: false,
                    analysisError: false,
                    fromTask: true
                };
            }));

            // Evitar duplicatas (checar por URL)
            setMediaList(prev => {
                const existingUrls = prev.map(m => m.url);
                const nonDuplicate = newMedia.filter(m => !existingUrls.includes(m.url));
                if (nonDuplicate.length === 0) {
                    alert("Todos os anexos da tarefa já estão no relatório.");
                    return prev;
                }
                return [...prev, ...nonDuplicate];
            });
        } catch (error) {
            console.error("Erro ao importar anexos:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnalyzeMedia = async (index) => {
        const item = mediaList[index];
        if (!item || item.isAnalyzing) return;

        setMediaList(prev => prev.map((m, i) => i === index ? { ...m, isAnalyzing: true, analysisError: false, aiDescription: '' } : m));

        try {
            const description = await analyzeMediaWithIA(item.file, item.type, item.name, item.extractedText, item.url);
            setMediaList(prev => prev.map((m, i) =>
                i === index ? { ...m, aiDescription: description, isAnalyzing: false } : m
            ));
        } catch (error) {
            console.error("Erro na análise individual:", error);
            setMediaList(prev => prev.map((m, i) =>
                i === index ? { ...m, isAnalyzing: false, analysisError: true } : m
            ));
        }
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

            if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.location.href = blobUrl;
                } else {
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    link.click();
                }
            } else {
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

    const startEditingDescription = (idx, currentDesc) => {
        setEditingMediaIdx(idx);
        setTempDescription(currentDesc || '');
    };

    const saveManualDescription = () => {
        if (editingMediaIdx === null) return;
        setMediaList(prev => prev.map((m, i) =>
            i === editingMediaIdx ? { ...m, aiDescription: tempDescription, analysisError: false } : m
        ));
        setEditingMediaIdx(null);
        setTempDescription('');
    };

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            // If generating FINAL report, fetch PARCIAL report if exists
            let partialReport = null;
            if (manualStatus === 'FINALIZADO') {
                const { data } = await supabase
                    .from('task_reports')
                    .select('*')
                    .eq('task_id', task.id)
                    .eq('report_type', 'PARCIAL')
                    .single();
                partialReport = data;
            }

            // Pegar todas as mídias que já foram analisadas (têm descrição ou texto extraído)
            const relevantMedia = mediaList.filter(m => m.aiDescription || m.extractedText);
            console.log("ReportEditor: Enviando context para IA:", relevantMedia.length, "mídias analisadas.");

            // Sanitização de notas para evitar quebras de JSON com caracteres especiais
            const sanitizedNotes = (rawNotes || "").replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

            const result = await generateReportWithGemini(sanitizedNotes, relevantMedia, { ...task, userName: currentUser?.username, partialReport });

            setContent(result.reportText);
            setSuggestedActions(result.suggestedActions || []);
            if (result.suggestedStatus) {
                setManualStatus(result.suggestedStatus);
            }
        } catch (error) {
            console.error("Erro na geração:", error);
            // Usar timeout para o alert não travar a thread de UI de forma bruta
            setTimeout(() => alert(`Erro da IA: ${error.message}`), 100);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (finalize = false) => {
        try {
            console.log('ReportEditor: Salvando relatório. MediaList:', mediaList);

            // Converter arquivos para Base64
            const uploadedMedia = await Promise.all(mediaList.map(async (item) => {
                // Se já tem URL (não é arquivo novo), manter como está
                if (!item.file) {
                    console.log('ReportEditor: Mídia já tem URL:', item.url);
                    return item;
                }

                console.log('ReportEditor: Convertendo para Base64:', item.file.name);

                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            type: item.type,
                            url: reader.result,
                            timestamp: item.timestamp,
                            name: item.name || item.file.name,
                            extractedText: item.extractedText || '',
                            aiDescription: item.aiDescription || ''
                        });
                    };
                    reader.readAsDataURL(item.file);
                });
            }));

            const validMedia = uploadedMedia.filter(m => m !== null);
            console.log('ReportEditor: Mídias válidas para salvar:', validMedia);

            const reportData = {
                task_id: task.id,
                user_id: currentUser?.id,
                title,
                raw_notes: rawNotes,
                content,
                media_urls: validMedia,
                suggested_actions: suggestedActions,
                status: finalize ? 'FINALIZADO' : manualStatus,
                report_type: (finalize || manualStatus === 'FINALIZADO') ? 'FINAL' : 'PARCIAL',
                updated_at: new Date().toISOString()
            };

            if (finalize) {
                reportData.signed_by = currentUser?.id;
                reportData.signature_date = new Date().toISOString();
            }

            let result;
            if (report?.id) {
                // Update existing report
                result = await supabase
                    .from('task_reports')
                    .update(reportData)
                    .eq('id', report.id)
                    .select()
                    .single();
            } else {
                // Insert new report
                result = await supabase
                    .from('task_reports')
                    .insert(reportData)
                    .select()
                    .single();
            }

            const { data, error } = result;

            if (error) {
                console.error("Save error:", error);
                alert("Erro ao salvar relatório: " + error.message);
            } else {
                // Update local status to reflect the change immediately
                // Tira o draft de resiliência
                localStorage.removeItem(`assistec_draft_report_${task.id}`);

                alert(finalize ? "Relatório finalizado!" : "Rascunho salvo.");
                if (onSave) onSave(data);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("Erro inesperado ao salvar: " + err.message);
        }
    };

    const handleReopenReport = async () => {
        if (!report?.id) return;

        if (!window.confirm('Tem certeza que deseja reabrir este relatório? Ele voltará ao status "Em Aberto" e poderá ser editado novamente.')) {
            return;
        }

        try {
            const { data, error } = await supabase
                .from('task_reports')
                .update({
                    status: 'EM_ABERTO',
                    reopened_at: new Date().toISOString(),
                    reopened_by: currentUser?.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', report.id)
                .select()
                .single();

            if (error) {
                console.error("Reopen error:", error);
                alert("Erro ao reabrir relatório: " + error.message);
            } else {
                setManualStatus('EM_ABERTO');
                alert('Relatório reaberto para edição.');
                if (onSave) onSave(data);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("Erro inesperado ao reabrir: " + err.message);
        }
    };

    const handleExportPDF = async () => {
        if (!pdfRef.current) return;
        const canvas = await html2canvas(pdfRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title}.pdf`);
    };

    const addSuggestedToTask = (action) => {
        if (onAddStage) {
            onAddStage(action);
            setSuggestedActions(prev => prev.filter(a => a !== action));
        }
    };


    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-4 ${isFinalized ? 'opacity-90' : ''}`}
        >
            {/* Status do Relatório e Título */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status do Relatório</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setManualStatus('EM_ABERTO')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${manualStatus === 'EM_ABERTO'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-white'}`}
                        >
                            <AlertCircle size={14} /> Relatório Parcial
                        </button>
                        <button
                            type="button"
                            onClick={() => setManualStatus('FINALIZADO')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${manualStatus === 'FINALIZADO'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-white'}`}
                        >
                            <CheckCircle size={14} /> Relatório Final
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título do Relatório</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                </div>
            </div>

            {/* Media & Audio */}
            {/* Media & Audio */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Paperclip size={16} /> Anexos (Fotos e Documentos)
                    </h3>
                    {!isFinalized && task.attachments?.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleImportTaskAttachments(); }}
                            className="text-[10px] font-bold text-brand-600 flex items-center gap-1 hover:underline bg-white px-2 py-1 rounded border border-brand-100 shadow-sm"
                        >
                            <Paperclip size={12} /> Importar anexos da tarefa ({task.attachments.length})
                        </button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {!isFinalized && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                                className="flex flex-col items-center justify-center w-24 h-24 bg-white border-2 border-dashed border-slate-300 rounded-lg hover:border-brand-500 transition-all shrink-0"
                            >
                                <Paperclip size={24} className="text-slate-400 mb-1" />
                                <span className="text-[10px] text-slate-500 font-bold">Anexar</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                multiple
                                className="hidden"
                            />
                        </>
                    )}

                    {mediaList.map((item, idx) => {
                        const itemUrl = item.url || (item.file ? URL.createObjectURL(item.file) : null);

                        return (
                            <div key={idx} className="relative w-24 h-24 bg-slate-900 rounded-lg overflow-hidden shrink-0 group shadow-sm border border-slate-700">
                                {item.type === 'image' ? (
                                    <img
                                        src={itemUrl}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform cursor-pointer"
                                        onClick={() => handleFileView(itemUrl, item.name)}
                                        title="Ver imagem"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-1 cursor-pointer" onClick={() => handleFileView(itemUrl, item.name)}>
                                        <FileText size={24} className="text-slate-400" />
                                        <span className="text-[8px] text-slate-500 text-center truncate w-full mt-1 px-1 font-bold">
                                            {item.name || 'Arquivo'}
                                        </span>
                                    </div>
                                )}

                                {/* Overlay para Estado de Análise */}
                                {item.isAnalyzing && (
                                    <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                                        <Loader2 size={24} className="text-white animate-spin mb-1" />
                                        <span className="text-[8px] text-white font-black uppercase tracking-wider">Analisando...</span>
                                    </div>
                                )}

                                {/* IA Overlay Control */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                    {!item.isAnalyzing && (
                                        <div className="flex gap-1">
                                            {!isFinalized && (
                                                <>
                                                    {item.type === 'document' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAnalyzeMedia(idx); }}
                                                            className={`p-1.5 ${item.aiDescription ? 'bg-amber-600' : 'bg-brand-600'} text-white rounded-full hover:opacity-90 shadow-lg transform hover:scale-110 transition-all`}
                                                            title={item.aiDescription ? "Re-analisar com IA" : "Analisar com IA"}
                                                        >
                                                            <Sparkles size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startEditingDescription(idx, item.aiDescription); }}
                                                        className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transform hover:scale-110 transition-all"
                                                        title="Editar descrição manual"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleFileView(itemUrl, item.name); }}
                                                className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 shadow-lg transform hover:scale-110 transition-all"
                                                title="Ver arquivo"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Status Badge */}
                                <div className="absolute top-1 left-1 z-20 flex gap-1">
                                    {item.aiDescription && !item.isAnalyzing && !item.aiDescription.includes('[Informação:') && !item.aiDescription.toLowerCase().includes('erro') && !item.aiDescription.includes('[Erro') && (
                                        <div className="bg-green-500 ring-2 ring-white rounded-full p-1 shadow-md" title="Análise concluída com sucesso">
                                            <CheckCircle2 size={10} className="text-white" />
                                        </div>
                                    )}
                                    {item.aiDescription && item.aiDescription.includes('[Informação:') && !item.aiDescription.toLowerCase().includes('erro') && (
                                        <div className="bg-amber-500 ring-2 ring-white rounded-full p-1 shadow-md" title="Análise limitada (texto/imagem pendente)">
                                            <AlertCircle size={10} className="text-white" />
                                        </div>
                                    )}
                                    {(item.analysisError || (item.aiDescription && (item.aiDescription.toLowerCase().includes('erro') || item.aiDescription.includes('[Erro')))) && (
                                        <div className="bg-red-500 ring-2 ring-white rounded-full p-1 shadow-md" title="Falha na análise (IA não conseguiu ler ou erro técnico)">
                                            <X size={10} className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {!isFinalized && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMediaList(m => m.filter((_, i) => i !== idx)); }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <X size={10} />
                                    </button>
                                )}

                                {/* Description Preview - Melhorada para leitura rápida */}
                                {item.aiDescription && !item.isAnalyzing && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); !isFinalized && startEditingDescription(idx, item.aiDescription); }}
                                        className={`absolute bottom-0 left-0 right-0 p-2 leading-tight z-20 ${!isFinalized ? 'cursor-pointer hover:bg-black/95' : ''} ${item.aiDescription.includes('[Informação:') ? 'bg-amber-600/95' : 'bg-brand-900/95'} text-white text-[9px] font-bold transition-all line-clamp-2 max-h-[40px] overflow-hidden`}
                                        title={!isFinalized ? "Clique para editar descrição" : "Descrição salva"}
                                    >
                                        <div className="flex items-start gap-1">
                                            <Edit size={8} className="mt-0.5 shrink-0" />
                                            <span>{item.aiDescription.replace('[Informação: ', '').replace(']', '')}</span>
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>

                {!isFinalized && mediaList.some(m => !m.aiDescription && !m.isAnalyzing) && (
                    <button
                        onClick={async (e) => {
                            e.stopPropagation(); e.preventDefault();
                            for (let i = 0; i < mediaList.length; i++) {
                                if (!mediaList[i].aiDescription) await handleAnalyzeMedia(i);
                            }
                        }}
                        className="text-[10px] font-bold text-brand-600 flex items-center gap-1 hover:bg-brand-50 px-2 py-1 rounded transition-colors"
                    >
                        <Sparkles size={12} /> Analisar todos os anexos pendentes
                    </button>
                )}
            </div>

            {/* Quick Notes */}
            <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notas Rápidas (Ponto a Ponto)</label>
                <textarea
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    disabled={isFinalized}
                    placeholder="Ex: Peça X trocada, Vazamento resolvido, Cliente satisfeito..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:border-brand-500 disabled:bg-slate-50"
                />
            </div>

            {/* IA Actions Area */}
            {!isFinalized && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="w-4 h-4 text-brand-600 rounded" />
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-brand-600" /> Usar Inteligência Artificial no Relatório
                            </span>
                        </label>
                    </div>

                    {useAI && (
                        <div className="space-y-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleGenerateReport(); }}
                                disabled={isGenerating}
                                className="w-full py-4 bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-200 flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.98]"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="animate-spin" size={20} /> Construindo seu Relatório...</>
                                ) : (
                                    <><Sparkles size={20} /> GERAR RELATÓRIO PROFISSIONAL</>
                                )}
                            </button>
                            <p className="text-[10px] text-slate-400 text-center font-medium italic">
                                *A IA usará suas Notas Rápidas e as análises dos anexos feitas acima.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Suggested Actions (IA Output) */}
            {!isFinalized && suggestedActions.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-bold text-amber-600 uppercase mb-2 flex items-center gap-1"><Plus size={12} /> Sugestões de Próximos Passos</h4>
                    <div className="space-y-1.5">
                        {suggestedActions.map((action, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-amber-100 text-xs text-slate-700 group">
                                <span className="flex-1">{action}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); addSuggestedToTask(action); }} className="text-brand-600 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Aceitar</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Final Content Editor */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-bold">Corpo do Relatório</label>
                    <button onClick={handleExportPDF} className="flex items-center gap-1.5 text-brand-600 font-bold text-[10px] uppercase hover:underline"><FileDown size={14} /> PDF</button>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isFinalized}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm min-h-[300px] leading-relaxed focus:outline-none focus:border-brand-500 disabled:bg-slate-100"
                />
            </div>

            {/* Main Actions */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                {/* Status Manual Control */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-600">Status do Relatório:</label>
                    <select
                        value={manualStatus}
                        onChange={(e) => setManualStatus(e.target.value)}
                        disabled={isFinalized}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-brand-500 disabled:bg-slate-100"
                    >
                        <option value="EM_ABERTO">Em Aberto</option>
                        <option value="FINALIZADO">Finalizado</option>
                    </select>
                </div>

                {/* Action Buttons */}
                {!isFinalized ? (
                    <div className="flex gap-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleSave(false); }} className="flex-1 py-3 bg-slate-600 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                            <Save size={18} /> Salvar Rascunho
                        </button>
                        {onOpenPrint && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenPrintPreview(); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <Printer size={18} /> Imprimir
                            </button>
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.confirm("Finalizar e assinar este relatório?") && handleSave(true); }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-emerald-200 shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                            <CheckCircle size={18} /> Finalizar
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button type="button" onClick={handleReopenReport} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all flex items-center justify-center gap-2">
                            <Edit size={18} /> Reabrir Relatório
                        </button>
                        {onOpenPrint && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenPrintPreview(); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <Printer size={18} /> Imprimir Relatório Final
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Print Preview Modal - Visível e Robusto */}
            {showPrintPreview && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Printer className="text-brand-600" size={20} /> Pré-visualização de Impressão
                                </h3>
                                <p className="text-xs text-slate-500">Confira o relatório antes de imprimir.</p>
                            </div>
                            <button onClick={() => setShowPrintPreview(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400 hover:text-red-500" />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200/50">
                            <div className="shadow-2xl">
                                <div ref={pdfRef} className="bg-white">
                                    <PrintableReport
                                        task={task}
                                        content={content}
                                        currentUser={currentUser}
                                        taskTypes={taskTypes}
                                        signatureDate={isFinalized ? report?.signature_date : null}
                                        status={manualStatus}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowPrintPreview(false)}
                                className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPrint}
                                className="px-6 py-2.5 bg-brand-600 text-white font-bold text-sm rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 flex items-center gap-2 transition-all transform active:scale-95"
                            >
                                <Printer size={18} /> Confirmar Impressão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Manual Description Modal - Floating Overlay */}
            {!isFinalized && editingMediaIdx !== null && mediaList[editingMediaIdx] && (
                <div
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setEditingMediaIdx(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-brand-50 px-6 py-4 flex justify-between items-center border-b border-brand-100">
                            <h3 className="font-bold text-brand-700 flex items-center gap-2">
                                <Edit size={18} />
                                Descrição Manual: {mediaList[editingMediaIdx].name.substring(0, 30)}...
                            </h3>
                            <button
                                onClick={() => setEditingMediaIdx(null)}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Descrição Técnica do Anexo
                            </label>
                            <textarea
                                autoFocus
                                value={tempDescription}
                                onChange={(e) => setTempDescription(e.target.value)}
                                rows={8}
                                className="w-full text-sm p-4 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50 resize-none font-medium leading-relaxed text-slate-700"
                                placeholder="Descreva tecnicamente o que esta imagem ou documento representa. Esta descrição será usada prioritariamente no relatório."
                            />
                        </div>

                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setEditingMediaIdx(null)}
                                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveManualDescription}
                                className="px-6 py-2 bg-brand-600 text-white font-bold text-sm rounded-lg hover:bg-brand-700 shadow-md hover:shadow-lg transition-all"
                            >
                                Salvar Descrição
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportEditor;


