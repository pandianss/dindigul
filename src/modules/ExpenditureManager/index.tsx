import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';

// Types
import { Budget, ExpenseSanction, SanctionFormState } from './types';

// Components
import { StatsGrid } from './components/Stats/StatsGrid';
import { SanctionRegister } from './components/Register/SanctionRegister';
import { DepartmentUtilization } from './components/Utilization/DepartmentUtilization';
import { SanctionForm } from './components/Forms/SanctionForm';

const ExpenditureManager: React.FC = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [sanctions, setSanctions] = useState<ExpenseSanction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterSection, setFilterSection] = useState('');

    const [form, setForm] = useState<SanctionFormState>({
        title: '',
        amount: 0,
        section: '',
        vendorName: '',
        billNo: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'REVENUE',
        budgetId: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [budgetsRes, sanctionsRes] = await Promise.all([
                api.get('/expenditure/budgets'),
                api.get(`/expenditure/sanctions${filterSection ? `?section=${filterSection}` : ''}`)
            ]);
            setBudgets(budgetsRes.data);
            setSanctions(sanctionsRes.data);
        } catch (error) {
            console.error('Error fetching expenditure data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterSection]);

    const handleDuplicateSanction = (sanction: ExpenseSanction) => {
        setForm({
            title: `${sanction.title} (Duplicate)`,
            amount: sanction.amount,
            section: sanction.section,
            vendorName: sanction.vendorName || '',
            billNo: '', 
            date: format(new Date(), 'yyyy-MM-dd'),
            type: sanction.type,
            budgetId: sanction.budget?.id || ''
        });
        setShowForm(true);
    };

    const handleSaveSanction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/expenditure/sanctions', {
                ...form,
                sanctionDate: form.date,
                status: 'APPROVED'
            });
            if (response.status === 200 || response.status === 201) {
                setShowForm(false);
                fetchData();
                resetForm();
            }
        } catch (error) {
            console.error('Error saving sanction:', error);
        }
    };

    const resetForm = () => {
        setForm({
            title: '',
            amount: 0,
            section: '',
            vendorName: '',
            billNo: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'REVENUE',
            budgetId: ''
        });
    };

    return (
        <div className="space-y-8 pt-8 h-[calc(100vh-100px)] flex flex-col overflow-hidden bg-[#fbfcfd] px-8">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-4xl font-black text-bank-navy tracking-tight">Expenditure & Budgets</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Real-time budget tracking & sanction management</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-bank-navy text-white px-8 py-3 rounded-2xl font-black flex items-center space-x-3 hover:opacity-90 transition-all shadow-2xl active:scale-95"
                    >
                        <Plus size={20} />
                        <span className="uppercase tracking-widest text-xs">New Sanction</span>
                    </button>
                </div>
            </div>

            <StatsGrid budgets={budgets} sanctions={sanctions} />

            <div className="flex-1 flex space-x-8 min-h-0 pb-8">
                <SanctionRegister 
                    sanctions={sanctions}
                    loading={loading}
                    filterSection={filterSection}
                    setFilterSection={setFilterSection}
                    onDuplicate={handleDuplicateSanction}
                />
                
                <DepartmentUtilization budgets={budgets} />
            </div>

            {showForm && (
                <>
                    <div
                        className="fixed inset-0 bg-bank-navy/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300"
                        onClick={() => setShowForm(false)}
                    />
                    <SanctionForm 
                        form={form}
                        setForm={setForm}
                        budgets={budgets}
                        onSave={handleSaveSanction}
                        onClose={() => setShowForm(false)}
                    />
                </>
            )}
        </div>
    );
};

export default ExpenditureManager;
