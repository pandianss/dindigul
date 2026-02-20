import React, { useState, useEffect } from 'react';
import { Mail, Award, AlertCircle, RefreshCw, CheckCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

interface Letter {
    id: string;
    type: 'APPRECIATION' | 'EXPLANATION' | 'OP_RISK';
    status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED';
    titleEn: string;
    contentEn: string;
    branch: { nameEn: string };
    period: string;
    createdAt: string;
}

const CorrespondenceCenter: React.FC = () => {
    const [letters, setLetters] = useState<Letter[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchLetters = () => {
        setLoading(true);
        api.get('/letters')
            .then(res => res.data)
            .then(data => {
                setLetters(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching letters:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchLetters();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await api.post('/letters/generate', {
                period: format(new Date(), 'MMM yyyy')
            });
            if (response.status === 200) {
                fetchLetters();
            }
        } catch (error) {
            console.error('Error generating letters:', error);
        } finally {
            setGenerating(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/letters/${id}/status`, { status });
            fetchLetters();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Correspondence Center</h2>
                    <p className="text-gray-500">Manage formal appreciation and explanation letters</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md"
                >
                    <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                    <span>{generating ? 'Generating...' : 'Generate Monthly Drafts'}</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bank-navy"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {letters.length > 0 ? (
                        letters.map(letter => (
                            <div key={letter.id} className="card p-6 bg-white border border-gray-100 hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-3 rounded-xl ${letter.type === 'APPRECIATION' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {letter.type === 'APPRECIATION' ? <Award size={24} /> : <AlertCircle size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-bold text-bank-navy text-lg">{letter.titleEn}</h3>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${letter.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                                                    letter.status === 'SENT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {letter.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-tighter mb-2">
                                                To: {letter.branch.nameEn} • {letter.period}
                                            </p>
                                            <p className="text-gray-600 line-clamp-2 max-w-2xl">{letter.contentEn}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col space-y-2 items-end">
                                        <div className="text-xs text-gray-400 font-medium">{format(new Date(letter.createdAt), 'dd MMM yyyy')}</div>
                                        {letter.status === 'DRAFT' && (
                                            <button
                                                onClick={() => updateStatus(letter.id, 'SENT')}
                                                className="text-bank-teal text-sm font-bold flex items-center hover:underline"
                                            >
                                                Send to Branch <ChevronRight size={16} />
                                            </button>
                                        )}
                                        {letter.status === 'SENT' && (
                                            <div className="flex items-center space-x-1 text-blue-500 text-xs font-bold">
                                                <RefreshCw size={14} />
                                                <span>Awaiting Ack</span>
                                            </div>
                                        )}
                                        {letter.status === 'ACKNOWLEDGED' && (
                                            <div className="flex items-center space-x-1 text-green-500 text-xs font-bold">
                                                <CheckCircle size={14} />
                                                <span>Acknowledged</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 card border-dashed bg-gray-50">
                            <Mail className="mx-auto text-gray-300 mb-2" size={48} />
                            <p className="text-gray-500 font-medium text-lg">No letters generated yet</p>
                            <p className="text-gray-400 text-sm">Click "Generate Monthly Drafts" to start automated ranking.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CorrespondenceCenter;
