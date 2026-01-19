import { supabase } from '../supabaseClient';

/**
 * POLI Travel Analysis Service
 * Provides intelligent suggestions for travel optimization
 */

/**
 * Calculate distance between two geographic points (Haversine formula)
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal
};

/**
 * Analyze route optimization opportunities
 * Finds nearby clients when a trip is scheduled
 * @param {Array} tasks - All tasks
 * @param {Array} clients - All clients
 * @returns {Promise<Array>} Array of route optimization suggestions
 */
export const analyzeRouteOptimization = async (tasks, clients) => {
    const suggestions = [];

    // Get upcoming trips (tasks with visitation required and future dates)
    const upcomingTrips = tasks.filter(t =>
        t.visitation?.required &&
        t.visitation?.date &&
        new Date(t.visitation.date) > new Date() &&
        t.status !== 'DONE' &&
        t.status !== 'CANCELED'
    );

    for (const trip of upcomingTrips) {
        // Find the client for this trip
        const tripClient = clients.find(c => c.name === trip.client);
        if (!tripClient || !tripClient.geo) continue;

        // Find other clients in the same region (within 100km)
        const nearbyClients = clients.filter(c => {
            if (!c.geo || c.name === tripClient.name) return false;
            const distance = calculateDistance(tripClient.geo, c.geo);
            return distance <= 100; // Within 100km
        });

        if (nearbyClients.length === 0) continue;

        // Check which nearby clients haven't been visited recently (60+ days)
        const clientsNeedingVisit = [];

        for (const nearbyClient of nearbyClients) {
            // Find last task for this client
            const clientTasks = tasks.filter(t => t.client === nearbyClient.name);
            const lastTask = clientTasks.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            )[0];

            const daysSinceLastContact = lastTask
                ? Math.floor((new Date() - new Date(lastTask.created_at)) / (1000 * 60 * 60 * 24))
                : 999; // No tasks = very old

            if (daysSinceLastContact >= 60) {
                const distance = calculateDistance(tripClient.geo, nearbyClient.geo);
                clientsNeedingVisit.push({
                    name: nearbyClient.name,
                    distance,
                    daysSinceLastContact
                });
            }
        }

        if (clientsNeedingVisit.length > 0) {
            // Sort by distance (closest first)
            clientsNeedingVisit.sort((a, b) => a.distance - b.distance);

            suggestions.push({
                type: 'route_optimization',
                task_id: trip.id,
                client_id: tripClient.id,
                title: `Otimização de Rota - ${tripClient.city || tripClient.name}`,
                description: `Viagem agendada para ${new Date(trip.visitation.date).toLocaleDateString('pt-BR')}. ${clientsNeedingVisit.length} cliente(s) próximo(s) sem visita há mais de 60 dias.`,
                priority: clientsNeedingVisit.length >= 3 ? 'high' : 'medium',
                data: {
                    trip_date: trip.visitation.date,
                    trip_client: tripClient.name,
                    nearby_clients: clientsNeedingVisit.slice(0, 5), // Max 5 suggestions
                    total_nearby: clientsNeedingVisit.length
                }
            });
        }
    }

    return suggestions;
};

/**
 * Check for holidays on travel dates
 * Uses Nager.Date API (free, no API key required)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} countryCode - ISO country code (BR, AR, CL, etc.)
 * @returns {Promise<Object|null>} Holiday info or null
 */
export const checkHoliday = async (date, countryCode) => {
    try {
        const year = new Date(date).getFullYear();
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);

        if (!response.ok) return null;

        const holidays = await response.json();
        const dateStr = date.split('T')[0]; // Get YYYY-MM-DD part

        const holiday = holidays.find(h => h.date === dateStr);
        return holiday || null;
    } catch (error) {
        console.error('Error checking holiday:', error);
        return null;
    }
};

/**
 * Analyze holiday conflicts for upcoming trips
 * @param {Array} tasks - All tasks
 * @param {Array} clients - All clients
 * @returns {Promise<Array>} Array of holiday alert suggestions
 */
export const analyzeHolidayConflicts = async (tasks, clients) => {
    const suggestions = [];

    // Map of country codes by common patterns
    const countryMap = {
        'BR': ['Brasil', 'Brazil', '/BR', 'SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'CE', 'DF'],
        'AR': ['Argentina', '/AR', 'Buenos Aires', 'Córdoba', 'Rosario'],
        'CL': ['Chile', '/CL', 'Santiago'],
        'CO': ['Colombia', '/CO', 'Bogotá'],
        'MX': ['México', 'Mexico', '/MX', 'Ciudad de México'],
        'PE': ['Peru', 'Perú', '/PE', 'Lima'],
        'UY': ['Uruguay', '/UY', 'Montevideo'],
        'PY': ['Paraguay', '/PY', 'Asunción'],
        'BO': ['Bolivia', '/BO', 'La Paz'],
        'EC': ['Ecuador', '/EC', 'Quito'],
        'VE': ['Venezuela', '/VE', 'Caracas']
    };

    // Get upcoming trips
    const upcomingTrips = tasks.filter(t =>
        t.visitation?.required &&
        t.visitation?.date &&
        new Date(t.visitation.date) > new Date() &&
        t.status !== 'DONE' &&
        t.status !== 'CANCELED'
    );

    for (const trip of upcomingTrips) {
        const tripClient = clients.find(c => c.name === trip.client);
        if (!tripClient) continue;

        // Determine country from client address
        let countryCode = 'BR'; // Default to Brazil
        const address = tripClient.address || tripClient.city || '';

        for (const [code, patterns] of Object.entries(countryMap)) {
            if (patterns.some(pattern => address.includes(pattern))) {
                countryCode = code;
                break;
            }
        }

        // Check for holiday
        const holiday = await checkHoliday(trip.visitation.date, countryCode);

        if (holiday) {
            suggestions.push({
                type: 'holiday_alert',
                task_id: trip.id,
                client_id: tripClient.id,
                title: `Feriado Detectado - ${holiday.localName}`,
                description: `A viagem para ${tripClient.name} está agendada para ${new Date(trip.visitation.date).toLocaleDateString('pt-BR')}, que é feriado (${holiday.localName}) em ${countryCode}.`,
                priority: 'high',
                data: {
                    trip_date: trip.visitation.date,
                    holiday_name: holiday.localName,
                    holiday_name_en: holiday.name,
                    country: countryCode,
                    is_global: holiday.global || false
                }
            });
        }

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return suggestions;
};

/**
 * Check for trips without cost filled
 * @param {Array} tasks - All tasks
 * @returns {Array} Array of trip cost reminder suggestions
 */
export const analyzeTripCosts = (tasks) => {
    const suggestions = [];

    // Find completed trips without cost
    const completedTrips = tasks.filter(t =>
        t.visitation?.required &&
        t.status === 'DONE' &&
        (!t.trip_cost || t.trip_cost === 0)
    );

    for (const trip of completedTrips) {
        suggestions.push({
            type: 'trip_cost_reminder',
            task_id: trip.id,
            title: `Custo de Viagem Pendente - ${trip.client}`,
            description: `A viagem para ${trip.client} foi finalizada mas o custo não foi registrado. Registrar o custo ajuda no controle de orçamento.`,
            priority: 'low',
            data: {
                trip_date: trip.visitation?.date,
                client: trip.client
            }
        });
    }

    return suggestions;
};

/**
 * Run all POLI travel analyses and save suggestions to database
 * @param {Array} tasks - All tasks
 * @param {Array} clients - All clients
 * @returns {Promise<Object>} Summary of suggestions created
 */
export const runTravelAnalysis = async (tasks, clients) => {
    try {
        // Run all analyses
        const [routeSuggestions, holidaySuggestions, costSuggestions] = await Promise.all([
            analyzeRouteOptimization(tasks, clients),
            analyzeHolidayConflicts(tasks, clients),
            Promise.resolve(analyzeTripCosts(tasks))
        ]);

        const allSuggestions = [
            ...routeSuggestions,
            ...holidaySuggestions,
            ...costSuggestions
        ];

        // Save to database (only new suggestions)
        let savedCount = 0;
        for (const suggestion of allSuggestions) {
            // Check if similar suggestion already exists
            const { data: existing } = await supabase
                .from('poli_suggestions')
                .select('id')
                .eq('type', suggestion.type)
                .eq('task_id', suggestion.task_id)
                .eq('status', 'pending')
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('poli_suggestions')
                    .insert(suggestion);

                if (!error) savedCount++;
            }
        }

        return {
            total: allSuggestions.length,
            saved: savedCount,
            route: routeSuggestions.length,
            holiday: holidaySuggestions.length,
            cost: costSuggestions.length
        };
    } catch (error) {
        console.error('Error running travel analysis:', error);
        throw error;
    }
};
