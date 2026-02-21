import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (data: any) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await onLogin({ username, password });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bank-navy flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements for premium feel */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-bank-teal/10 rounded-full -mr-64 -mt-64 blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-bank-gold/5 rounded-full -ml-64 -mb-64 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

            <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
                <div className="bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20 backdrop-blur-sm">
                    <div className="p-10 pt-12">
                        <div className="flex flex-col items-center mb-12">
                            {/* Brand Logo Integration */}
                            <div className="mb-8 w-full flex justify-center">
                                <img src="/assets/logo_full.svg" alt="Bank Logo" className="h-12 w-auto object-contain" />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    <span>Staff Identifier</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-bank-teal transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text" required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-gray-50/50 border-2 border-transparent focus:border-bank-teal/30 focus:bg-white pl-14 pr-4 py-4 rounded-2xl outline-none transition-all font-bold text-bank-navy placeholder-gray-300"
                                        placeholder="Enter AD ID"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    <span>Terminal Password</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-bank-teal transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'} required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-50/50 border-2 border-transparent focus:border-bank-teal/30 focus:bg-white pl-14 pr-14 py-4 rounded-2xl outline-none transition-all font-bold text-bank-navy placeholder-gray-300"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-bank-navy transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-top-2 duration-300">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full group relative bg-bank-navy text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-bank-navy/30 hover:shadow-bank-navy/40 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-95 disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-bank-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-[0.1]" />
                                <div className="relative flex items-center justify-center space-x-3">
                                    {loading ? (
                                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Lock size={20} className="group-hover:text-bank-gold transition-colors" />
                                            <span>Authorize Session</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    </div>

                    <div className="bg-gray-50/80 p-8 border-t border-gray-100 flex items-center justify-center space-x-6">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-bank-teal transition-colors cursor-pointer">Support Desk</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-bank-teal transition-colors cursor-pointer">Incident Report</span>
                    </div>
                </div>

                <div className="flex flex-col items-center mt-12 space-y-4">
                    <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.6em] text-center max-w-xs leading-loose">
                        SECURE TERMINAL — 2048-BIT ENCRYPTION ACTIVE — ALL SESSION ACTIVITY LOGGED SINCE {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
