import React, { useState, useEffect } from 'react';
import { Shield, Calendar, Building2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatLocalISO } from '../../utils/dateUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Types
import { Branch, Visit, User } from './types';

// Components
import { DICGCReturn } from './components/DICGC/DICGCReturn';
import { VisitDashboard } from './components/Monthly/VisitDashboard';
import { ReportGenerator } from './components/Monthly/ReportGenerator';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const ReturnsManager: React.FC = () => {
    const { user } = useAuth();
    const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'halfyearly'>('monthly');
    
    const [staff, setStaff] = useState<User[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Monthly View State
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [preparerId, setPreparerId] = useState('');
    const [signatoryId, setSignatoryId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sRes, vRes] = await Promise.allSettled([
                api.get(`/users?limit=2000`),
                api.get(`/visits`)
            ]);
            if (sRes.status === 'fulfilled') setStaff(sRes.value.data.data || sRes.value.data || []);
            if (vRes.status === 'fulfilled') setVisits(Array.isArray(vRes.value.data) ? vRes.value.data : []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDownloadReport = async (type: 'visits' | 'observation', visitId?: string) => {
        try {
            const url = type === 'visits' 
                ? `/returns/generate-visits?month=${selectedMonth}&preparerId=${preparerId}&signatoryId=${signatoryId}`
                : `/returns/generate-visit-letter/${visitId}`;
            const res = await api.get(url, { responseType: 'blob' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(new Blob([res.data]));
            link.setAttribute('download', `${type}_report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) { 
            alert('Report generation failed'); 
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-in fade-in duration-700">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <Shield className="w-10 h-10 text-indigo-600" />
                        Returns Hub
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 ml-1">
                        Consolidated Statutory & Regional Reporting Center
                    </p>
                </div>
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
                    {['monthly', 'quarterly', 'halfyearly'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriod(p as any)} 
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                                period === p ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            {period === 'monthly' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="lg:col-span-1">
                        <ReportGenerator 
                            selectedMonth={selectedMonth}
                            setSelectedMonth={setSelectedMonth}
                            preparerId={preparerId}
                            setPreparerId={setPreparerId}
                            signatoryId={signatoryId}
                            setSignatoryId={setSignatoryId}
                            staff={staff}
                            onGenerate={() => handleDownloadReport('visits')}
                        />
                    </div>
                    <VisitDashboard 
                        visits={visits.filter(v => v.visitDate.startsWith(selectedMonth))}
                        onAddLog={() => {}} // Could trigger a modal in a real app
                        onDownloadObservation={(id) => handleDownloadReport('observation', id)}
                    />
                </div>
            )}

            {period === 'quarterly' && (
                <div className="h-96 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 animate-in zoom-in-95 duration-500">
                    <Calendar size={48} className="mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-xs">Quarterly Returns Pending Provisioning</p>
                </div>
            )}

            {period === 'halfyearly' && (
                <DICGCReturn staff={staff} />
            )}
        </div>
    );
};

export default ReturnsManager;
