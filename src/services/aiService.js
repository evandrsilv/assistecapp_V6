import { GoogleGenerativeAI } from "@google/generative-ai";

// Nomes de modelos para tentar em ordem de prioridade
const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro-001"
];

const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [];
};

/**
 * Função central para chamar o Gemini com resiliência de modelos
 */
async function runGeminiWithResilience(apiKey, parts, isChat = false, history = []) {
    const cleanKey = apiKey?.trim().replace(/["']/g, '');
    if (!cleanKey) throw new Error("Chave API do Gemini não configurada.");

    const genAI = new GoogleGenerativeAI(cleanKey);
    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`[AI] Tentando modelo: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            if (isChat) {
                const chat = model.startChat({ history });
                const result = await chat.sendMessage(parts[0].text);
                const response = await result.response;
                return response.text();
            } else {
                const result = await model.generateContent(parts);
                const response = await result.response;
                return response.text();
            }
        } catch (error) {
            console.warn(`[AI] Erro com ${modelName}:`, error.message);
            lastError = error;
            if (error.message.includes('404') || error.message.includes('429') || error.message.includes('not found')) {
                continue;
            }
            if (error.message.includes('403') || error.message.includes('API_KEY_INVALID')) {
                throw new Error("Chave API Inválida ou Sem Permissão. Verifique no AI Studio.");
            }
            throw error;
        }
    }
    throw new Error(`A IA falhou após tentar vários modelos. Erro final: ${lastError?.message}`);
}

/**
 * Função para chamar a OpenAI (ChatGPT)
 */
async function runOpenAI(apiKey, prompt, model = "gpt-4o-mini") {
    const cleanKey = apiKey?.trim().replace(/["']/g, '');
    if (!cleanKey) throw new Error("Chave API da OpenAI não configurada.");

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cleanKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Erro na API da OpenAI");
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("[AI] Erro na OpenAI:", error);
        throw error;
    }
}

/**
 * Analisa individualmente uma mídia (imagem ou documento)
 */
/**
 * Analisa individualmente uma mídia (imagem ou documento)
 */
export const analyzeMediaWithIA = async (mediaFile, type, name, extractedText = '', url = null) => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const parts = [];
    let base64Data = null;
    let mimeType = 'image/jpeg';

    // ESTRATÉGIA PARA DOCUMENTOS (Excel, PDF, Word)
    if (type === 'document' && extractedText && extractedText.trim().length > 0) {
        console.log(`[AI] Analisando texto extraído do documento: ${name}`);
        const docPrompt = `Analise o seguinte texto extraído do documento "${name}" da Indústria de Plásticos. 
        OBJETIVO: Fornecer um resumo técnico executivo focado em pontos críticos para assistência técnica (OPs, datas, problemas relatados, diagnósticos técnicos).
        DIRETRIZ: Seja direto e profissional. Se o texto estiver confuso, tente extrair o que for possível de útil.
        
        TEXTO EXTRAÍDO:
        ${extractedText.substring(0, 15000)}`;

        try {
            if (openaiKey && openaiKey.length > 10) {
                return await runOpenAI(openaiKey, docPrompt);
            } else {
                return await runGeminiWithResilience(geminiKey, [{ text: docPrompt }]);
            }
        } catch (docErr) {
            console.error("Erro na análise de documento:", docErr);
            return `[Informação: O documento "${name}" foi lido, mas a IA falhou em gerar um resumo. Texto bruto disponível para redação.]`;
        }
    }

    if (type === 'image') {
        // [REFRENTE A SOLICITAÇÃO DO USUÁRIO]: Removida análise automática de imagens.
        // O usuário prefere descrever manualmente para garantir precisão absoluta no relatório.
        console.log(`[AI] Análise automática de imagem ignorada por configuração: ${name}`);
        return null; // Retornar null para que a UI saiba que não há análise de IA para esta imagem.
    }

    return `[Informação: Tipo de arquivo não suportado para análise automática ou sem texto extraído.]`;
};

/**
 * Generates a technical report based on notes and pre-analyzed media descriptions.
 */
export const generateReportWithGemini = async (notes, mediaItems, taskContext) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const stages = ensureArray(taskContext.stages);
    const travels = ensureArray(taskContext.travels);
    const comments = ensureArray(taskContext.comments);

    const stagesList = stages
        .map(s => `- [${s.completed || s.status === 'DONE' ? 'x' : ' '}] ${s.title || 'Sem título'}`)
        .join('\n');

    const travelsList = travels
        .map(t => `- Viagem em ${new Date(t.date || t.created_at).toLocaleDateString()}: ${t.description || t.objective || 'Sem descrição'}`)
        .join('\n');

    const commentsList = comments
        .map(c => `- ${new Date(c.created_at || c.timestamp).toLocaleString()}: ${c.comment || c.text || 'Sem texto'}`)
        .join('\n');

    // Mídias agora usam o texto pré-analisado ou a descrição manual do técnico
    const mediaDescriptions = (mediaItems || [])
        .map(m => `\n--- ANEXO: ${m.name} (${m.type === 'document' ? 'Documento' : 'Imagem'}) ---\nDESCRIÇÃO/ANÁLISE: ${m.aiDescription || m.extractedText || 'Apenas evidência visual (sem descrição).'}\n`)
        .join('\n');

    // Lógica para seção condicional de Visita
    const hasVisits = travels.length > 0 || taskContext.category?.toUpperCase().includes('VISITA');
    const visitaSection = hasVisits ? `
## 5. VISITA
[Descreva as condições encontradas na visita, baseando-se no histórico de viagens e comentários].
` : '';

    const partialReportContent = taskContext.partialReport ? `
- Relatório Parcial Existente: "${taskContext.partialReport.content}"
` : '';

    const promptInstructions = `
Você é um Especialista em Redação Técnica para a AssisTec.
Sua tarefa é compilar um relatório profissional e de FÁCIL ENTENDIMENTO para o cliente final.
Use uma linguagem simples, clara e didática. Evite jargões técnicos excessivos ou, se precisar usá-los, explique-os de forma que um leigo entenda (ex: em vez de apenas "TiO2", use "o pigmento branco do filme").

CONTEÚDO PARA COMPILAÇÃO:
- Cliente: ${taskContext.client || 'N/A'}
- Tipo de Tarefa: ${taskContext.category || 'N/A'}
- Título: ${taskContext.title || 'N/A'}
- OP: ${taskContext.op || 'N/A'}
- Pedido: ${taskContext.pedido || 'N/A'}
- RNC: ${taskContext.category === 'RNC' ? (taskContext.rnc || 'Pendente') : 'N/A'}
- Notas do Técnico: "${notes}"
${partialReportContent}

- DESCRIÇÃO DOS ANEXOS (Use estas informações para compor a análise técnica de forma simples):
${mediaDescriptions || 'Nenhuma descrição de anexo disponível.'}

- HISTÓRICO DA TAREFA:
Etapas: ${stagesList}
Viagens: ${travelsList}
Comentários: ${commentsList}

INSTRUÇÕES CRÍTICAS DE REDAÇÃO:
1. Jamais mencione erros de sistema, falhas de IA ou incapacidade de leitura no relatório.
2. Seja DIDÁTICO: O cliente deve entender perfeitamente o problema e a solução.
3. Se o técnico descreveu uma imagem manualmente, traduza essa descrição para uma linguagem profissional porém acessível.
4. O tom deve ser de um Técnico Sênior que sabe conversar com o cliente: resolutivo, atencioso e claro.
5. Se houver discrepância entre as "Notas do Técnico" e as descrições dos anexos, priorize as notas do técnico.

MODELO PADRÃO OBRIGATÓRIO:
# RELATÓRIO TÉCNICO DE ACOMPANHAMENTO
**CLIENTE:** ${taskContext.client || 'N/A'}
**TIPO DE TAREFA:** ${taskContext.category || 'N/A'}
**DATA:** ${new Date().toLocaleDateString('pt-BR')}

## 1. OBJETIVO
## 2. DIAGNÓSTICO E RASTREABILIDADE
## 3. ANÁLISE DE ANEXOS
## 4. ATIVIDADES REALIZADAS
${visitaSection}
## 6. CONCLUSÃO

---
Relatório gerado por ${taskContext.userName || 'Técnico'} em ${new Date().toLocaleDateString('pt-BR')}

Retorne APENAS um JSON válido:
{
  "reportText": "Texto seguindo o MODELO PADRÃO",
  "suggestedActions": ["Ação 1"],
  "suggestedStatus": "EM_ABERTO ou FINALIZADO"
}
`;

    try {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        let resultText;

        // Sanitização extra para JSON seguro
        const sanitizedPrompt = promptInstructions.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

        if (openaiKey && openaiKey.length > 10) {
            console.log("[AI] Usando OpenAI para geração de relatório (IA 2)");
            resultText = await runOpenAI(openaiKey, sanitizedPrompt);
        } else {
            console.log("[AI] Usando Gemini para geração de relatório (IA 2)");
            resultText = await runGeminiWithResilience(apiKey, [{ text: sanitizedPrompt }]);
        }

        // Tenta extrair JSON de forma mais robusta
        try {
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                // Limpeza de possíveis comentários ou lixo antes/depois do JSON
                let cleanJson = jsonMatch[0]
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove caracteres de controle
                    .trim();
                return JSON.parse(cleanJson);
            }
        } catch (jsonErr) {
            console.warn("[AI] Falha ao parsear JSON, limpando aspas e tentando novamente:", jsonErr);
            // Fallback agressivo: remover quebras de linha dentro de valores strings (comum em notas longas)
            const ultraClean = resultText.match(/\{[\s\S]*\}/)?.[0]
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r");
            if (ultraClean) return JSON.parse(ultraClean);
        }

        return { reportText: resultText, suggestedActions: [] };
    } catch (error) {
        console.error("Erro no Gerador de Relatórios:", error);
        throw error;
    }
};

/**
 * Otimiza endereços
 */
export const optimizeAddressForGeocoding = async (address, clientName) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const prompt = `Otimize este endereço para busca no mapa (Nominatim): "${address}" do cliente "${clientName}". Retorne JSON: { "suggestion": "Endereço", "reason": "motivo", "confidence": "high/medium/low" }`;
    try {
        const resultText = await runGeminiWithResilience(apiKey, [{ text: prompt }]);
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { suggestion: address, reason: "Fallback", confidence: "low" };
    } catch (e) {
        return { suggestion: address, reason: e.message, confidence: "low" };
    }
};

/**
 * Chat POLI
 */
export const chatWithPoli = async (history, userMessage, context = {}) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const system = `Você é a POLI, assistente da AssisTec. Usuário: ${context.userName || 'Técnico'}. Responda de forma curta e técnica.`;
    const prompt = `${system}\n\nMensagem: ${userMessage}`;
    return await runGeminiWithResilience(apiKey, [{ text: prompt }], true, history);
};

/**
 * Sugestão Proativa
 */
export const getProactiveSuggestion = async (taskData, existingTasks, existingClients) => {
    if (!taskData.client && !taskData.due_date) return null;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const prompt = `Analise os dados desta tarefa: Cliente ${taskData.client}, Data ${taskData.due_date}. Dê uma dica curta. Retorne JSON: { "hasSuggestion": boolean, "title": "...", "message": "...", "type": "info" }`;
    try {
        const resultText = await runGeminiWithResilience(apiKey, [{ text: prompt }]);
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return null;
    } catch (e) {
        return null;
    }
};

// Helper to convert File to Gemini Part
async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
}
