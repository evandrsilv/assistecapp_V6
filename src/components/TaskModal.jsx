import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, History, Layers, Building2, Building, Search, Loader2, Check,
    AlertCircle, Sparkles, Unlock, Eye, Users, MapPin, Printer,
    Trash2, Paperclip, Download, Plus, Map as MapIcon, ClipboardList, MessageSquare,
    Calendar, Wallet, FileText, Send, Ban, Save
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import ReportEditor from './ReportEditor';
import { convertFileToBase64, generateId } from '../utils/helpers';
import {
    TaskStatus, Priority, Category, StatusLabels, StageStatusLabels
} from '../constants/taskConstants';
import { getProactiveSuggestion } from '../services/aiService';

const MapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
};

/**
 * TaskModal Component
 * Full featured modal for creating and editing tasks.
 */
const TaskModal = ({
    isOpen, onClose, onSave, initialData, customCategories,
    currentUser, onDelete, logs, users, allClients = [], onOpenReport,
    tasks // Tasks list for POLI proactivity
}) => {
    // State management for task fields
    const [category, setCategory] = useState(Category.DEVELOPMENT);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(TaskStatus.TO_START);
    const [priority, setPriority] = useState(Priority.MEDIUM);
    const [client, setClient] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [op, setOp] = useState('');
    const [pedido, setPedido] = useState('');
    const [item, setItem] = useState('');
    const [rnc, setRnc] = useState('');
    const [location, setLocation] = useState('');
    const [geo, setGeo] = useState(null);
    const [visitationRequired, setVisitationRequired] = useState(false);
    const [stages, setStages] = useState({});
    const [attachments, setAttachments] = useState([]);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [mapPickerGeo, setMapPickerGeo] = useState(null);
    const [newCustomStageName, setNewCustomStageName] = useState('');

    // Additional state for features added in V5
    const [travels, setTravels] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [locationSearching, setLocationSearching] = useState(false);
    const [locationError, setLocationError] = useState('');

    // Client Autocomplete States
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [filteredClientSuggestions, setFilteredClientSuggestions] = useState([]);

    // Protocol States
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isReopening, setIsReopening] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [pendingStatus, setPendingStatus] = useState(null);
    const [showCancelProtocol, setShowCancelProtocol] = useState(false);

    // Business Logic States
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [visibility, setVisibility] = useState('PUBLIC');
    const [report, setReport] = useState(null);
    const [poliSuggestion, setPoliSuggestion] = useState(null);
    const [isPoliAnalyzing, setIsPoliAnalyzing] = useState(false);
    const [outcome, setOutcome] = useState(null);
    const [tripCost, setTripCost] = useState(0);
    const [tripCostCurrency, setTripCostCurrency] = useState('BRL');
    const [currentReport, setCurrentReport] = useState(null);
    const [isEditingReport, setIsEditingReport] = useState(false);
    const [reportRequired, setReportRequired] = useState(false);

    const [clientsRegistry, setClientsRegistry] = useState([]);

    const fileInputRef = useRef(null);

    // Initial config for the selected category
    const currentConfig = useMemo(() =>
        customCategories.find(c => c.id === category) || customCategories[0],
        [category, customCategories]
    );

    // Memoize the last activity for the task from logs
    const lastActivity = useMemo(() => {
        if (!initialData || !logs || !users) return null;
        const taskLogs = logs.filter(l => l.metadata?.taskId === initialData.id);
        if (taskLogs.length === 0) return null;
        const latest = taskLogs[0]; // logs are already sorted by timestamp desc
        const user = users.find(u => u.id === latest.user_id);
        return {
            action: latest.action,
            details: latest.details,
            timestamp: latest.timestamp,
            userName: user ? user.username : 'Sistema'
        };
    }, [initialData, logs, users]);

    // Check if user has permission to edit the task
    const canEdit = useMemo(() => {
        if (!currentUser) return false;
        const isNewTask = !initialData || !initialData.id;
        if (isNewTask) return true;

        if (initialData.visibility === 'PUBLIC') return true;
        if (initialData.user_id === currentUser.id) return true;
        if (initialData.assigned_users && initialData.assigned_users.length > 0) {
            return initialData.assigned_users.includes(currentUser.id);
        }
        return false;
    }, [initialData, currentUser]);

    // Initialize stages based on category config
    const initializeStages = (config) => {
        const newStages = {};
        config.stages.forEach(s => {
            newStages[s] = { active: false, description: '', status: 'NOT_STARTED' };
        });
        return newStages;
    };

    // Reset transient states only when the modal opens or the specific task being edited changes
    useEffect(() => {
        if (isOpen) {
            setIsReopening(false);
            setReopenReason('');
            setPendingStatus(null);
            setIsCanceling(false);
            setCancellationReason('');
            setIsEditingReport(false);
        } else {
            // CRÍTICO: Limpar TODOS os estados de relatório quando o modal fecha
            setReportRequired(false);
            setCurrentReport(null);
            setIsEditingReport(false);
        }
    }, [isOpen]);

    // Limpar estados de relatório quando a tarefa muda
    useEffect(() => {
        // Sempre limpar ao trocar de tarefa
        setReportRequired(false);
        setCurrentReport(null);
        setIsEditingReport(false);
    }, [initialData?.id]);

    // Main loading effect
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const catId = initialData.category || Category.DEVELOPMENT;
                const config = customCategories.find(c => c.id === catId);
                setCategory(catId);
                setTitle(initialData.title);
                setDescription(initialData.description);
                setStatus(initialData.status);
                setPriority(initialData.priority);
                setClient(initialData.client || '');
                setDueDate(initialData.due_date || '');
                setOp(initialData.op || '');
                setPedido(initialData.pedido || '');
                setItem(initialData.item || '');
                setRnc(initialData.rnc || '');
                setLocation(initialData.location || '');
                setGeo(initialData.geo || null);
                setVisitationRequired(initialData.visitation?.required || false);
                setAttachments(initialData.attachments || []);
                setOutcome(initialData.outcome || null);
                setTripCost(initialData.trip_cost || 0);
                setTripCostCurrency(initialData.trip_cost_currency || 'BRL');

                // Fetch existing reports (both types)
                const fetchReports = async () => {
                    if (!initialData.id) {
                        console.warn('TaskModal: Tentativa de buscar relatórios sem task_id');
                        return;
                    }

                    console.log('TaskModal: Buscando relatórios para task_id:', initialData.id);
                    const { data: reports } = await supabase
                        .from('task_reports')
                        .select('*')
                        .eq('task_id', initialData.id);

                    console.log('TaskModal: Relatórios encontrados:', reports);

                    if (reports && reports.length > 0) {
                        // Prioritize FINAL, then PARCIAL, or just the latest one
                        const final = reports.find(r => r.status === 'FINALIZADO');
                        const anyReport = reports[0];
                        const activeReport = final || anyReport;

                        setCurrentReport(activeReport || null);
                        setReportRequired(!!activeReport);
                        console.log('TaskModal: Relatório carregado:', activeReport?.id);
                    } else {
                        console.log('TaskModal: Nenhum relatório encontrado para esta tarefa');
                        setCurrentReport(null);
                        setReportRequired(false);
                    }
                };
                if (initialData.id) fetchReports();

                // Load extended data
                setTravels(initialData.travels ? initialData.travels.map(t => ({ // Migration for old data
                    ...t,
                    team: Array.isArray(t.team) ? t.team : [t.team || '']
                })) : []);
                setComments(initialData.comments || []);
                setAssignedUsers(initialData.assigned_users || []);
                setVisibility(initialData.visibility || 'PUBLIC');

                if (config && initialData.stages) {
                    const merged = {};
                    config.stages.forEach(s => {
                        const ex = initialData.stages[s];
                        merged[s] = ex ? { ...ex, status: ex.status || 'NOT_STARTED' } : { active: false, description: '', status: 'NOT_STARTED' };
                    });
                    Object.keys(initialData.stages).forEach(k => {
                        if (!config.stages.includes(k)) {
                            merged[k] = initialData.stages[k];
                        }
                    });
                    setStages(merged);
                } else if (config) setStages(initializeStages(config));
            } else {
                const defCat = Category.DEVELOPMENT;
                const defConf = customCategories.find(c => c.id === defCat);
                setCategory(defCat); setTitle(''); setClient(''); setDescription(''); setStatus(TaskStatus.PENDING); setPriority(Priority.MEDIUM);
                setDueDate(''); setOp(''); setPedido(''); setItem(''); setRnc(''); setLocation(''); setGeo(null);
                setVisitationRequired(false); setTravels([]);
                setAttachments([]); setComments([]);
                setAssignedUsers([]); setVisibility('PUBLIC');
                setIsCanceling(false); setCancellationReason('');
                setIsReopening(false); setReopenReason(''); setPendingStatus(null);

                // Limpar estados de relatório
                setReportRequired(false);
                setCurrentReport(null);
                setIsEditingReport(false);

                if (defConf) {
                    setStages(initializeStages(defConf));
                    setVisitationRequired(false);
                    setTravels([]);
                } else {
                    setTravels([]);
                }
            }
        }
    }, [isOpen, initialData?.id]);

    // Fetch clients for auto-complete
    useEffect(() => {
        if (isOpen && currentUser) {
            const fetchClients = async () => {
                const { data } = await supabase.from('clients').select('*');
                setClientsRegistry(data || []);
            };
            fetchClients();
        }
    }, [isOpen, currentUser]);

    // POLI PROACTIVE SUGGESTIONS TRIGGER
    useEffect(() => {
        if (!isOpen || !client || isPoliAnalyzing || initialData) return;
        if (!currentUser || currentUser.poli_interaction === 'DISABLED') return;
        if (currentUser.poli_interaction === 'LOW' && priority !== Priority.HIGH) return;

        const timer = setTimeout(async () => {
            setIsPoliAnalyzing(true);
            try {
                const taskContext = {
                    title: client,
                    client,
                    due_date: dueDate,
                    category
                };

                const suggestion = await getProactiveSuggestion(
                    taskContext,
                    tasks || [],
                    clientsRegistry || []
                );

                if (suggestion && suggestion.hasSuggestion) {
                    setPoliSuggestion(suggestion);
                } else {
                    setPoliSuggestion(null);
                }
            } catch (err) {
                console.error("POLI Suggestion Error:", err);
            } finally {
                setIsPoliAnalyzing(false);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [client, dueDate, category, isOpen, currentUser?.poli_interaction, priority, tasks, clientsRegistry]);

    const handleCategoryChange = (newCat) => {
        if (category === newCat) return;
        setCategory(newCat);
        const conf = customCategories.find(c => c.id === newCat);
        if (conf) {
            setStages(initializeStages(conf));
            if (!initialData) {
                setVisitationRequired(!!conf.fields?.visitation);
                if (conf.fields?.visitation && travels.length === 0) handleAddTravel();
            }
        }
    };

    const handleFileChange = async (e) => {
        if (e.target.files) {
            const newFiles = [];
            for (const file of Array.from(e.target.files)) {
                const b64 = await convertFileToBase64(file);
                newFiles.push({
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: b64,
                    createdAt: Date.now()
                });
            }
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const handleFileView = (url, filename = 'arquivo') => {
        if (!url) return;

        // Se for uma URL remota simples, abre em nova aba
        if (!url.startsWith('data:')) {
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

    const handleAddCustomStage = () => {
        if (!newCustomStageName.trim()) return;
        setStages(prev => ({
            ...prev,
            [newCustomStageName.trim()]: { active: true, description: '', status: 'NOT_STARTED', date: '' }
        }));
        setNewCustomStageName('');
    };

    const handleDeleteCustomStage = (stageName) => {
        setStages(prev => {
            const next = { ...prev };
            delete next[stageName];
            return next;
        });
    };

    const handleSearchLocation = async () => {
        if (!searchLocation.trim()) return;
        setLocationSearching(true);
        setLocationError('');

        try {
            const stateMatch = searchLocation.match(/[,\/\s]([A-Z]{2})(?:\s|$)/);
            const expectedState = stateMatch ? stateMatch[1] : null;
            const stateNames = {
                'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
                'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
                'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
                'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
                'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
                'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima',
                'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
            };
            const expectedStateName = expectedState ? stateNames[expectedState] : null;

            const searchStrategies = [];
            searchStrategies.push({ query: searchLocation, priority: 1 });
            const addressParts = searchLocation.split('-');
            if (addressParts.length >= 2) {
                const neighborhoodAndCity = addressParts.slice(1).join('-').trim();
                searchStrategies.push({ query: neighborhoodAndCity, priority: 2 });
            }
            const cityStateMatch = searchLocation.match(/([^,\-]+)[,\/]\s*([A-Z]{2})/);
            if (cityStateMatch) {
                const cityQuery = `${cityStateMatch[1].trim()}, ${cityStateMatch[2]}, Brasil`;
                searchStrategies.push({ query: cityQuery, priority: 3 });
            }
            const commaParts = searchLocation.split(',');
            if (commaParts.length > 1) {
                const lastPart = commaParts[commaParts.length - 1].trim();
                searchStrategies.push({ query: lastPart, priority: 2 });
            }

            searchStrategies.sort((a, b) => b.priority - a.priority);
            let allResults = [];

            for (const strategy of searchStrategies) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(strategy.query)}&countrycodes=br,ar,cl,co,mx,pe,uy,py,bo,ec,ve&limit=5`);
                    const data = await response.json();
                    if (data && data.length > 0) {
                        data.forEach(result => {
                            result.strategyPriority = strategy.priority;
                            result.strategyQuery = strategy.query;
                        });
                        allResults.push(...data);
                    }
                } catch (err) { console.error(err); }
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (allResults.length > 0) {
                let filteredResults = allResults;
                let stateMatchFound = false;

                if (expectedState) {
                    filteredResults = allResults.filter(result => {
                        const displayName = result.display_name.toUpperCase();
                        const normalizedDisplay = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const matches = displayName.includes(expectedState) ||
                            displayName.includes(expectedState.toLowerCase()) ||
                            (expectedStateName && (displayName.includes(expectedStateName.toUpperCase()) ||
                                normalizedDisplay.includes(expectedStateName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))));
                        if (matches) stateMatchFound = true;
                        return matches;
                    });
                }

                if (expectedState && !stateMatchFound) {
                    setLocationError(`Endereço não encontrado`);
                    setLocationSearching(false);
                    return;
                }

                if (filteredResults.length === 0 && !expectedState) {
                    filteredResults = allResults;
                }

                filteredResults.sort((a, b) => b.strategyPriority - a.strategyPriority);
                const bestResult = filteredResults[0];

                if (bestResult.importance && bestResult.importance < 0.3) {
                    setLocationError(`Resultado com baixa confiança. Confirme se está correto.`);
                }

                const lat = parseFloat(bestResult.lat);
                const lon = parseFloat(bestResult.lon);
                setGeo({ lat, lng: lon });

                const correctedAddress = searchLocation;
                if (client && location && correctedAddress !== location && bestResult.importance >= 0.4) {
                    const shouldUpdate = window.confirm(
                        `✨ IA detectou correção de endereço!\n\n` +
                        `Cliente: ${client}\n` +
                        `Endereço antigo: ${location}\n` +
                        `Endereço corrigido: ${correctedAddress}\n\n` +
                        `Deseja atualizar o cadastro do cliente com o endereço corrigido?`
                    );

                    if (shouldUpdate) {
                        (async () => {
                            const { error } = await supabase.from('clients').update({
                                address: correctedAddress,
                                street: null, number: null, neighborhood: null, city: null, state: null,
                                address_verified: true, address_verified_at: new Date().toISOString()
                            }).eq('name', client);

                            if (!error) {
                                alert('✅ Endereço do cliente atualizado!');
                                const { data } = await supabase.from('clients').select('*');
                                setClientsRegistry(data || []);
                            }
                        })();
                    }
                }
                setLocation(correctedAddress);
                if (!bestResult.importance || bestResult.importance >= 0.3) {
                    setLocationError('');
                    setSearchLocation('');
                }
            } else {
                setLocationError(`Endereço não encontrado`);
            }
        } catch (err) {
            console.error('Geocoding error:', err);
            setLocationError('Erro na busca. Tente novamente.');
        } finally {
            setLocationSearching(false);
        }
    };

    const handleAddTravel = () => {
        setTravels([...travels, { id: generateId(), date: '', isDateDefined: false, team: [''], contacts: '', role: '' }]);
    };

    const updateTravel = (id, field, value) => {
        setTravels(travels.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleTeamMemberChange = (travelId, index, value) => {
        setTravels(prev => prev.map(t => {
            if (t.id === travelId) {
                const newTeam = [...t.team];
                newTeam[index] = value;
                return { ...t, team: newTeam };
            }
            return t;
        }));
    };

    const addTeamMember = (travelId) => {
        setTravels(prev => prev.map(t => {
            if (t.id === travelId) {
                return { ...t, team: [...t.team, ''] };
            }
            return t;
        }));
    };

    const removeTeamMember = (travelId, index) => {
        setTravels(prev => prev.map(t => {
            if (t.id === travelId) {
                const newTeam = t.team.filter((_, i) => i !== index);
                return { ...t, team: newTeam };
            }
            return t;
        }));
    };

    const removeTravel = (id) => {
        setTravels(travels.filter(t => t.id !== id));
    };

    const handlePostComment = () => {
        if (!newComment.trim()) return;
        const comment = {
            id: generateId(),
            text: newComment,
            createdAt: Date.now(),
            user: currentUser?.username || 'Usuário'
        };
        setComments([...comments, comment]);
        setNewComment('');
    };

    const handleCancelTask = () => {
        if (!cancellationReason.trim()) return;

        const cancelComment = {
            id: Date.now(),
            text: `🔴 TAREFA CANCELADA: ${cancellationReason}`,
            user: currentUser?.username || 'Usuário',
            createdAt: new Date().toISOString()
        };

        const updatedComments = [...comments, cancelComment];

        onSave({
            ...initialData,
            status: TaskStatus.CANCELED,
            comments: updatedComments
        });
        onClose();
    };

    const handleStatusChange = (newStatus) => {
        const restrictedStatuses = [TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.TO_START];
        if (initialData && restrictedStatuses.includes(initialData.status)) {
            setPendingStatus(newStatus);
            setIsReopening(true);
            return;
        }
        setStatus(newStatus);
    };

    const confirmReopen = () => {
        if (!reopenReason.trim()) return;

        const reopenComment = {
            id: Date.now(),
            text: `📝 ALTERAÇÃO DE STATUS: ${reopenReason} (De ${StatusLabels[initialData.status]} para ${StatusLabels[pendingStatus]})`,
            user: currentUser?.username || 'Usuário',
            createdAt: new Date().toISOString()
        };

        setComments([...comments, reopenComment]);
        setStatus(pendingStatus);
        setIsReopening(false);
        setReopenReason('');
        setPendingStatus(null);
    };

    const cancelReopen = () => {
        setIsReopening(false);
        setReopenReason('');
        setPendingStatus(null);
    };

    const handleClientChange = (e) => {
        const val = e.target.value;
        setClient(val);

        if (val.trim().length > 0) {
            const filtered = clientsRegistry.filter(c =>
                c.name.toLowerCase().includes(val.toLowerCase())
            );
            setFilteredClientSuggestions(filtered);
            setShowClientSuggestions(true);
        } else {
            setFilteredClientSuggestions([]);
            setShowClientSuggestions(false);
        }

        const found = clientsRegistry.find(c => c.name.toLowerCase() === val.toLowerCase());
        if (found) {
            const fullAddress = found.street
                ? `${found.street}, ${found.number || ''} - ${found.neighborhood || ''}, ${found.city || ''}/${found.state || ''}`
                : found.address;

            if ((!location || location === '') && fullAddress) {
                setLocation(fullAddress);
                setSearchLocation(fullAddress);
            }
        }
    };

    const handleSelectClient = (clientName) => {
        setClient(clientName);
        setShowClientSuggestions(false);

        const found = clientsRegistry.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (found) {
            const fullAddress = found.street
                ? `${found.street}, ${found.number || ''} - ${found.neighborhood || ''}, ${found.city || ''}/${found.state || ''}`
                : found.address;

            if ((!location || location === '') && fullAddress) {
                setLocation(fullAddress);
                setSearchLocation(fullAddress);
            }
        }
    };

    // Trigger finding client address when enabling visitation if client is already filled
    useEffect(() => {
        if (visitationRequired && client) {
            const found = clientsRegistry.find(c => c.name.toLowerCase() === client.toLowerCase());
            if (found) {
                const fullAddress = found.street
                    ? `${found.street}, ${found.number || ''} - ${found.neighborhood || ''}, ${found.city || ''}/${found.state || ''}`
                    : found.address;
                if (fullAddress) {
                    setLocation(fullAddress);
                    setSearchLocation(fullAddress);
                }
            }
        }
    }, [visitationRequired, client, clientsRegistry]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...initialData,
            category,
            title: client,
            description,
            status,
            priority,
            client,
            due_date: dueDate,
            op,
            pedido,
            item,
            rnc,
            location,
            geo,
            visitation: { required: visitationRequired },
            stages,
            attachments,
            travels,
            comments,
            assigned_users: assignedUsers,
            visibility,
            outcome: status === TaskStatus.DONE ? outcome : null,
            trip_cost: tripCost,
            trip_cost_currency: tripCostCurrency
        });
        onClose();
    };

    if (!isOpen || !currentConfig) return null;

    if (isEditingReport && initialData) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
                <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col my-auto border border-slate-700 animate-in fade-in zoom-in duration-200 overflow-hidden">
                    <div className="flex justify-between px-6 py-4 border-b border-slate-700 bg-slate-900 rounded-t-xl shrink-0">
                        <h2 className="text-xl font-semibold text-white">
                            {currentReport ? 'Editar' : 'Gerar'} Relatório Técnico
                        </h2>
                        <button type="button" onClick={() => setIsEditingReport(false)} className="text-slate-400 hover:text-white font-bold bg-slate-800 px-3 py-1 rounded">Voltar</button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-100">
                        <ReportEditor
                            task={initialData}
                            report={currentReport}
                            currentUser={currentUser}
                            onSave={(savedReport) => {
                                setCurrentReport(savedReport);
                                setReportRequired(true);
                            }}
                            onFinalize={(finalizedReport) => {
                                setCurrentReport(finalizedReport);
                                setReportRequired(true);
                                setIsEditingReport(false);
                            }}
                            onOpenPrint={() => {
                                setIsEditingReport(false);
                                onOpenReport(initialData);
                            }}
                            onClose={() => setIsEditingReport(false)}
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col my-auto border border-slate-700 animate-in fade-in zoom-in duration-200 overflow-hidden">
                <form id="taskForm" onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
                    {/* Header */}
                    <div className="flex justify-between px-6 py-4 border-b border-slate-700 bg-slate-900 rounded-t-xl shrink-0">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-semibold text-white">{initialData ? 'Editar' : 'Nova'} Tarefa</h2>
                            {lastActivity && (
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                                    <History size={10} className="text-brand-400" />
                                    <span>Última alteração por <span className="font-bold text-slate-300">{lastActivity.userName}</span> em {new Date(lastActivity.timestamp).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {initialData && onOpenReport && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenReport(initialData);
                                        onClose();
                                    }}
                                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                                    title="Imprimir Relatório"
                                >
                                    <Printer size={16} />
                                    IMPRIMIR TAREFA
                                </button>
                            )}
                            <button type="button" onClick={onClose}><X size={20} className="text-slate-400 hover:text-white" /></button>
                        </div>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar p-6 flex-1 min-h-0">
                        <datalist id="userSuggestions">
                            {users.map((u) => <option key={u.id} value={u.username} />)}
                        </datalist>

                        <div className="space-y-6">
                            {/* Category Selection */}
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                                <label className="block text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Layers size={14} />Tipo de Tarefa
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full bg-slate-700 text-white border-none rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    {(customCategories || []).map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Client & Description Section */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300">Cliente (Identificador Principal)</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 text-slate-400 z-10" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={client}
                                            onChange={handleClientChange}
                                            onFocus={() => {
                                                if (client.trim().length > 0) {
                                                    const filtered = clientsRegistry.filter(c =>
                                                        c.name.toLowerCase().includes(client.toLowerCase())
                                                    );
                                                    setFilteredClientSuggestions(filtered);
                                                    setShowClientSuggestions(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setShowClientSuggestions(false), 200);
                                            }}
                                            className="w-full pl-10 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none font-bold"
                                            placeholder="Digite para buscar cliente..."
                                            autoComplete="off"
                                        />

                                        {showClientSuggestions && filteredClientSuggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredClientSuggestions.map((c) => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => handleSelectClient(c.name)}
                                                        className="px-4 py-2 hover:bg-brand-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                                                    >
                                                        <div className="font-bold text-slate-800">{c.name}</div>
                                                        {(c.city || c.state) && (
                                                            <div className="text-xs text-slate-500">
                                                                {c.city}{c.city && c.state ? '/' : ''}{c.state}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Fields based on category */}
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                                    {currentConfig.fields.op && <div><label className="text-xs font-medium text-slate-400">OP</label><input type="text" value={op} onChange={(e) => setOp(e.target.value)} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-sm" /></div>}
                                    {currentConfig.fields.pedido && <div><label className="text-xs font-medium text-slate-400">Pedido</label><input type="text" value={pedido} onChange={(e) => setPedido(e.target.value)} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-sm" /></div>}
                                    {currentConfig.fields.item && <div><label className="text-xs font-medium text-slate-400">Item</label><input type="text" value={item} onChange={(e) => setItem(e.target.value)} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-sm" /></div>}
                                    {currentConfig.fields.rnc && <div><label className="text-xs font-medium text-slate-400">RNC</label><input type="text" value={rnc} onChange={(e) => setRnc(e.target.value)} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-sm" /></div>}
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-300">Descrição</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg resize-none text-sm" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <div><label className="text-sm font-medium text-slate-300">Status</label><select value={status} onChange={(e) => handleStatusChange(e.target.value)} disabled={!canEdit} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"><option value={TaskStatus.TO_START}>A Iniciar</option><option value={TaskStatus.IN_PROGRESS}>Em Andamento</option><option value={TaskStatus.WAITING_CLIENT}>Aguardando Cliente</option><option value={TaskStatus.DONE}>Finalizada</option><option value={TaskStatus.CANCELED}>Cancelada</option></select></div>
                                    <div><label className="text-sm font-medium text-slate-300">Prioridade</label><select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!canEdit} className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"><option value={Priority.LOW}>Baixa</option><option value={Priority.MEDIUM}>Média</option><option value={Priority.HIGH}>Alta</option></select></div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-300">Prazo de Entrega</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            disabled={!canEdit}
                                            className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {status === TaskStatus.DONE && (
                                    <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl animate-in slide-in-from-left-2 duration-300">
                                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Check size={14} /> Resultado da Tarefa
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'SUCCESS', label: 'Sucesso', icon: Check, color: 'bg-emerald-600' },
                                                { id: 'FAILURE', label: 'Falha', icon: X, color: 'bg-rose-600' },
                                                { id: 'PARTIAL', label: 'Parcial', icon: AlertCircle, color: 'bg-amber-600' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setOutcome(opt.id)}
                                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border-2 ${outcome === opt.id
                                                        ? `${opt.color} border-white/20 text-white shadow-lg scale-105`
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                                        }`}
                                                >
                                                    <opt.icon size={14} /> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* POLI PROACTIVE SUGGESTION */}
                                {(poliSuggestion || isPoliAnalyzing) && (
                                    <div className={`p-4 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300 ${isPoliAnalyzing
                                        ? 'bg-slate-800/50 border-slate-700 border-dashed'
                                        : poliSuggestion.type === 'warning'
                                            ? 'bg-amber-900/20 border-amber-600/50'
                                            : poliSuggestion.type === 'success'
                                                ? 'bg-emerald-900/20 border-emerald-600/50'
                                                : 'bg-brand-900/20 border-brand-600/50'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${isPoliAnalyzing ? 'bg-slate-700 animate-pulse' : 'bg-brand-600'
                                                } text-white`}>
                                                <Sparkles size={18} className={isPoliAnalyzing ? 'animate-spin' : ''} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-400">
                                                        Dica da POLI {isPoliAnalyzing && '... analisando'}
                                                    </h4>
                                                    {!isPoliAnalyzing && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPoliSuggestion(null)}
                                                            className="text-slate-500 hover:text-white"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                {!isPoliAnalyzing && (
                                                    <>
                                                        <div className="text-sm font-bold text-white mt-1">{poliSuggestion.title}</div>
                                                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                            {poliSuggestion.message}
                                                        </p>
                                                    </>
                                                )}
                                                {isPoliAnalyzing && (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
                                                        <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isReopening && (
                                    <div className="bg-amber-950 border-2 border-amber-500 p-5 rounded-xl my-4 relative shadow-2xl">
                                        <div className="absolute top-0 right-0 p-4 opacity-10"><Unlock size={120} className="text-amber-500" /></div>
                                        <div className="relative z-10">
                                            <h4 className="text-amber-400 font-black text-base flex items-center gap-2 mb-3 uppercase tracking-wide">
                                                <Unlock size={20} /> Alteração Restrita
                                            </h4>
                                            <p className="text-sm text-amber-100/90 mb-4 font-medium leading-relaxed max-w-md">
                                                Esta tarefa já foi concluída. Para alterar seu status, é <strong>obrigatório</strong> informar o motivo da reabertura.
                                            </p>
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-amber-500 uppercase tracking-wider">Motivo / Justificativa</label>
                                                <textarea
                                                    value={reopenReason}
                                                    onChange={(e) => setReopenReason(e.target.value)}
                                                    placeholder="Digite aqui o motivo pelo qual esta tarefa precisa ser reaberta..."
                                                    className="w-full bg-slate-950/80 border border-amber-500/50 rounded-lg p-3 text-sm text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-500/50 outline-none resize-none placeholder-slate-500"
                                                    rows={3}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex gap-3 justify-end mt-4">
                                                <button type="button" onClick={cancelReopen} className="px-4 py-2 rounded-lg text-sm text-amber-200 hover:bg-amber-900/50 font-bold transition-colors">Cancelar</button>
                                                <button type="button" onClick={confirmReopen} disabled={!reopenReason.trim()} className="px-6 py-2 rounded-lg text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 font-black shadow-lg shadow-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2">
                                                    <Unlock size={16} /> Confirmar e Reabrir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Visibility Toggle */}
                                <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-700">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Eye size={12} /> Visibilidade</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setVisibility('PUBLIC')}
                                            disabled={!canEdit}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${visibility === 'PUBLIC' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                        >
                                            Público
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVisibility('PRIVATE')}
                                            disabled={!canEdit}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${visibility === 'PRIVATE' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                        >
                                            Privado
                                        </button>
                                    </div>
                                </div>

                                {/* Assignment Selector */}
                                <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-700">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users size={12} /> Responsáveis</label>
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                                        {users.filter(u => u.id !== currentUser.id).map(u => {
                                            const isAssigned = assignedUsers.includes(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    disabled={!canEdit}
                                                    onClick={() => {
                                                        if (isAssigned) setAssignedUsers(assignedUsers.filter(id => id !== u.id));
                                                        else setAssignedUsers([...assignedUsers, u.id]);
                                                    }}
                                                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-[10px] font-bold ${isAssigned ? 'border-brand-500 scale-105 shadow-sm' : 'border-slate-500 opacity-40 grayscale'} disabled:cursor-not-allowed`}
                                                    style={{ backgroundColor: u.color }}
                                                    title={u.username}
                                                >
                                                    {u.username.substring(0, 1).toUpperCase()}
                                                </button>
                                            );
                                        })}
                                        {users.filter(u => u.id !== currentUser.id).length === 0 && <span className="text-[10px] text-slate-500 italic">Nenhum outro usuário disponível</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Combined Location & Travel Section */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="visitationRequired"
                                        checked={visitationRequired}
                                        onChange={(e) => {
                                            const isRequired = e.target.checked;
                                            setVisitationRequired(isRequired);
                                            if (isRequired) {
                                                if (travels.length === 0) handleAddTravel();
                                            } else {
                                                setTravels([]);
                                                setLocation('');
                                                setGeo(null);
                                                setSearchLocation('');
                                            }
                                        }}
                                        className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                                    />
                                    <label htmlFor="visitationRequired" className="text-white font-bold text-sm cursor-pointer select-none">Necessidade de Viagem</label>
                                </div>

                                {visitationRequired && (
                                    <div className="space-y-4 pl-0 md:pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Location Search */}
                                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg relative">
                                            <label className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-2 block flex items-center gap-1"><MapPin size={12} /> Localização (Destino)</label>
                                            <div className="flex gap-2 mb-2">
                                                <input type="text" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())} placeholder="Buscar cidade/local..." className="flex-1 px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded-lg text-sm outline-none" />
                                                <button type="button" onClick={handleSearchLocation} disabled={locationSearching} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">{locationSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}</button>
                                            </div>
                                            {locationError && <p className="text-red-400 text-xs mb-2">{locationError}</p>}
                                            <div className="flex gap-2">
                                                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border-slate-700 text-white rounded-lg text-sm" placeholder="Endereço exato..." />
                                                <button type="button" onClick={() => setIsMapPickerOpen(true)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${geo ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>{geo ? 'Alfinete' : 'Mapa'}</button>
                                            </div>
                                        </div>

                                        {/* Travels List */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2 mt-4">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase">Viagens Agendadas</h4>
                                                <button type="button" onClick={handleAddTravel} className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-slate-600 font-medium">+ Nova Viagem</button>
                                            </div>
                                            <div className="space-y-3">
                                                {travels.map((travel, idx) => (
                                                    <div key={travel.id} className="bg-slate-900 border border-slate-600 rounded p-3 relative">
                                                        <button type="button" onClick={() => removeTravel(travel.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-500"><X size={14} /></button>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Quando?</label>
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <input type="checkbox" checked={!travel.isDateDefined} onChange={(e) => updateTravel(travel.id, 'isDateDefined', !e.target.checked)} className="w-3 h-3 text-brand-600 rounded bg-slate-800 border-slate-600" />
                                                                        <span className="text-[10px] text-slate-300">A Definir Data</span>
                                                                    </div>
                                                                    {travel.isDateDefined && <input type="date" value={travel.date} onChange={(e) => updateTravel(travel.id, 'date', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1.5 text-white focus:border-brand-500 outline-none" />}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Quem vai?</label>
                                                                <div className="space-y-1.5">
                                                                    {(Array.isArray(travel.team) ? travel.team : ['']).map((member, mIdx) => (
                                                                        <div key={mIdx} className="flex gap-1">
                                                                            <input
                                                                                type="text"
                                                                                value={member}
                                                                                onChange={(e) => handleTeamMemberChange(travel.id, mIdx, e.target.value)}
                                                                                className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1 text-white placeholder:text-slate-600 focus:border-brand-500 outline-none"
                                                                                placeholder="Nome do técnico..."
                                                                                list="userSuggestions"
                                                                            />
                                                                            {mIdx === (travel.team || ['']).length - 1 ? (
                                                                                <button type="button" onClick={() => addTeamMember(travel.id)} className="bg-brand-600/20 text-brand-500 hover:bg-brand-600/40 p-1 rounded"><Plus size={14} /></button>
                                                                            ) : (
                                                                                <button type="button" onClick={() => removeTeamMember(travel.id, mIdx)} className="bg-red-500/20 text-red-500 hover:bg-red-500/40 p-1 rounded"><X size={14} /></button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="md:col-span-2 grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                                                                <div><label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Contato no Cliente</label><input type="text" value={travel.contacts} onChange={(e) => updateTravel(travel.id, 'contacts', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1.5 text-white focus:border-brand-500 outline-none" /></div>
                                                                <div><label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Cargo</label><input type="text" value={travel.role} onChange={(e) => updateTravel(travel.id, 'role', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1.5 text-white focus:border-brand-500 outline-none" /></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reports Section - Independent */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="checkbox"
                                        id="reportRequired"
                                        checked={reportRequired}
                                        onChange={(e) => {
                                            setReportRequired(e.target.checked);
                                            if (!e.target.checked) {
                                                // Limpar estados ao desmarcar
                                                setCurrentReport(null);
                                            }
                                        }}
                                        className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                                    />
                                    <label htmlFor="reportRequired" className="text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer select-none flex items-center gap-1.5">
                                        <FileText size={12} /> Necessita Relatório
                                    </label>
                                </div>

                                {reportRequired && initialData?.id && (
                                    <div className="space-y-3 pl-0 md:pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Botão de Ação Único - Gerenciar Relatório */}
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingReport(true)}
                                                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-3 rounded-lg font-bold text-sm hover:from-brand-700 hover:to-brand-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                            >
                                                <Printer size={16} />
                                                {currentReport ? 'GERENCIAR RELATÓRIO TÉCNICO' : 'GERAR RELATÓRIO TÉCNICO'}
                                            </button>

                                            {currentReport && (
                                                <div className="mt-2 text-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${currentReport.status === 'FINALIZADO'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        }`}>
                                                        Status Atual: {currentReport.status === 'FINALIZADO' ? 'FINALIZADO' : 'EM ANDAMENTO (PARCIAL)'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                                                <span className="text-brand-400 font-bold">Nota:</span> Use este editor único para criar rascunhos, relatórios parciais ou finais. Você pode alterar o status do relatório a qualquer momento dentro do editor.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {reportRequired && !initialData?.id && (
                                    <p className="text-xs text-slate-400 italic text-center py-3 pl-0 md:pl-2">
                                        Salve a tarefa para gerar relatórios
                                    </p>
                                )}
                            </div>

                            {/* Custom Stages Section */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList size={12} /> Etapas Customizadas</label>
                                    <button type="button" onClick={handleAddCustomStage} className="bg-brand-600/20 text-brand-500 hover:bg-brand-600/40 px-3 py-1 rounded text-[10px] font-bold">+ Nova Etapa</button>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(stages).length > 0 ? (
                                        Object.entries(stages).map(([stageName, stageData]) => {
                                            const isFinished = ['COMPLETED', 'FINALIZADO', 'SOLUCIONADO'].includes(stageData.status);
                                            // Check if it's a native stage for the current category
                                            const isNative = currentConfig.stages.includes(stageName);

                                            return (
                                                <div key={stageName} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded border border-slate-700/50 group hover:border-slate-600 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={isFinished}
                                                        onChange={() => {
                                                            setStages(prev => ({
                                                                ...prev,
                                                                [stageName]: {
                                                                    ...prev[stageName],
                                                                    status: isFinished ? 'NOT_STARTED' : 'FINALIZADO'
                                                                }
                                                            }));
                                                        }}
                                                        className="w-4 h-4 text-brand-600 rounded bg-slate-800 border-slate-600 focus:ring-brand-500 cursor-pointer"
                                                    />
                                                    <span className={`flex-1 text-sm font-medium ${isFinished ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                        {stageName}
                                                        {isNative && <span className="ml-2 text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">Nativo</span>}
                                                    </span>
                                                    {!isNative && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCustomStage(stageName)}
                                                            className="text-slate-600 hover:text-red-500 opacity-60 hover:opacity-100 transition-all p-1"
                                                            title="Remover etapa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-500 italic p-2 text-center">Nenhuma etapa definida para esta tarefa.</div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Paperclip size={12} /> Anexos</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            title="Adicionar arquivos"
                                        />
                                        <button type="button" className="bg-brand-600/20 text-brand-500 hover:bg-brand-600/40 px-3 py-1 rounded text-[10px] font-bold">Upload</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {attachments.map((file, idx) => {
                                        const fileSource = file.content || file.url;
                                        const isImage = file.type?.startsWith('image/');

                                        return (
                                            <div key={idx} className="bg-slate-900 border border-slate-700 p-2 rounded group relative overflow-hidden aspect-video flex flex-col items-center justify-center gap-1">
                                                {isImage ? (
                                                    <img
                                                        src={fileSource}
                                                        alt={file.name}
                                                        onClick={() => handleFileView(fileSource, file.name)}
                                                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all cursor-pointer"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleFileView(fileSource, file.name)}
                                                    >
                                                        <FileText size={24} className="text-brand-500/50" />
                                                    </div>
                                                )}

                                                {/* Overlay de Nome */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-transform">
                                                    <span className="text-[10px] text-white font-medium truncate block text-center">{file.name}</span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    title="Remover anexo"
                                                >
                                                    <X size={10} />
                                                </button>
                                                <a
                                                    href={fileSource}
                                                    download={file.name}
                                                    className="absolute top-1 left-1 bg-brand-600/80 hover:bg-brand-500 text-white p-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    title="Baixar arquivo"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Download size={10} />
                                                </a>
                                            </div>
                                        );
                                    })}
                                    {attachments.length === 0 && <div className="col-span-full text-center py-6 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-[10px] uppercase font-bold tracking-widest">Sem arquivos anexados</div>}
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block flex items-center gap-1.5"><MessageSquare size={12} /> Comentários e Histórico</label>
                                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {comments.map((comment, idx) => (
                                        <div key={idx} className="bg-slate-900/80 p-3 rounded-lg border-l-4 border-brand-500 animate-in slide-in-from-left-2 duration-300">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-brand-400 uppercase tracking-tighter">{comment.user}</span>
                                                <span className="text-[9px] text-slate-500 font-medium italic">{new Date(comment.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-100 leading-relaxed break-words">{comment.text}</p>
                                        </div>
                                    ))}
                                    {comments.length === 0 && <p className="text-[10px] text-slate-500 italic text-center py-4">Nenhum comentário registrado</p>}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlePostComment())}
                                        placeholder="Digite um comentário..."
                                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg text-sm placeholder:text-slate-600 outline-none focus:border-brand-500 transition-colors"
                                    />
                                    <button type="button" onClick={handlePostComment} className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-500 transition-colors group">
                                        <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                        <div className="flex items-center gap-4">
                            {initialData && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                            onDelete(initialData.id);
                                            onClose();
                                        }
                                    }}
                                    className="text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={16} /> Excluir Tarefa
                                </button>
                            )}
                            {initialData && initialData.status !== TaskStatus.CANCELED && (
                                <button
                                    type="button"
                                    onClick={() => setShowCancelProtocol(true)}
                                    className="text-slate-400 hover:text-rose-400 text-sm font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-rose-500/10 transition-all"
                                >
                                    <Ban size={16} /> Cancelar Tarefa
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all">Descartar</button>
                            <button type="submit" className="flex-1 md:flex-none px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-900/40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Save size={18} /> {initialData ? 'Salvar Alterações' : 'Criar Tarefa'}
                            </button>
                        </div>
                    </div>
                </form >
            </div >

            {/* Map Picker Overlay */}
            {
                isMapPickerOpen && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex flex-col animate-in fade-in duration-300">
                        <div className="flex justify-between items-center p-6 bg-slate-900 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <div className="p-2 bg-brand-600 rounded-lg"><MapPin size={24} /></div>
                                    Selecionar Localização no Mapa
                                </h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium">Clique no mapa para posicionar o alfinete de destino</p>
                            </div>
                            <button onClick={() => setIsMapPickerOpen(false)} className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 relative">
                            <MapContainer
                                center={geo ? [geo.lat, geo.lng] : [-23.5505, -46.6333]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                                {geo && <Marker position={[geo.lat, geo.lng]} />}
                                <MapClickHandler onLocationSelect={(latlng) => {
                                    setGeo({ lat: latlng.lat, lng: latlng.lng });
                                }} />
                            </MapContainer>
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
                                <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-brand-500/50 p-6 rounded-3xl shadow-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-4 rounded-2xl ${geo ? 'bg-emerald-500' : 'bg-slate-700 animate-pulse'} text-white`}>
                                            <MapPin size={32} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 mb-1">Coordenadas Atuais</div>
                                            <div className="text-white font-mono font-bold text-lg">
                                                {geo ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}` : 'Aguardando seleção...'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsMapPickerOpen(false)}
                                        className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-base font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-900/40"
                                        disabled={!geo}
                                    >
                                        Confirmar Posição
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cancellation Protocol Overlay */}
            {
                showCancelProtocol && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                        <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-900/20">
                            <div className="bg-rose-500 p-6 text-white flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl"><Ban size={32} /></div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Protocolo de Cancelamento</h3>
                                    <p className="text-rose-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Ação Irreversível</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <p className="text-slate-300 text-sm font-medium mb-6 leading-relaxed">
                                    Você está prestes a cancelar esta tarefa. Por favor, detalhe o <strong>motivo técnico ou comercial</strong> para manter o histórico íntegro.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 block">Justificativa do Cancelamento</label>
                                        <textarea
                                            value={cancellationReason}
                                            onChange={(e) => setCancellationReason(e.target.value)}
                                            placeholder="Ex: Cliente desistiu da visita / Erro de duplicação..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:border-rose-500 outline-none transition-all resize-none font-medium h-32"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4 font-black">
                                        <button onClick={() => setShowCancelProtocol(false)} className="flex-1 py-4 text-slate-400 hover:text-white transition-colors uppercase text-xs tracking-widest">Manter Ativa</button>
                                        <button
                                            onClick={handleCancelTask}
                                            disabled={!cancellationReason.trim()}
                                            className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/40 uppercase text-xs tracking-widest"
                                        >
                                            Confirmar Cancelamento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TaskModal;
