import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

// Types
import { Manual, Activity, Department, ManualForm, ActivityForm } from './types';

// Components
import { FilterBar } from './components/List/FilterBar';
import { ManualSidebar } from './components/List/ManualSidebar';
import { ManualHeader } from './components/Detail/ManualHeader';
import { ActivityList } from './components/Detail/ActivityList';
import { ManualModal } from './components/Editor/ManualModal';
import { ActivityModal } from './components/Editor/ActivityModal';
import { SOPDocument } from './components/Professional/SOPDocument';

const DepartmentManuals: React.FC = () => {
    const { user } = useAuth();
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDeptId, setFilterDeptId] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedManual, setSelectedManual] = useState<Manual | null>(null);
    
    // Modal state
    const [showManualModal, setShowManualModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showProfessionalView, setShowProfessionalView] = useState(false);
    const [manualForm, setManualForm] = useState<ManualForm>({ 
        titleEn: '', titleTa: '', titleHi: '', description: '', 
        departmentId: user?.departmentId || '' 
    });
    const [activityForm, setActivityForm] = useState<ActivityForm>({ 
        titleEn: '', titleTa: '', titleHi: '', description: '', 
        frequency: 'MONTHLY', dueDate: '', status: 'ACTIVE' 
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [manRes, depRes] = await Promise.all([
                api.get('/manuals'),
                api.get('/departments')
            ]);
            setManuals(manRes.data);
            setDepartments(depRes.data);

            if (selectedManual) {
                const updated = manRes.data.find((m: Manual) => m.id === selectedManual.id);
                if (updated) setSelectedManual(updated);
            }
        } catch (err) {
            console.error('Failed to fetch manuals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredManuals = manuals.filter(m => {
        const matchesSearch = m.titleEn.toLowerCase().includes(search.toLowerCase()) ||
                             m.department?.nameEn.toLowerCase().includes(search.toLowerCase());
        const matchesDept = filterDeptId === 'all' || m.departmentId === filterDeptId;
        return matchesSearch && matchesDept;
    });

    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...manualForm,
                departmentId: user?.role === 'ADMIN' ? manualForm.departmentId : user?.departmentId
            };

            if (editingId) {
                await api.put(`/manuals/${editingId}`, payload);
            } else {
                await api.post('/manuals', payload);
            }
            setShowManualModal(false);
            setManualForm({ 
                titleEn: '', titleTa: '', titleHi: '', description: '', 
                departmentId: user?.departmentId || '' 
            });
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert('Failed to save manual');
        }
    };

    const handleSaveActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedManual) return;
        try {
            if (editingId) {
                await api.put(`/manuals/activities/${editingId}`, activityForm);
            } else {
                await api.post(`/manuals/${selectedManual.id}/activities`, activityForm);
            }
            setShowActivityModal(false);
            setActivityForm({ 
                titleEn: '', titleTa: '', titleHi: '', description: '', 
                frequency: 'MONTHLY', dueDate: '', status: 'ACTIVE' 
            });
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert('Failed to save activity');
        }
    };

    const handleDeleteManual = async (id: string) => {
        if (!window.confirm('Delete this manual and all its activities?')) return;
        try {
            await api.delete(`/manuals/${id}`);
            if (selectedManual?.id === id) setSelectedManual(null);
            fetchData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleDeleteActivity = async (id: string) => {
        if (!window.confirm('Remove this activity?')) return;
        try {
            await api.delete(`/manuals/activities/${id}`);
            fetchData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const isAuthorized = user?.role === 'ADMIN' || user?.role === 'RO_USER';

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <FilterBar 
                search={search}
                setSearch={setSearch}
                filterDeptId={filterDeptId}
                setFilterDeptId={setFilterDeptId}
                departments={departments}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isAuthorized={isAuthorized}
                onCreateManual={() => { 
                    setEditingId(null); 
                    setManualForm({ titleEn: '', titleTa: '', titleHi: '', description: '', departmentId: user?.departmentId || '' }); 
                    setShowManualModal(true); 
                }}
            />

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-40">
                    <div className="w-12 h-12 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                    <p className="font-black text-[10px] uppercase tracking-widest text-bank-navy">Accessing Vault...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Manuals List Sidebar */}
                    <div className={cn("lg:col-span-4 space-y-4", selectedManual && "hidden lg:block")}>
                        <ManualSidebar 
                            manuals={filteredManuals}
                            selectedManualId={selectedManual?.id}
                            onSelect={setSelectedManual}
                        />
                    </div>

                    {/* Manual Detail View */}
                    <div className={cn("lg:col-span-8", !selectedManual && "hidden lg:flex flex-col items-center justify-center bg-gray-50/30 rounded-[3rem] border border-dashed border-gray-200 py-32")}>
                        {selectedManual ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <ManualHeader 
                                    manual={selectedManual}
                                    onClose={() => setSelectedManual(null)}
                                    isAuthorized={isAuthorized}
                                    userDeptId={user?.departmentId}
                                    userRole={user?.role}
                                    onEdit={() => {
                                        setEditingId(selectedManual.id); 
                                        setManualForm({ 
                                            titleEn: selectedManual.titleEn, 
                                            titleTa: selectedManual.titleTa || '', 
                                            titleHi: selectedManual.titleHi || '', 
                                            description: selectedManual.description || '', 
                                            departmentId: selectedManual.departmentId 
                                        }); 
                                        setShowManualModal(true); 
                                    }}
                                    onDelete={() => handleDeleteManual(selectedManual.id)}
                                    onViewProfessional={() => setShowProfessionalView(true)}
                                    onAddActivity={() => {
                                        setEditingId(null); 
                                        setActivityForm({ 
                                            titleEn: '', titleTa: '', titleHi: '', description: '', 
                                            frequency: 'MONTHLY', dueDate: '', status: 'ACTIVE' 
                                        }); 
                                        setShowActivityModal(true); 
                                    }}
                                />

                                <ActivityList 
                                    activities={selectedManual.activities}
                                    isAuthorized={isAuthorized}
                                    canManageActivities={isAuthorized && (selectedManual.departmentId === user?.departmentId || user?.role === 'ADMIN')}
                                    onEditActivity={(activity) => {
                                        setEditingId(activity.id); 
                                        setActivityForm({ 
                                            titleEn: activity.titleEn, 
                                            titleTa: activity.titleTa || '', 
                                            titleHi: activity.titleHi || '', 
                                            description: activity.description || '', 
                                            frequency: activity.frequency, 
                                            dueDate: activity.dueDate || '',
                                            status: activity.status
                                        }); 
                                        setShowActivityModal(true); 
                                    }}
                                    onDeleteActivity={handleDeleteActivity}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-gray-200 shadow-inner mb-6 ring-8 ring-white/50">
                                    <BookOpen size={40} />
                                </div>
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Manuals Vault</h2>
                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest max-w-[200px] text-center leading-relaxed">
                                    Select a manual from the left to view standard operating procedures and activities.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showManualModal && (
                <ManualModal 
                    editingId={editingId}
                    departments={departments}
                    manualForm={manualForm}
                    setManualForm={setManualForm}
                    onSave={handleSaveManual}
                    onClose={() => setShowManualModal(false)}
                    isAuthorized={isAuthorized}
                />
            )}

            {showActivityModal && (
                <ActivityModal 
                    editingId={editingId}
                    activityForm={activityForm}
                    setActivityForm={setActivityForm}
                    onSave={handleSaveActivity}
                    onClose={() => setShowActivityModal(false)}
                />
            )}

            {showProfessionalView && selectedManual && (
                <SOPDocument 
                    manual={selectedManual}
                    onClose={() => setShowProfessionalView(false)}
                />
            )}
        </div>
    );
};

export default DepartmentManuals;
