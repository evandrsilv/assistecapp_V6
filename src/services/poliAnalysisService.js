import { supabase } from '../supabaseClient';

/**
 * POLI Analysis Service
 * Handles Inventory and RNC analysis logic
 */

/**
 * Analyze materials inventory for low stock or stagnant items (> 3 months)
 * @returns {Promise<Array>} List of inventory suggestions
 */
export const analyzeInventory = async () => {
    try {
        const { data: inventory, error } = await supabase
            .from('materials_inventory')
            .select('*');

        if (error) throw error;

        const suggestions = [];
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        for (const item of (inventory || [])) {
            // Check for low stock
            if (item.quantity <= item.min_quantity) {
                suggestions.push({
                    type: 'inventory_alert',
                    id: `low_stock_${item.id}`,
                    title: `Estoque Baixo: ${item.name}`,
                    description: `O material ${item.name} está com apenas ${item.quantity}${item.unit}. (Mínimo: ${item.min_quantity})`,
                    priority: 'high',
                    data: { itemId: item.id, current: item.quantity, min: item.min_quantity }
                });
            }

            // Check for stagnant stock (> 3 months without update)
            const lastUpdate = new Date(item.last_update);
            if (lastUpdate < threeMonthsAgo) {
                suggestions.push({
                    type: 'inventory_alert',
                    id: `stagnant_${item.id}`,
                    title: `Material sem Movimentação: ${item.name}`,
                    description: `Este item está parado há mais de 3 meses sem alteração no estoque. Avaliar necessidade de descarte ou nova amostra.`,
                    priority: 'medium',
                    data: { itemId: item.id, lastUpdate: item.last_update }
                });
            }
        }

        return suggestions;
    } catch (err) {
        console.error('Error analyzing inventory:', err);
        return [];
    }
};

/**
 * Analyze RNCs for patterns, resolution time, and recurring issues
 * @param {Array} tasks - List of tasks from Category.RNC
 * @returns {Array} List of RNC suggestions
 */
export const analyzeRncs = (tasks) => {
    const rncTasks = tasks.filter(t => t.category === 'RNC' || t.category === 'Atendimento de RNC');
    if (rncTasks.length === 0) return [];

    const suggestions = [];

    // 1. Recurring Problems (basic string matching in 'rnc' or 'description')
    const problemCounts = {};
    rncTasks.forEach(t => {
        const problem = t.rnc || t.title || 'Outro';
        problemCounts[problem] = (problemCounts[problem] || 0) + 1;
    });

    Object.entries(problemCounts).forEach(([problem, count]) => {
        if (count >= 3) {
            suggestions.push({
                type: 'rnc_analysis',
                id: `recurring_${problem.substring(0, 10)}`,
                title: `Problema Recorrente: ${problem}`,
                description: `O problema "${problem}" foi identificado em ${count} atendimentos recentes.`,
                priority: 'high',
                data: { problem, count }
            });
        }
    });

    // 2. Average Resolution Time
    const resolvedRncs = rncTasks.filter(t => t.status === 'DONE');
    if (resolvedRncs.length > 0) {
        let totalTime = 0;
        resolvedRncs.forEach(t => {
            const start = new Date(t.created_at);
            const end = new Date(t.updated_at);
            totalTime += (end - start);
        });
        const avgDays = Math.round(totalTime / (1000 * 60 * 60 * 24 * resolvedRncs.length));

        if (avgDays > 7) {
            suggestions.push({
                type: 'rnc_analysis',
                id: 'avg_resolution_time',
                title: 'Tempo Médio de Resolução Elevado',
                description: `O tempo médio para resolver uma RNC está em ${avgDays} dias. Meta sugerida: 7 dias.`,
                priority: 'medium',
                data: { avgDays }
            });
        }
    }

    // 3. Client Frequency
    const clientCounts = {};
    rncTasks.forEach(t => {
        clientCounts[t.client] = (clientCounts[t.client] || 0) + 1;
    });

    Object.entries(clientCounts).forEach(([client, count]) => {
        if (count >= 4) {
            suggestions.push({
                type: 'rnc_analysis',
                id: `client_freq_${client.substring(0, 10)}`,
                title: `Alto Volume de RNC: ${client}`,
                description: `O cliente ${client} possui ${count} RNCs registradas. Pode ser necessário um treinamento técnico.`,
                priority: 'medium',
                data: { client, count }
            });
        }
    });

    return suggestions;
};

/**
 * Get material performance history for a specific client
 * @param {string} clientId 
 * @returns {Promise<Array>}
 */
export const getMaterialPerformance = async (clientId) => {
    try {
        const { data, error } = await supabase
            .from('material_performance')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching material performance:', err);
        return [];
    }
};

/**
 * Analyze Team Performance Indicators
 * @param {Array} tasks - List of all tasks
 * @returns {Array} Performance suggestions
 */
export const analyzePerformance = (tasks) => {
    const suggestions = [];
    const categoriesToAnalyze = ['RNC', 'DESENVOLVIMENTO', 'TESTES'];

    categoriesToAnalyze.forEach(cat => {
        const catTasks = tasks.filter(t => t.category?.toUpperCase().includes(cat) && t.status === 'DONE');
        if (catTasks.length === 0) return;

        let totalDays = 0;
        catTasks.forEach(t => {
            const start = new Date(t.created_at);
            const end = new Date(t.updated_at);
            totalDays += (end - start);
        });
        const avgDays = Math.round(totalDays / (1000 * 60 * 60 * 24 * catTasks.length));

        suggestions.push({
            type: 'performance_indicator',
            id: `avg_time_${cat}`,
            title: `Tempo Médio: ${cat}`,
            description: `O tempo médio de conclusão para ${cat} é de ${avgDays} dias.`,
            priority: 'low',
            data: { category: cat, avgDays }
        });

        // Success rate for Development
        if (cat === 'DESENVOLVIMENTO') {
            const successful = catTasks.filter(t => t.outcome === 'SUCCESS').length;
            const successRate = Math.round((successful / catTasks.length) * 100);
            suggestions.push({
                type: 'performance_indicator',
                id: 'dev_success_rate',
                title: 'Taxa de Sucesso: Desenvolvimento',
                description: `Sua taxa de sucesso em novos desenvolvimentos é de ${successRate}%.`,
                priority: 'medium',
                data: { successRate }
            });
        }
    });

    return suggestions;
};

/**
 * Proactive After-Sales Analysis (Gold/Silver clients every 6 months)
 * @param {Array} clients - List of clients
 * @returns {Array} After-sales suggestions
 */
export const analyzeAfterSales = (clients) => {
    const suggestions = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    clients.filter(c => c.classification === 'OURO' || c.classification === 'PRATA').forEach(client => {
        const lastVisit = client.last_pos_venda_at ? new Date(client.last_pos_venda_at) : null;

        if (!lastVisit || lastVisit < sixMonthsAgo) {
            suggestions.push({
                type: 'proactive_after_sales',
                id: `followup_${client.id}`,
                title: `Acompanhamento: ${client.name}`,
                description: `Lembrete: Cliente ${client.classification} sem visita de pós-venda há mais de 6 meses.`,
                priority: 'medium',
                data: { clientId: client.id, classification: client.classification }
            });
        }
    });

    return suggestions;
};

/**
 * Technical Insights - Suggest solutions based on history
 * @param {string} currentProblem - The RNC/Problem description
 * @param {Array} pastTasks - List of historical tasks
 * @returns {Array} Potential solutions
 */
export const getTechnicalInsights = (currentProblem, pastTasks) => {
    if (!currentProblem) return [];

    // Very basic keyword matching for demonstration
    const keywords = currentProblem.toLowerCase().split(' ').filter(word => word.length > 4);
    const related = pastTasks.filter(t =>
        t.status === 'DONE' &&
        keywords.some(kw => t.description?.toLowerCase().includes(kw) || t.rnc?.toLowerCase().includes(kw))
    );

    return related.slice(0, 3).map(t => ({
        taskId: t.id,
        title: t.title,
        solution: t.description?.substring(0, 100) + '...',
        client: t.client
    }));
};

