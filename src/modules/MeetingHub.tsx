import React, { useState, useEffect } from 'react';
import { 
    Plus, FileText, Download, Pencil, Trash2, Calendar, Users, 
    ChevronRight, Search, Clock, ShieldCheck, Printer, Save, X, PlusCircle
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { getErrorMessage } from '../utils/handleError';
import { cn } from '../utils/cn';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const quillModules = {
    toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['clean']
    ],
};

const quillStyle = `
  .quill { 
    background: white;
    border: none !important;
  }
  .ql-toolbar { 
    border: none !important; 
    border-bottom: 1px solid #f1f5f9 !important; 
    background: #ffffff;
    padding: 8px 12px !important;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .ql-container { 
    border: none !important;
    min-height: 600px;
    font-family: 'Outfit', sans-serif;
  }
  .ql-editor { 
    font-size: 15px;
    line-height: 1.8;
    color: #1e293b;
    padding: 40px !important;
  }
  .ql-editor h1 { font-size: 24px; font-weight: 800; color: #1e3a5f; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
  .ql-editor h2 { font-size: 18px; font-weight: 700; color: #254aa0; margin-top: 25px; margin-bottom: 12px; }
  .ql-editor p { margin-bottom: 15px; }
`;

const MEETING_TEMPLATES = {
    performance: `<h1>PERFORMANCE REVIEW COMMITTEE</h1>
<h2>1. Key Parameters Analysis</h2>
<p><strong>SB:</strong> [Data]<br><strong>CD:</strong> [Data]<br><strong>CASA:</strong> [Data]<br><strong>TD:</strong> [Data]<br><strong>ADV:</strong> [Data]<br><strong>BUSINESS:</strong> [Data]</p>
<h2>2. Strategic Discussion</h2>
<p>Deliberations were held on the current performance trajectory...</p>
<h2>3. Action Points</h2>
<ul><li>[Task 1] - Action by: [Dept]</li><li>[Task 2] - Action by: [Dept]</li></ul>`,
    general: `<h1>GENERAL ADDRESS / COMMITTEE MEETING</h1>
<h2>1. Introduction</h2>
<p>The committee convened to discuss general administrative and operational matters...</p>
<h2>2. Proceedings</h2>
<p>Record major discussion points here...</p>
<h2>3. Final Decisions</h2>
<p>Summary of resolutions passed during the meeting...</p>`,
    audit: `<h1>AUDIT & COMPLIANCE REVIEW</h1>
<h2>1. Pendency Analysis</h2>
<p>Detailed review of pending audit observations and compliance status...</p>
<h2>2. Risk Mitigation</h2>
<p>Discussion on operational risk exceptions and mitigation strategies...</p>`
};

interface Committee {
    id: string;
    nameEn: string;
    description?: string;
}

interface Meeting {
    id: string;
    committeeId: string;
    date: string;
    venue: string;
    status: string;
    minutesJson: string;
    attendees: any;
    signatories: any;
    committee: Committee;
}

const MeetingHub: React.FC = () => {
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    
    // Form State
    const [currentStep, setCurrentStep] = useState(1);
    const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [venue, setVenue] = useState('Regional Office Dindigul');
    const [minutesHtml, setMinutesHtml] = useState('');
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
    const [selectedSignatories, setSelectedSignatories] = useState<string[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    useEffect(() => {
        fetchCommittees();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedCommitteeId) {
            fetchMeetings(selectedCommitteeId);
        }
    }, [selectedCommitteeId]);

    const fetchCommittees = async () => {
        try {
            const res = await api.get('/meetings/committees');
            setCommittees(res.data);
            if (res.data.length > 0 && !selectedCommitteeId) {
                setSelectedCommitteeId(res.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch committees');
        }
    };

    const fetchMeetings = async (cid: string) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/meetings/committee/${cid}/meetings`);
            setMeetings(res.data);
        } catch (err) {
            console.error('Failed to fetch meetings');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/user?limit=1000'); // Fixed endpoint from the route check
            setUsers(res.data.users || []);
        } catch (err) {
            console.error('Failed to fetch users');
        }
    };

    const handleSaveMeeting = async () => {
        if (!selectedCommitteeId) return;
        
        const payload = {
            committeeId: selectedCommitteeId,
            date: new Date(date).toISOString(),
            venue,
            title: meetingTitle || committees.find(c => c.id === selectedCommitteeId)?.nameEn || 'Meeting',
            minutes: minutesHtml,
            attendees: selectedAttendees,
            signatories: selectedSignatories,
            status: 'FINAL'
        };

        try {
            let meetingId = currentMeetingId;
            if (currentMeetingId) {
                await api.put(`/meetings/${currentMeetingId}`, payload);
            } else {
                const res = await api.post('/meetings', payload);
                meetingId = res.data.id;
            }
            
            // Automatically trigger PDF download after save
            if (meetingId) {
                await handleDownloadPDF(meetingId, committees.find(c => c.id === selectedCommitteeId)?.nameEn || 'Meeting');
            }

            setIsEditing(false);
            fetchMeetings(selectedCommitteeId);
            resetForm();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const resetForm = () => {
        setCurrentStep(1);
        setCurrentMeetingId(null);
        setMeetingTitle('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setVenue('Regional Office Dindigul');
        setMinutesHtml('');
        setSelectedAttendees([]);
        setSelectedSignatories([]);
        setUserSearchTerm('');
    };

    const handleEditMeeting = (m: Meeting) => {
        setCurrentMeetingId(m.id);
        setDate(format(new Date(m.date), 'yyyy-MM-dd'));
        setVenue(m.venue);
        
        const rawMinutes = JSON.parse(m.minutesJson || '""');
        if (typeof rawMinutes === 'string') {
            setMinutesHtml(rawMinutes);
        } else if (Array.isArray(rawMinutes)) {
            // Migration helper for existing table data
            const legacyHtml = rawMinutes.map(row => `
                <div style="margin-bottom: 20px;">
                    <p><strong>Proceedings:</strong> ${row.content || row.discussion || ''}</p>
                    ${row.decision ? `<p><strong>Decision:</strong> ${row.decision}</p>` : ''}
                    ${row.responsibility ? `<p><small>Responsibility: ${row.responsibility}</small></p>` : ''}
                </div>
            `).join('');
            setMinutesHtml(legacyHtml);
        }
        
        setSelectedAttendees(m.attendees || []);
        setSelectedSignatories(m.signatories || []);
        setIsEditing(true);
    };

    const handleApplyTemplate = (type: keyof typeof MEETING_TEMPLATES) => {
        if (minutesHtml && !confirm('Applying a template will overwrite your current content. Proceed?')) return;
        setMinutesHtml(MEETING_TEMPLATES[type]);
    };

    return (
        <div className="flex bg-[#f8fafc] rounded-3xl border border-white shadow-2xl overflow-hidden h-[calc(100vh-140px)]">
            {/* Sidebar: Navigation */}
            <div className="w-72 border-r border-gray-200/50 bg-white flex flex-col p-6">
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-2 bg-bank-navy rounded-xl text-white">
                        <ShieldCheck size={20} />
                    </div>
                    <h2 className="text-sm font-black text-bank-navy uppercase tracking-widest">Committees</h2>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                    {committees.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCommitteeId(c.id)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between group",
                                selectedCommitteeId === c.id 
                                    ? "bg-bank-navy text-white shadow-lg" 
                                    : "hover:bg-bank-navy/5 text-gray-500 hover:text-bank-navy"
                            )}
                        >
                            <span className="text-[13px] font-bold truncate pr-2">{c.nameEn}</span>
                            <ChevronRight size={14} className={cn("shrink-0", selectedCommitteeId === c.id ? "text-white" : "text-gray-300")} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {!isEditing ? (
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-black text-bank-navy uppercase tracking-tight">Meeting Dashboard</h1>
                                <p className="text-gray-400 text-sm mt-1">Review and manage official committee records</p>
                            </div>
                            <button 
                                onClick={() => { resetForm(); setIsEditing(true); }}
                                className="flex items-center gap-2 px-6 py-3 bg-bank-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bank-navy/90 transition-all shadow-xl shadow-bank-navy/20"
                            >
                                <Plus size={16} /> New Meeting
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Retrieving Minutes...</p>
                            </div>
                        ) : meetings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Users size={40} className="text-gray-300 mb-4" />
                                <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Meetings Recorded</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {meetings.map(m => (
                                    <div key={m.id} className="card p-6 bg-white hover:shadow-2xl transition-all border-gray-100 group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-gray-50 rounded-2xl text-bank-navy font-black text-xs group-hover:bg-bank-navy group-hover:text-white transition-colors uppercase tracking-widest">
                                                {format(new Date(m.date), 'dd.MM.yy')}
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditMeeting(m)} className="p-2 hover:bg-bank-navy/5 text-gray-400 hover:text-bank-navy rounded-lg transition-colors">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => handleDownloadPDF(m.id, m.committee.nameEn)} className="p-2 hover:bg-bank-navy/5 text-gray-400 hover:text-bank-navy rounded-lg transition-colors">
                                                    <Printer size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="font-black text-bank-navy uppercase text-sm mb-2">{m.committee.nameEn}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                            <Clock size={12} />
                                            <span>Venue: {m.venue}</span>
                                        </div>
                                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {(m.attendees || []).slice(0, 3).map((_, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-bank-teal/20 border-2 border-white flex items-center justify-center text-[10px] font-black text-bank-teal">M</div>
                                                ))}
                                                {(m.attendees || []).length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-500">
                                                        +{(m.attendees || []).length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-bank-teal bg-bank-teal/5 px-3 py-1.5 rounded-full">Finalized</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col h-full bg-[#f8fafc]">
                        {/* Wizard Progress Header */}
                        <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-50">
                            <div className="flex items-center gap-6">
                                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400">
                                    <X size={20} />
                                </button>
                                <div className="h-10 w-px bg-gray-100" />
                                <div className="flex items-center gap-4">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <div key={s} className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all",
                                                currentStep === s ? "bg-bank-navy text-white shadow-lg scale-110" : 
                                                currentStep > s ? "bg-bank-teal text-white" : "bg-gray-100 text-gray-400"
                                            )}>
                                                {currentStep > s ? <ShieldCheck size={14} /> : s}
                                            </div>
                                            {s < 5 && <div className="w-8 h-0.5 bg-gray-100" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {currentStep > 1 && (
                                    <button 
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Back
                                    </button>
                                )}
                                {currentStep < 5 ? (
                                    <button 
                                        onClick={() => setCurrentStep(prev => prev + 1)}
                                        className="px-8 py-3 bg-bank-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bank-teal transition-all shadow-xl shadow-bank-navy/20"
                                    >
                                        Next Component
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSaveMeeting}
                                        className="px-8 py-3 bg-bank-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bank-navy transition-all shadow-xl shadow-bank-teal/20"
                                    >
                                        Save & Finalize PDF
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Wizard Content Area */}
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            <div className="max-w-3xl mx-auto">
                                {currentStep === 1 && (
                                    <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-5">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Calendar size={32} />
                                            </div>
                                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 1: Meeting Date</h3>
                                            <p className="text-gray-400 text-sm mt-1">Select the official date for the minutes record</p>
                                        </div>
                                        <div className="max-w-xs mx-auto">
                                            <input 
                                                type="date" 
                                                value={date} 
                                                onChange={(e) => setDate(e.target.value)} 
                                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-black text-lg text-bank-navy outline-none transition-all text-center"
                                            />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-5">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <ShieldCheck size={32} />
                                            </div>
                                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 2: Title & Category</h3>
                                            <p className="text-gray-400 text-sm mt-1">What is the focus of this meeting?</p>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Meeting Title / Subject</label>
                                                <input 
                                                    type="text" 
                                                    value={meetingTitle} 
                                                    onChange={(e) => setMeetingTitle(e.target.value)} 
                                                    placeholder="e.g. Monthly Performance Review - Dindigul Region"
                                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Committee Category (Optional)</label>
                                                <p className="text-[10px] text-gray-400 mb-3 italic">Committees help group recurring meetings (e.g. Regional Audit, Branch Review)</p>
                                                <select 
                                                    value={selectedCommitteeId || ''} 
                                                    onChange={(e) => setSelectedCommitteeId(e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all appearance-none"
                                                >
                                                    <option value="">Select Category...</option>
                                                    {committees.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-5">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Clock size={32} />
                                            </div>
                                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 3: Location / Venue</h3>
                                            <p className="text-gray-400 text-sm mt-1">Where was the meeting held?</p>
                                        </div>
                                        <div className="space-y-4">
                                            <input 
                                                type="text" 
                                                value={venue} 
                                                onChange={(e) => setVenue(e.target.value)} 
                                                placeholder="e.g. Conference Hall, Regional Office"
                                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all text-center"
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Regional Office', 'Main Branch', 'Virtual (MS Teams)', 'Zonal Office'].map(v => (
                                                    <button key={v} onClick={() => setVenue(v)} className="p-3 text-[10px] font-black uppercase bg-gray-50 rounded-xl hover:bg-bank-navy hover:text-white transition-all">{v}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <div className="bg-white min-h-[700px] rounded-sm border border-gray-200 shadow-2xl flex flex-col group relative animate-in zoom-in-95">
                                        <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest">Step 4: Meeting Brief (Proceedings)</h3>
                                            <div className="flex gap-1.5 rounded-lg bg-white p-1 shadow-sm border border-gray-100">
                                                <button onClick={() => handleApplyTemplate('performance')} className="px-2 py-1 text-[8px] font-black uppercase text-gray-400 hover:text-bank-navy">Performance</button>
                                                <button onClick={() => handleApplyTemplate('general')} className="px-2 py-1 text-[8px] font-black uppercase text-gray-400 hover:text-bank-navy border-x border-gray-100">General</button>
                                                <button onClick={() => handleApplyTemplate('audit')} className="px-2 py-1 text-[8px] font-black uppercase text-gray-400 hover:text-bank-navy">Audit</button>
                                            </div>
                                        </div>
                                        <style>{quillStyle}</style>
                                        <ReactQuill 
                                            theme="snow"
                                            value={minutesHtml} 
                                            onChange={setMinutesHtml}
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['link'],
                                                    ['clean']
                                                ],
                                            }}
                                            placeholder="Record meeting proceedings, deliberations, and resolutions here..."
                                            className="flex-1"
                                        />
                                    </div>
                                )}

                                {currentStep === 5 && (
                                    <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-10 animate-in fade-in slide-in-from-bottom-5">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Users size={32} />
                                            </div>
                                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 5: Staff Provisioning</h3>
                                            <p className="text-gray-400 text-sm mt-1">Select officials for signatures and attendance</p>
                                        </div>

                                        <div className="space-y-8">
                                            {/* Signatories Selector */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-bank-navy tracking-[0.2em] mb-2 block">1. Signatories (Min 1)</label>
                                                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-2xl min-h-[50px]">
                                                    {selectedSignatories.map(sid => (
                                                        <div key={sid} className="px-3 py-1.5 bg-bank-navy text-white rounded-full flex items-center gap-2 text-[10px] font-bold">
                                                            {users.find(u => u.id === sid)?.fullNameEn}
                                                            <button onClick={() => setSelectedSignatories(prev => prev.filter(id => id !== sid))}><X size={12}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <select 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val && !selectedSignatories.includes(val)) setSelectedSignatories(p => [...p, val]);
                                                        e.target.value = '';
                                                    }}
                                                    className="w-full px-6 py-4 bg-gray-100 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Add Signatory...</option>
                                                    {users.filter(u => u.role === 'ADMIN' || u.role === 'RO_MANAGER').map(u => (
                                                        <option key={u.id} value={u.id}>{u.fullNameEn} ({u.designationEn || u.role})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Attendees Selector */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2 block">2. Attendance Sheet</label>
                                                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-2xl min-h-[50px]">
                                                    {selectedAttendees.map(aid => (
                                                        <div key={aid} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full flex items-center gap-2 text-[10px] font-bold">
                                                            {users.find(u => u.id === aid)?.fullNameEn}
                                                            <button onClick={() => setSelectedAttendees(prev => prev.filter(id => id !== aid))}><X size={12}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <select 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val && !selectedAttendees.includes(val)) setSelectedAttendees(p => [...p, val]);
                                                        e.target.value = '';
                                                    }}
                                                    className="w-full px-6 py-4 bg-gray-100 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Add to Attendance...</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>{u.fullNameEn} ({u.designationEn || u.role})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingHub;
