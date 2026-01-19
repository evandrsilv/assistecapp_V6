import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, AlertCircle,
    Factory, Clock, Check, X, Eye, StickyNote, Grid
} from 'lucide-react';
import { TaskStatus, StatusLabels } from '../constants/taskConstants';
import { generateId } from '../utils/helpers'; // Assuming generateId might be useful or using crypto.randomUUID

const CalendarView = ({ tasks, onEditTask, onUpdateTask, notes = [], currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('MONTH'); // MONTH, YEAR, DAY
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);
    const [touchDragItem, setTouchDragItem] = useState(null);
    const [touchGhostPos, setTouchGhostPos] = useState({ x: 0, y: 0 });
    const calendarRef = useRef(null);
    const popupRef = useRef(null); // New ref for the popup

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close if clicking outside the popup (if it exists)
            // We ignore clicks inside the popupRef
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setSelectedEventId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    // Extração de eventos
    const events = useMemo(() => {
        const extractedEvents = [];
        for (const task of tasks) {
            if (task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELED) continue; // DONE and CANCELED tasks hidden

            // ALWAYS use client name as main identifier for ALL tasks
            let mainIdentifier = task.client || task.title || 'Sem identificação';

            if (task.stages) {
                for (const [stageName, stage] of Object.entries(task.stages)) {
                    if (!stage) continue;
                    const isStageFinished = ['COMPLETED', 'SOLUCIONADO', 'FINALIZADO', 'DEVOLVIDO'].includes(stage.status);
                    if (isStageFinished) continue;
                    if (stage.active && stage.date) {
                        if (stageName === 'Agendamento de Visita') {
                            extractedEvents.push({
                                id: `${task.id}-visit`,
                                taskId: task.id,
                                date: stage.date,
                                title: `${mainIdentifier} / Visita`,
                                type: 'VISIT',
                                isCompleted: false,
                                originalTask: task,
                                stageName: stageName,
                                detailsData: stage.visitationDetails || {}
                            });
                        } else {
                            extractedEvents.push({
                                id: `${task.id}-${stageName}`,
                                taskId: task.id,
                                date: stage.date,
                                title: `${mainIdentifier} / ${stageName}`,
                                type: 'PRODUCTION',
                                isCompleted: false,
                                originalTask: task,
                                stageName: stageName,
                                detailsData: { description: stage.description }
                            });
                        }
                    }
                }
            }
            if (task.due_date) {
                extractedEvents.push({
                    id: `${task.id}-due`,
                    taskId: task.id,
                    date: task.due_date,
                    title: `${mainIdentifier} / Entrega`,
                    type: 'DEADLINE',
                    isCompleted: false,
                    originalTask: task,
                    detailsData: { description: task.description }
                });
            }

            // Include Travel dates if defined
            if (task.travels && Array.isArray(task.travels)) {
                task.travels.forEach((travel, idx) => {
                    if (travel.isDateDefined && travel.date) {
                        const teamStr = Array.isArray(travel.team) ? travel.team.filter(Boolean).join(', ') : '';
                        extractedEvents.push({
                            id: `${task.id}-travel-${travel.id || idx}`,
                            taskId: task.id,
                            date: travel.date,
                            title: `${mainIdentifier} / Viagem${teamStr ? ` (${teamStr})` : ''}`,
                            type: 'VISIT',
                            isCompleted: false,
                            originalTask: task,
                            travelId: travel.id,
                            travelIdx: idx,
                            // stageName: 'Agendamento de Visita', // REMOVED: confusing drag logic
                            detailsData: { description: `Viagem agendada. Contato: ${travel.contacts || 'Não informado'} (${travel.role || '-'})` }
                        });
                    }
                });
            }
        }
        return extractedEvents;
    }, [tasks]);

    // Handlers
    const handleMoveEvent = async (eventId, newDate) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const task = ev.originalTask;
        if (!task) return;

        // Proteção de Permissão no Calendário
        if (currentUser) {
            const canEditTask = task.visibility === 'PUBLIC' ||
                task.user_id === currentUser.id ||
                (task.assigned_users && task.assigned_users.includes(currentUser.id));

            if (!canEditTask) {
                alert('Você não tem permissão para modificar esta tarefa privada.');
                return;
            }
        }

        const dateStr = newDate.toISOString().split('T')[0];
        if (ev.type === 'DEADLINE') {
            onUpdateTask({ ...task, due_date: dateStr });
        } else if (ev.type === 'VISIT' && (ev.travelId !== undefined || ev.travelIdx !== undefined)) {
            // Find the travel to update
            let targetIdx = -1;
            if (ev.travelId) {
                targetIdx = task.travels.findIndex(tr => tr.id === ev.travelId);
            }
            if (targetIdx === -1 && ev.travelIdx !== undefined) {
                targetIdx = ev.travelIdx;
            }

            if (targetIdx !== -1 && task.travels[targetIdx]) {
                const updatedTravels = [...task.travels];
                updatedTravels[targetIdx] = {
                    ...updatedTravels[targetIdx],
                    date: newDate,
                    id: updatedTravels[targetIdx].id || crypto.randomUUID() // Ensure ID on move
                };
                onUpdateTask({ ...task, travels: updatedTravels });
            }
        } else {
            const updatedStages = { ...task.stages };
            updatedStages[ev.stageName] = { ...updatedStages[ev.stageName], date: newDate };
            onUpdateTask({ ...task, stages: updatedStages });
        }
    };

    const renderHeader = () => {
        const monthYear = `${monthNames[month]} ${year}`;
        return (
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('MONTH')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'MONTH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
                    <button onClick={() => setViewMode('YEAR')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'YEAR' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ano</button>
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">{monthYear}</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-brand-100">Hoje</button>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        for (let i = 0; i < 7; i++) {
            days.push(<div key={i} className="text-center py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-200">{daysOfWeek[i]}</div>);
        }
        return <div className="grid grid-cols-7">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDate = new Date(year, month, 1 - monthStart.getDay());
        const endDate = new Date(year, month + 1, 7 - monthEnd.getDay() - 1);

        const rows = [];
        let days = [];
        let day = new Date(startDate);
        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const fYear = day.getFullYear();
                const fMonth = String(day.getMonth() + 1).padStart(2, '0');
                const fDay = String(day.getDate()).padStart(2, '0');
                const formattedDate = `${fYear}-${fMonth}-${fDay}`;

                const dayEvents = events.filter(e => e.date === formattedDate);
                const dayNotes = notes.filter(n => n.note_date === formattedDate);
                const isCurrentMonth = day.getMonth() === month;
                const isToday = formattedDate === todayStr;
                const isSelected = dragOverDate === formattedDate;

                const currentDay = new Date(day);
                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[80px] md:min-h-[120px] bg-white border-r border-b border-slate-100 relative group/cell transition-all flex flex-col ${!isCurrentMonth ? 'bg-slate-50/30' : ''} ${isSelected ? 'bg-brand-50/50' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOverDate(formattedDate); }}
                        onDragLeave={() => setDragOverDate(null)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOverDate(null);
                            const eventId = e.dataTransfer.getData('eventId');
                            handleMoveEvent(eventId, formattedDate);
                        }}
                    >
                        <div className="flex justify-between items-center p-2">
                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover/cell:scale-110 ${isToday ? 'bg-brand-600 text-white shadow-md' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                                {currentDay.getDate()}
                            </span>
                            {dayNotes.length > 0 && (
                                <div className="relative group/note cursor-pointer">
                                    <StickyNote size={14} className="text-amber-500 fill-amber-100 animate-in zoom-in duration-300" />
                                    <div className="absolute top-full right-0 z-50 bg-white border border-slate-200 shadow-xl rounded-lg p-2 w-48 hidden group-hover/note:block animate-in fade-in zoom-in duration-150">
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 border-b pb-1">NOTAS DO DIA</p>
                                        <div className="space-y-1.5">
                                            {dayNotes.map(n => (
                                                <p key={n.id} className="text-xs text-slate-600 border-l-2 border-amber-300 pl-1.5 line-clamp-2">{n.content}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 px-1 md:px-1.5 pb-1 md:pb-2 space-y-0.5 md:space-y-1 overflow-y-auto custom-scrollbar max-h-[60px] md:max-h-[90px]">
                            {dayEvents.map(ev => {
                                const isVisit = ev.type === 'VISIT';
                                const isDeadline = ev.type === 'DEADLINE';
                                const colorClass = isVisit ? 'bg-blue-50 text-blue-700 border-blue-200' : isDeadline ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200';
                                return (
                                    <div
                                        key={ev.id}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.setData('eventId', ev.id); e.dataTransfer.effectAllowed = 'move'; }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedEventId(ev.id); }}
                                        className={`group/ev text-[9px] md:text-[10px] p-1 md:p-1.5 rounded-md border truncate cursor-pointer transition-all shadow-sm hover:translate-x-0.5 active:grayscale-[0.5] ${colorClass} ${selectedEventId === ev.id ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
                                        title={ev.title}
                                    >
                                        <span className="flex items-center gap-1">
                                            {isVisit && <MapPin size={10} />}
                                            {isDeadline && <AlertCircle size={10} />}
                                            {!isVisit && !isDeadline && <Check size={10} />}
                                            <span className="truncate">{ev.title}</span>
                                        </span>
                                        {selectedEventId === ev.id && (
                                            <div
                                                className="fixed md:absolute left-4 right-4 md:left-full top-1/2 -translate-y-1/2 md:top-0 md:translate-y-0 md:ml-2 z-[60] bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-auto md:w-72 animate-in fade-in zoom-in duration-200"
                                                ref={calendarRef}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-sm font-bold text-slate-800 leading-tight pr-4">{ev.title}</h4>
                                                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isDeadline ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'}`}>
                                                        {ev.type === 'DEADLINE' ? 'Prazo Final' : ev.type === 'VISIT' ? 'Visita' : ev.type === 'PRODUCTION' ? 'Produção' : ev.type}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{ev.detailsData?.description || 'Nenhuma descrição disponível'}</p>
                                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                        <button onClick={() => onEditTask(ev.originalTask)} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"><Eye size={14} /> Detalhes</button>
                                                        <button onClick={() => setSelectedEventId(null)} className="px-3 py-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold rounded-lg transition-colors border border-slate-200">Fechar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
                day.setDate(day.getDate() + 1);
            }
        }
        return <div className="grid grid-cols-7 border-l border-t border-slate-100">{days}</div>;
    };

    const handlePrev = () => {
        if (viewMode === 'MONTH') setCurrentDate(new Date(year, month - 1, 1));
        else if (viewMode === 'DAY') setCurrentDate(new Date(year, month, day - 1));
        else setCurrentDate(new Date(year - 1, month, 1));
    };
    const handleNext = () => {
        if (viewMode === 'MONTH') setCurrentDate(new Date(year, month + 1, 1));
        else if (viewMode === 'DAY') setCurrentDate(new Date(year, month, day + 1));
        else setCurrentDate(new Date(year + 1, month, 1));
    };
    const handleToday = () => { setCurrentDate(new Date()); setViewMode('MONTH'); };
    const handleMonthClick = (monthIndex) => { setCurrentDate(new Date(year, monthIndex, 1)); setViewMode('MONTH'); };
    const handleDayDoubleClick = (dayNum) => { setCurrentDate(new Date(year, month, dayNum)); setViewMode('DAY'); };

    // Drag
    const handleDragStart = (e, event) => { e.stopPropagation(); e.dataTransfer.setData('application/json', JSON.stringify({ taskId: event.taskId, type: event.type, stageName: event.stageName, travelId: event.travelId, travelIdx: event.travelIdx })); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e, dateStr) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverDate !== dateStr) setDragOverDate(dateStr); };
    const handleDrop = (e, targetDateStr) => {
        e.preventDefault(); setDragOverDate(null);
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;
        try {
            const { taskId, type, stageName } = JSON.parse(dataStr);
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Proteção de Permissão no Drop
            if (currentUser) {
                const canEditTask = task.visibility === 'PUBLIC' ||
                    task.user_id === currentUser.id ||
                    (task.assigned_users && task.assigned_users.includes(currentUser.id));

                if (!canEditTask) {
                    alert('Você não tem permissão para modificar esta tarefa privada.');
                    return;
                }
            }

            if (type === 'DEADLINE') onUpdateTask({ id: taskId, due_date: targetDateStr });
            else if (type === 'VISIT' && !stageName) {
                // It is a Travel event from 'travels' array
                const { travelId, travelIdx } = JSON.parse(dataStr);
                let targetIdx = -1;
                if (travelId) targetIdx = task.travels.findIndex(tr => tr.id === travelId);
                if (targetIdx === -1 && travelIdx !== undefined) targetIdx = travelIdx;

                if (targetIdx !== -1 && task.travels[targetIdx]) {
                    const updatedTravels = [...task.travels];
                    updatedTravels[targetIdx] = {
                        ...updatedTravels[targetIdx],
                        date: targetDateStr,
                        id: updatedTravels[targetIdx].id || crypto.randomUUID()
                    };
                    onUpdateTask({ id: taskId, travels: updatedTravels });
                }
            } else if ((type === 'PRODUCTION' || type === 'VISIT') && stageName) {
                const currentStage = task.stages[stageName];
                if (currentStage) onUpdateTask({ id: taskId, stages: { ...task.stages, [stageName]: { ...currentStage, date: targetDateStr } } });
            }
        } catch (error) { console.error(error); }
    };

    // Status Change
    const handleStatusChange = (event, newStatus) => {
        const task = event.originalTask;
        if (!task) return;

        if (event.type === 'DEADLINE') {
            // Update task status
            onUpdateTask({ ...task, status: newStatus });
        } else if (event.stageName) {
            // Update stage status
            const stage = task.stages[event.stageName];
            const updatedStages = {
                ...task.stages,
                [event.stageName]: { ...stage, status: newStatus }
            };
            onUpdateTask({ ...task, stages: updatedStages });
        }
        setSelectedEventId(null);
    };

    // Touch Drag Support
    useEffect(() => {
        if (!touchDragItem) return;

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            setTouchGhostPos({ x: touch.clientX, y: touch.clientY });

            // Detect drop target
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!el) return;
            const cell = el.closest('[data-date]');
            if (cell) {
                const date = cell.getAttribute('data-date');
                if (dragOverDate !== date) setDragOverDate(date);
            } else {
                if (dragOverDate) setDragOverDate(null);
            }
        };

        const handleTouchEnd = (e) => {
            const touch = e.changedTouches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (el) {
                const cell = el.closest('[data-date]');
                if (cell) {
                    const date = cell.getAttribute('data-date');
                    if (date) {
                        // Invoke handleDrop
                        const fakeEvent = {
                            preventDefault: () => { },
                            dataTransfer: {
                                getData: () => JSON.stringify({
                                    taskId: touchDragItem.taskId,
                                    type: touchDragItem.type,
                                    stageName: touchDragItem.stageName,
                                    travelId: touchDragItem.travelId,
                                    travelIdx: touchDragItem.travelIdx
                                })
                            }
                        };
                        handleDrop(fakeEvent, date);
                    }
                }
            }
            setTouchDragItem(null);
            setDragOverDate(null);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [touchDragItem, dragOverDate, tasks]); // Dependencies

    const handleTouchStart = (e, event) => {
        // e.stopPropagation(); // Let it bubble if needed, but usually we want to grab
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        setTouchDragItem(event);
        setTouchGhostPos({ x: touch.clientX, y: touch.clientY });
    };

    const getEventsForDay = (dayNum) => { const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`; return events.filter(e => e.date === dateStr); };
    const getEventsCountForMonth = (mIndex) => events.filter(e => { const [eY, eM] = e.date.split('-').map(Number); return eY === year && (eM - 1) === mIndex; }).length;

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    // Event Details Renderer
    const renderDetails = (event) => {
        if (event.type === 'VISIT') {
            const details = event.detailsData;
            // If it's a Travel (only has description) or has specific visit details
            if (details?.scheduledWith || details?.accompaniedBy || details?.contactInfo) {
                return (
                    <div className="space-y-1 text-xs">
                        {details?.scheduledWith && <p><span className="font-semibold text-slate-700">Com:</span> {details.scheduledWith}</p>}
                        {details?.accompaniedBy && <p><span className="font-semibold text-slate-700">Acomp:</span> {details.accompaniedBy}</p>}
                        {details?.contactInfo && <p><span className="font-semibold text-slate-700">Contato:</span> {details.contactInfo}</p>}
                        {details?.description && <p className="text-slate-600 italic pt-1 border-t border-slate-100 mt-1">{details.description}</p>}
                    </div>
                )
            }
        }
        return (
            <div className="text-xs">
                {event.detailsData?.description ? <p className="text-slate-600 line-clamp-4">{event.detailsData.description}</p> : <p className="text-slate-400 italic">Sem descrição.</p>}
            </div>
        )
    };

    // Status Options Renderer
    const renderStatusOptions = (event) => {
        let options = [];
        let currentStatus = '';

        if (event.type === 'DEADLINE') {
            currentStatus = event.originalTask.status;
            options = Object.keys(TaskStatus).map(k => ({ value: k, label: StatusLabels[k] }));
        } else if (event.stageName) {
            // Stage Statuses
            currentStatus = event.originalTask.stages[event.stageName]?.status;
            options = [
                { value: 'NOT_STARTED', label: 'Não Iniciada' },
                { value: 'IN_PROGRESS', label: 'Em Andamento' },
                { value: 'COMPLETED', label: 'Finalizada' },
            ];
            if (event.type === 'VISIT') {
                // Keep same options for now
            }
        } else if (event.type === 'VISIT' && (event.travelId || event.travelIdx !== undefined)) {
            // Travels don't have individual status yet, maybe use task status or disable?
            // For now, returning null to avoid crash and confusion
            return <div className="mt-2 pt-2 border-t border-slate-100"><p className="text-[10px] text-slate-400 italic">Viagem agendada</p></div>;
        } else {
            return null;
        }

        return (
            <div className="mt-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Alterar Status</label>
                <select
                    value={currentStatus || ''}
                    onChange={(e) => handleStatusChange(event, e.target.value)}
                    className="w-full text-xs p-1.5 rounded border border-slate-200 bg-slate-50 outline-none focus:border-brand-500"
                >
                    {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
        );
    }

    return (
        <div ref={calendarRef} className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 border-b border-slate-200 bg-slate-50 gap-3">
                <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                    {viewMode === 'DAY' && (
                        <button
                            onClick={() => setViewMode('MONTH')}
                            className="p-2 md:p-2 bg-brand-600 text-white rounded-lg shadow-lg flex items-center gap-1 shrink-0"
                            title="Voltar para o Mês"
                        >
                            <ChevronLeft size={20} />
                            <span className="text-sm font-bold md:hidden">Voltar</span>
                        </button>
                    )}
                    <h2 className="text-lg md:text-2xl font-bold text-slate-800 capitalize flex-1 sm:min-w-[200px] truncate">
                        {viewMode === 'MONTH' ? <>{monthNames[month]} <span className="text-slate-400 font-light">{year}</span></> :
                            viewMode === 'DAY' ? <>{day} de {monthNames[month]}</> :
                                <span className="text-slate-800 font-bold">{year}</span>}
                    </h2>
                    <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-sm shrink-0">
                        <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-slate-100 text-slate-600 rounded-l-lg"><ChevronLeft size={20} /></button>
                        <button onClick={handleToday} className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:sm font-medium border-l border-r border-slate-300 hover:bg-slate-100 text-slate-700">Hoje</button>
                        <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-slate-100 text-slate-600 rounded-r-lg"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-4 w-full sm:w-auto mt-1 sm:mt-0">
                    <div className="flex bg-slate-200 p-0.5 rounded-lg shrink-0">
                        <button onClick={() => setViewMode('MONTH')} className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'MONTH' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarIcon size={14} /> Mês</button>
                        <button onClick={() => setViewMode('YEAR')} className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'YEAR' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Grid size={14} /> Ano</button>
                    </div>
                    {viewMode === 'MONTH' && (<div className="hidden lg:flex gap-4 text-xs font-medium text-slate-500 border-l pl-4 border-slate-300"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div><span>Atrasado</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div><span>Visita</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div><span>Etapa</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div><span>Prazo</span></div></div>)}
                    {viewMode === 'DAY' && <button onClick={() => setViewMode('MONTH')} className="hidden sm:block text-xs text-brand-600 font-bold hover:underline">Voltar ao Mês</button>}
                </div>
            </div>

            {/* Content */}
            {viewMode === 'MONTH' && (
                <>
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                            <div key={i} className="py-2 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                        {calendarDays.map((calDay, index) => {
                            if (calDay === null) return <div key={`empty-${index}`} className="bg-slate-50/50 border-b border-r border-slate-100 min-h-[100px] md:min-h-[120px]" />;
                            const cDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(calDay).padStart(2, '0')}`;
                            const dEvents = getEventsForDay(calDay);
                            const isToday = cDateStr === todayStr;
                            const isDrag = dragOverDate === cDateStr;
                            return (
                                <div
                                    key={calDay}
                                    data-date={cDateStr}
                                    onDragOver={(e) => handleDragOver(e, cDateStr)}
                                    onDrop={(e) => handleDrop(e, cDateStr)}
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            setCurrentDate(new Date(year, month, calDay));
                                            setViewMode('DAY');
                                        }
                                    }}
                                    className={`border-b border-r border-slate-200 p-1 md:p-2 min-h-[100px] md:min-h-[120px] flex flex-col gap-0.5 md:gap-1 group ${isDrag ? 'bg-emerald-50 ring-2 ring-emerald-400' : isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50 cursor-pointer md:cursor-default'}`}
                                >
                                    <div className="flex justify-between items-start mb-0.5 md:mb-1 cursor-pointer" onDoubleClick={() => handleDayDoubleClick(calDay)} title="Clique duplo para ver detalhes">
                                        <span className={`text-[10px] md:text-sm font-bold w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-all hover:scale-110 ${isToday ? 'bg-brand-600 text-white shadow-md' : 'text-slate-700 bg-white md:bg-white hover:bg-slate-200'}`}>{calDay}</span>
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1 flex-1 relative overflow-y-auto custom-scrollbar pr-1">
                                        {dEvents.map(ev => {
                                            const isOver = ev.date < todayStr && !ev.isCompleted;
                                            const isSel = selectedEventId === ev.id;
                                            let bg = isOver ? 'bg-red-100 text-red-800 border-red-200' : ev.type === 'VISIT' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : ev.type === 'PRODUCTION' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200';
                                            return (
                                                <div key={ev.id} className="relative">
                                                    <div
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, ev)}
                                                        onTouchStart={(e) => handleTouchStart(e, ev)}
                                                        onClick={(e) => {
                                                            if (window.innerWidth >= 768) {
                                                                e.stopPropagation();
                                                                isSel ? setSelectedEventId(null) : setSelectedEventId(ev.id);
                                                            }
                                                        }}
                                                        onDoubleClick={(e) => { e.stopPropagation(); onEditTask(ev.originalTask); setSelectedEventId(null); }}
                                                        className={`w-full px-1 py-0.5 md:px-2 md:py-1.5 rounded text-[8px] md:text-[10px] font-bold border shadow-sm cursor-grab flex items-center gap-1 ${bg} ${isSel ? 'ring-2 ring-brand-400 z-10' : ''}`}
                                                    >
                                                        <span className="truncate pointer-events-none">{ev.title}</span>
                                                    </div>
                                                    {isSel && (
                                                        <div
                                                            ref={popupRef}
                                                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-[90vw] max-w-sm md:w-80 animate-in fade-in zoom-in duration-200"
                                                            style={{ margin: 0 }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex justify-between items-start mb-3 border-b pb-2">
                                                                <h4 className="text-sm font-bold text-slate-800 leading-tight pr-4">{ev.title}</h4>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${ev.type === 'DEADLINE' ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'}`}>
                                                                        {ev.type === 'DEADLINE' ? 'Prazo Final' : ev.type === 'VISIT' ? 'Visita' : ev.type === 'PRODUCTION' ? 'Produção' : ev.type}
                                                                    </div>
                                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedEventId(null); }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                                                </div>
                                                            </div>
                                                            <div className="mb-4">
                                                                {renderDetails(ev)}
                                                            </div>
                                                            {renderStatusOptions(ev)}
                                                            <div className="flex gap-2 pt-3 mt-2 border-t border-slate-100">
                                                                <button onClick={() => { onEditTask(ev.originalTask); setSelectedEventId(null); }} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"><Eye size={14} /> Ver Detalhes</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {viewMode === 'YEAR' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {monthNames.map((name, idx) => {
                            const count = getEventsCountForMonth(idx);
                            const isCurrent = idx === new Date().getMonth() && year === new Date().getFullYear();
                            return (
                                <div key={name} onClick={() => handleMonthClick(idx)} className={`relative p-6 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:border-brand-300 hover:scale-[1.02] ${isCurrent ? 'bg-white border-brand-200 ring-2 ring-brand-100' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-4"><h3 className={`text-lg font-bold ${isCurrent ? 'text-brand-700' : 'text-slate-700'}`}>{name}</h3>{isCurrent && <span className="text-[10px] font-bold bg-brand-100 text-brand-600 px-2 py-1 rounded-full uppercase">Atual</span>}</div>
                                    <div className="flex items-center gap-2"><div className={`text-3xl font-bold ${count > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{count}</div><span className="text-xs font-medium text-slate-500 uppercase">Eventos</span></div>
                                    {count > 0 && (<div className="mt-4 flex gap-1">{Array.from({ length: Math.min(count, 5) }).map((_, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>))}{count > 5 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}</div>)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewMode === 'DAY' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {getEventsForDay(day).length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhum evento para este dia.</p>
                            </div>
                        ) : (
                            getEventsForDay(day).map(ev => {
                                const isOver = ev.date < todayStr && !ev.isCompleted;
                                let borderClass = isOver ? 'border-l-4 border-l-red-500' : ev.type === 'VISIT' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500';
                                return (
                                    <div key={ev.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow ${borderClass}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    {ev.type === 'VISIT' ? <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin size={10} /> Visita</span> :
                                                        ev.type === 'DEADLINE' ? <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> Entrega</span> :
                                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Factory size={10} /> Produção</span>}
                                                    <span className="text-xs text-slate-400 font-mono">{ev.date.split('-').reverse().join('/')}</span>
                                                </div>
                                                <h3 className="text-base md:text-lg font-bold text-slate-800 cursor-pointer hover:text-brand-600 break-words" onClick={() => onEditTask(ev.originalTask)}>{ev.title}</h3>
                                                <div className="mt-2 text-sm text-slate-600 bg-slate-50/50 p-2 md:p-0 rounded md:bg-transparent">{renderDetails(ev)}</div>
                                            </div>
                                            <div className="w-full md:w-48 shrink-0">
                                                {renderStatusOptions(ev)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Drag Ghost */}
            {touchDragItem && (
                <div
                    style={{
                        position: 'fixed',
                        left: touchGhostPos.x,
                        top: touchGhostPos.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        pointerEvents: 'none'
                    }}
                    className="bg-brand-600 text-white p-2 rounded-lg shadow-2xl opacity-90 text-xs font-bold whitespace-nowrap border-2 border-white"
                >
                    {touchDragItem.title}
                </div>
            )}
        </div>
    );
};

export default CalendarView;
