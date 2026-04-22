import React, { useState, useRef, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Shield, ShieldCheck, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
    onLogin: (data: any) => Promise<void>;
    onVisitGuest: () => void;
}

const ROLES = [
    { value: 'ADMIN', label: 'System Administrator' },
    { value: 'RO_USER', label: 'Regional Office User' },
    { value: 'BRANCH_USER', label: 'Branch Level User' },
    { value: 'LPC_USER', label: 'Loan Processing Centre' },
    { value: 'GUEST', label: 'Guest / Public View' },
];

// ── MFA Step ─────────────────────────────────────────────────────────────────
const MfaStep: React.FC = () => {
    const { submitMfa, cancelMfa } = useAuth();
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const refs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    useEffect(() => { refs[0].current?.focus(); }, []);

    const handleDigit = (i: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...digits];
        next[i] = val.slice(-1);
        setDigits(next);
        if (val && i < 5) refs[i + 1].current?.focus();
        if (next.every(d => d) && next.join('').length === 6) {
            handleSubmit(next.join(''));
        }
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setDigits(pasted.split(''));
            handleSubmit(pasted);
        }
        e.preventDefault();
    };

    const handleSubmit = async (code: string) => {
        setLoading(true);
        setError(null);
        try {
            await submitMfa(code);
        } catch (err: any) {
            setError(err.message || 'Invalid code');
            setDigits(['', '', '', '', '', '']);
            refs[0].current?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#00A896]/8 blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#F4A261]/6 blur-[120px]" />
                <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="g2" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#g2)" />
                </svg>
            </div>

            <div className="w-full max-w-sm relative">
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#00A896]/15 border border-[#00A896]/30 flex items-center justify-center mb-4">
                            <ShieldCheck className="text-[#00A896]" size={28} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">Two-Factor Verification</h2>
                        <p className="text-white/40 text-sm text-center">Enter the 6-digit code from your authenticator app</p>
                    </div>

                    <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={refs[i]}
                                value={d}
                                onChange={e => handleDigit(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                maxLength={1}
                                inputMode="numeric"
                                className="w-11 h-14 text-center text-xl font-bold rounded-xl bg-white/[0.06] border border-white/10 text-white outline-none focus:border-[#00A896]/60 focus:bg-white/[0.1] transition-all caret-[#00A896]"
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-red-400 text-sm">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={() => handleSubmit(digits.join(''))}
                        disabled={loading || digits.some(d => !d)}
                        className="w-full py-4 rounded-2xl font-bold text-white bg-[#00A896] hover:bg-[#00A896]/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Verify Code <ChevronRight size={16} /></>}
                    </button>

                    <button onClick={cancelMfa} className="w-full mt-3 py-3 text-white/30 hover:text-white/60 text-sm transition-colors">
                        ← Back to login
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Access Denied / Auto-login Error ─────────────────────────────────────────
const AccessDeniedScreen: React.FC<{ error: { message: string; sysUser?: string }; onManualLogin: () => void; onGuest: () => void }> = ({ error, onManualLogin, onGuest }) => {
    const { autoLogin } = useAuth();
    const [sysLoading, setSysLoading] = useState(false);
    const [sysError, setSysError] = useState<string | null>(null);

    const handleSystemLogin = async () => {
        setSysLoading(true);
        setSysError(null);
        try {
            await autoLogin();
        } catch (err: any) {
            setSysError(err.message || 'System login failed');
        } finally {
            setSysLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[100px]" />
            </div>
            <div className="w-full max-w-sm relative">
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                            <AlertCircle className="text-red-400" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
                        <p className="text-white/40 text-sm text-center leading-relaxed">{error.message}</p>
                        {error.sysUser && (
                            <p className="text-white/20 text-xs mt-2 font-mono">System user: <span className="text-white/40">{error.sysUser}</span></p>
                        )}
                    </div>

                    {sysError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-red-400 text-sm">
                            <AlertCircle size={14} />
                            <span>{sysError}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button onClick={handleSystemLogin} disabled={sysLoading} className="w-full py-4 rounded-2xl font-bold text-white bg-[#00A896] hover:bg-[#00A896]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {sysLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><User size={16} /> Login with System Username</>}
                        </button>
                        <button onClick={onManualLogin} className="w-full py-4 rounded-2xl font-semibold text-white/70 bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2">
                            <Lock size={16} /> Enter Credentials Manually
                        </button>
                        <button onClick={onGuest} className="w-full py-4 rounded-2xl font-semibold text-white/50 bg-transparent hover:text-white/70 transition-all text-sm">
                            Visit Guest Portal
                        </button>
                        <button onClick={() => window.location.reload()} className="w-full py-3 text-white/30 hover:text-white/50 text-sm transition-colors flex items-center justify-center gap-2">
                            <RefreshCw size={13} /> Retry automatic access
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main Login Form ───────────────────────────────────────────────────────────
const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onVisitGuest }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('ADMIN');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const { autoLoginError, mfaPending, autoLogin } = useAuth();

    // MFA flow – render the OTP step
    if (mfaPending) return <MfaStep />;

    // Auto-login failed – show access denied
    if (autoLoginError && !showManualForm) {
        return <AccessDeniedScreen error={autoLoginError} onManualLogin={() => setShowManualForm(true)} onGuest={onVisitGuest} />;
    }

    const isAdmin = username.toLowerCase() === 'admin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await onLogin({ username, password, role: isAdmin ? selectedRole : undefined });
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Initial Selection View
    if (!showManualForm) {
        return (
            <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#00A896]/8 blur-[120px]" />
                    <div className="absolute bottom-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-[#F4A261]/5 blur-[140px]" />
                    <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#1A3A6B]/30 blur-[80px]" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="w-full max-w-sm relative">
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl backdrop-blur-xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
                        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#00A896] to-transparent opacity-60" />
                        <div className="p-8">
                            <div className="flex flex-col items-center mb-10">
                                <div className="bg-white/[0.06] border border-white/10 rounded-2xl px-6 py-3 mb-6">
                                    <img src="/assets/logo_full.svg" alt="Bank Logo" className="h-9 w-auto brightness-0 invert opacity-90" />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00A896]/10 border border-[#00A896]/20 rounded-full mb-4">
                                    <Shield size={10} className="text-[#00A896]" />
                                    <span className="text-[#00A896] text-[10px] font-bold uppercase tracking-widest">Identity Gateway</span>
                                </div>
                                <h2 className="text-white font-bold text-xl">Welcome Back</h2>
                                <p className="text-white/40 text-xs mt-1.5 text-center px-4">Select your preferred method to access the regional portal</p>
                            </div>

                            <div className="space-y-3.5">
                                <button
                                    onClick={() => setShowManualForm(true)}
                                    className="w-full group relative p-5 rounded-2xl font-bold text-sm transition-all duration-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 text-left flex items-center gap-4"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#F4A261]/10 flex items-center justify-center text-[#F4A261] group-hover:scale-110 transition-transform">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold">Login as Administrator</div>
                                        <div className="text-[10px] text-white/30 font-normal mt-0.5 uppercase tracking-wider">Manual Credentials</div>
                                    </div>
                                    <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        setError(null);
                                        try { await autoLogin(); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
                                    }}
                                    disabled={loading}
                                    className="w-full group relative p-5 rounded-2xl font-bold text-sm transition-all duration-300 bg-[#00A896]/10 border border-[#00A896]/20 hover:bg-[#00A896]/15 text-left flex items-center gap-4"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#00A896]/10 flex items-center justify-center text-[#00A896] group-hover:scale-110 transition-transform">
                                        {loading ? <RefreshCw size={22} className="animate-spin" /> : <User size={22} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[#00A896] font-bold">Login with System</div>
                                        <div className="text-[10px] text-[#00A896]/40 font-normal mt-0.5 uppercase tracking-wider">Active Directory SSO</div>
                                    </div>
                                    {!loading && <ChevronRight size={18} className="text-[#00A896]/20 group-hover:translate-x-1 transition-transform" />}
                                </button>
                                
                                {error && !loading && (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] uppercase font-bold tracking-tight animate-in fade-in duration-300">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-white/[0.05] px-8 py-4 flex items-center justify-center">
                            <button onClick={onVisitGuest} className="text-[10px] font-bold text-white/30 hover:text-white/60 uppercase tracking-[0.2em] transition-colors">
                                Explore Guest Portal
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-center text-[9px] text-white/15 uppercase tracking-[0.3em] mt-8">
                        Authorized Personnel Only
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Atmospheric background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#00A896]/8 blur-[120px]" />
                <div className="absolute bottom-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-[#F4A261]/5 blur-[140px]" />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#1A3A6B]/30 blur-[80px]" />
                {/* Subtle grid */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <div className="w-full max-w-sm relative">
                {/* Card */}
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl backdrop-blur-xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
                    {/* Top accent bar */}
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-[#00A896] to-transparent opacity-60" />

                    <div className="p-8">
                        {/* Logo & brand */}
                        <div className="flex flex-col items-center mb-8">
                            <button 
                                onClick={() => setShowManualForm(false)}
                                className="absolute left-6 top-8 text-white/20 hover:text-white/50 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest group"
                            >
                                <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                                <span>Back</span>
                            </button>
                            <div className="bg-white/[0.06] border border-white/10 rounded-2xl px-6 py-3 mb-5">
                                <img src="/assets/logo_full.svg" alt="Bank Logo" className="h-9 w-auto object-contain brightness-0 invert opacity-90" />
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00A896]/10 border border-[#00A896]/20 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00A896] animate-pulse" />
                                <span className="text-[#00A896] text-[10px] font-bold uppercase tracking-widest">Admin Authorization</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Username */}
                            <div>
                                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 ml-1">Staff ID</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-[#00A896] transition-colors duration-200">
                                        <User size={16} />
                                    </div>
                                    <input
                                        type="text" required
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/8 focus:border-[#00A896]/40 focus:bg-white/[0.07] pl-11 pr-4 py-3.5 rounded-2xl outline-none transition-all duration-200 font-medium text-white placeholder-white/15 text-sm"
                                        placeholder="Enter Active Directory ID"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-[#00A896] transition-colors duration-200">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'} required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/8 focus:border-[#00A896]/40 focus:bg-white/[0.07] pl-11 pr-12 py-3.5 rounded-2xl outline-none transition-all duration-200 font-medium text-white placeholder-white/15 text-sm"
                                        placeholder="••••••••••"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Admin role selector */}
                            {isAdmin && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-bold text-[#F4A261]/60 uppercase tracking-widest mb-2 ml-1">
                                        Role Override <span className="text-[#F4A261]/40">(Testing)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F4A261]/40">
                                            <Shield size={15} />
                                        </div>
                                        <select
                                            value={selectedRole}
                                            onChange={e => setSelectedRole(e.target.value)}
                                            className="w-full bg-[#F4A261]/[0.05] border border-[#F4A261]/15 focus:border-[#F4A261]/30 pl-11 pr-4 py-3.5 rounded-2xl outline-none transition-all font-medium text-white/80 text-sm appearance-none cursor-pointer"
                                        >
                                            {ROLES.map(r => <option key={r.value} value={r.value} className="bg-[#0A1628]">{r.label}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#F4A261]/40">
                                            <ChevronRight size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-2.5 p-3.5 bg-red-500/[0.08] border border-red-500/15 rounded-2xl text-red-400 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full group relative py-4 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-200 disabled:opacity-50 mt-2"
                            >
                                <div className="absolute inset-0 bg-[#00A896]" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#00A896] to-[#00C2AC] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center justify-center gap-2 text-white">
                                    {loading
                                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><Lock size={15} /> Authorize Access</>
                                    }
                                </div>
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/[0.05] px-8 py-4 flex items-center justify-between">
                        <button className="text-[10px] font-semibold text-white/20 hover:text-white/40 uppercase tracking-wider transition-colors">Support</button>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-[#00A896]/60" />
                            <span className="text-[9px] text-white/15 uppercase tracking-wider">256-bit TLS</span>
                        </div>
                        <button className="text-[10px] font-semibold text-white/20 hover:text-white/40 uppercase tracking-wider transition-colors">Incident</button>
                    </div>
                </div>

                <p className="text-center text-[9px] text-white/15 uppercase tracking-[0.3em] mt-6 leading-loose">
                    All session activity is logged • {new Date().getFullYear()} Regional Office
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;
