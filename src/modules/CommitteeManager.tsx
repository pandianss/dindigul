import React, { useState, useEffect } from 'react';
import {
    Calendar,
    CheckSquare,
    Plus,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Users2,
    Save
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

interface Committee {
    id: string;
    nameEn: string;
    code: string;
    frequency: string;
    meetings: Meeting[];
}

interface Meeting {
    id: string;
    date: string;
    venue: string;
    status: string;
    minutesJson?: string;
    actionPoints: ActionPoint[];
}

interface ActionPoint {
    id: string;
    content: string;
    dueDate?: string;
    status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
    assignedTo?: { fullNameEn: string };
    remarks?: string;
    meeting?: { committee: { nameEn: string } };
}

const CommitteeManager: React.FC = () => {
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [myActionPoints, setMyActionPoints] = useState<ActionPoint[]>([]);
    const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
    const [showMinutesForm, setShowMinutesForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const [minutesData, setMinutesData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        venue: 'Main Conference Room',
        content: '',
        actionPoints: [{ content: '', assignedToUserId: '', dueDate: '' }]
    });

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [commRes, apRes] = await Promise.all([
                api.get('/committees'),
                api.get('/committees/action-points/admin') // Mock user
            ]);
            setCommittees(commRes.data);
            setMyActionPoints(apRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
         
        fetchDashboardData();
    }, []);

    const handleAddActionPointRow = () => {
        setMinutesData({
            ...minutesData,
            actionPoints: [...minutesData.actionPoints, { content: '', assignedToUserId: '', dueDate: '' }]
        });
    };

    const handleSaveMinutes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCommittee) return;

        try {
            await api.post(`/committees/${selectedCommittee.id}/meetings`, {
                date: minutesData.date,
                venue: minutesData.venue,
                minutesJson: JSON.stringify({ content: minutesData.content }),
                actionPoints: minutesData.actionPoints.filter(ap => ap.content.trim())
            });
            setShowMinutesForm(false);
            fetchDashboardData();
        } catch (error) {
            console.error('Error saving minutes:', error);
        }
    };

    const handleUpdateAPStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/committees/action-points/${id}`, {
                status,
                completionDate: status === 'COMPLETED' ? new Date() : null
            });
            fetchDashboardData();
        } catch (error) {
            console.error('Error updating AP:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Committee Management</h2>
                    <p className="text-gray-500">Track regional meetings, minutes, and accountability</p>
                </div>
                <div className="flex space-x-3">
                    <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg flex items-center space-x-3">
                        <AlertTriangle className="text-amber-500" size={20} />
                        <div>
                            <p className="text-[10px] font-bold text-amber-600 uppercase">Pending Action Points</p>
                            <p className="text-lg font-bold text-amber-700 leading-none">{myActionPoints.filter(ap => ap.status !== 'COMPLETED').length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bank-navy"></div>
                </div>
            ) : (
                <div className="flex-1 flex space-x-6 min-h-0">
                    {/* Committee Grid */}
                    <div className="w-2/3 overflow-y-auto pr-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {committees.map(comm => (
                                <div
                                    key={comm.id}
                                    onClick={() => { setSelectedCommittee(comm); setShowMinutesForm(false); }}
                                    className={`card p-5 cursor-pointer transition-all border ${selectedCommittee?.id === comm.id ? 'border-bank-navy bg-blue-50/30 ring-1 ring-bank-navy' : 'hover:border-bank-teal/50'}`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-gray-50 rounded-xl text-bank-navy">
                                            <Users2 size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">
                                            {comm.frequency}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-bank-navy text-lg">{comm.nameEn}</h3>
                                    <p className="text-xs text-gray-500 font-medium">Code: {comm.code}</p>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                                            <Calendar size={14} />
                                            <span>Last: {comm.meetings[0] ? format(new Date(comm.meetings[0].date), 'dd MMM yyyy') : 'No record'}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedCommittee && (
                            <div className="animate-in slide-in-from-bottom duration-300">
                                {!showMinutesForm ? (
                                    <div className="card p-6 border-bank-navy/10">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-bank-navy text-xl">Meeting Records: {selectedCommittee.nameEn}</h3>
                                            <button
                                                onClick={() => setShowMinutesForm(true)}
                                                className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90"
                                            >
                                                <Plus size={18} />
                                                <span>Record New Minutes</span>
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {/* Mock meeting history list could go here */}
                                            <p className="text-center py-8 text-gray-400 italic font-medium border-2 border-dashed rounded-xl">
                                                Select "Record New Minutes" to document a meeting or view detailed history.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="card p-8 border-bank-teal/20 shadow-xl">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-xl font-bold text-bank-navy">Minutes of Meeting</h3>
                                            <button onClick={() => setShowMinutesForm(false)} className="text-gray-400 hover:text-red-500 font-bold text-sm">Discard</button>
                                        </div>
                                        <form onSubmit={handleSaveMinutes} className="space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Meeting</label>
                                                    <input
                                                        type="date" required className="w-full p-2 border rounded-lg"
                                                        value={minutesData.date}
                                                        onChange={e => setMinutesData({ ...minutesData, date: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Venue</label>
                                                    <input
                                                        type="text" required className="w-full p-2 border rounded-lg"
                                                        value={minutesData.venue}
                                                        onChange={e => setMinutesData({ ...minutesData, venue: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brief Discussion Summary</label>
                                                <textarea
                                                    rows={4} required className="w-full p-3 border rounded-lg"
                                                    placeholder="Key highlights of the committee meeting..."
                                                    value={minutesData.content}
                                                    onChange={e => setMinutesData({ ...minutesData, content: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-bold text-bank-navy uppercase tracking-widest">Drawn Action Points</label>
                                                    <button
                                                        type="button" onClick={handleAddActionPointRow}
                                                        className="text-xs font-bold text-bank-teal flex items-center space-x-1 hover:underline"
                                                    >
                                                        <Plus size={14} /> <span>Add Item</span>
                                                    </button>
                                                </div>
                                                {minutesData.actionPoints.map((ap, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 gap-2">
                                                        <input
                                                            className="col-span-6 p-2 text-xs border rounded-lg" placeholder="Action Required..."
                                                            value={ap.content}
                                                            onChange={e => {
                                                                const newAPs = [...minutesData.actionPoints];
                                                                newAPs[idx].content = e.target.value;
                                                                setMinutesData({ ...minutesData, actionPoints: newAPs });
                                                            }}
                                                        />
                                                        <input
                                                            className="col-span-3 p-2 text-xs border rounded-lg" type="date"
                                                            value={ap.dueDate}
                                                            onChange={e => {
                                                                const newAPs = [...minutesData.actionPoints];
                                                                newAPs[idx].dueDate = e.target.value;
                                                                setMinutesData({ ...minutesData, actionPoints: newAPs });
                                                            }}
                                                        />
                                                        <select
                                                            className="col-span-3 p-2 text-xs border rounded-lg"
                                                            value={ap.assignedToUserId}
                                                            onChange={e => {
                                                                const newAPs = [...minutesData.actionPoints];
                                                                newAPs[idx].assignedToUserId = e.target.value;
                                                                setMinutesData({ ...minutesData, actionPoints: newAPs });
                                                            }}
                                                        >
                                                            <option value="">Assign To...</option>
                                                            <option value="admin">Regional Manager</option>
                                                            <option value="sec-user">Section Officer</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-4">
                                                <button type="submit" className="w-full bg-bank-teal text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2">
                                                    <Save size={20} />
                                                    <span>Finalize Minutes & Assign Action Points</span>
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tracking Side Panel */}
                    <div className="w-1/3 flex flex-col space-y-6">
                        <div className="card p-6 flex-1 bg-gray-50/50 border-gray-100 overflow-hidden flex flex-col">
                            <div className="flex items-center space-x-3 mb-6 shrink-0">
                                <CheckSquare className="text-bank-teal" size={24} />
                                <h3 className="font-bold text-bank-navy uppercase tracking-widest text-sm">My Action Points</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                {myActionPoints.filter(ap => ap.status !== 'COMPLETED').map(ap => (
                                    <div key={ap.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {ap.meeting?.committee.nameEn}
                                            </span>
                                            {ap.dueDate && (
                                                <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">
                                                    Due: {format(new Date(ap.dueDate), 'dd MMM')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 mb-4">{ap.content}</p>
                                        <button
                                            onClick={() => handleUpdateAPStatus(ap.id, 'COMPLETED')}
                                            className="w-full py-1.5 text-[10px] font-bold border border-bank-teal text-bank-teal rounded-lg hover:bg-bank-teal hover:text-white transition-all flex items-center justify-center space-x-1"
                                        >
                                            <CheckCircle2 size={12} />
                                            <span>Mark Completed</span>
                                        </button>
                                    </div>
                                ))}
                                {myActionPoints.filter(ap => ap.status !== 'COMPLETED').length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-medium italic">No pending action points</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommitteeManager;
