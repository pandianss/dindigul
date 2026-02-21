import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load major modules
const PortalLanding = lazy(() => import('./modules/PortalLanding'));
const NoticeBoard = lazy(() => import('./modules/NoticeBoard'));
const MISUpload = lazy(() => import('./modules/admin/MISUpload'));
const OfficeNoteManager = lazy(() => import('./modules/OfficeNoteManager'));
const SettingsManager = lazy(() => import('./modules/SettingsManager'));
const AssetManager = lazy(() => import('./modules/AssetManager'));
const CalendarManager = lazy(() => import('./modules/admin/CalendarManager'));

// Loading fallback component
const ModuleLoader = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200 animate-pulse">
        <div className="w-10 h-10 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-bank-teal/50">Initializing Module...</p>
    </div>
);

function App() {
    const { t } = useTranslation();
    const { user, login, isLoading } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');
    const [portalMode, setPortalMode] = useState<'landing' | 'guest' | 'region'>('landing');

    // Auto-select portal if already logged in
    useEffect(() => {
        if (user) {
            setPortalMode('region');
        }
    }, [user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-bank-navy flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                <p className="text-white/50 animate-pulse font-bold tracking-widest text-[10px] uppercase">Decrypting Terminal Session...</p>
            </div>
        );
    }

    // Portal Selection Entry Point
    if (portalMode === 'landing') {
        return (
            <Suspense fallback={<ModuleLoader />}>
                <PortalLanding onSelectPortal={(mode) => setPortalMode(mode)} />
            </Suspense>
        );
    }

    // Regional User Portal (Requires Login)
    if (portalMode === 'region' && !user) {
        return <LoginScreen onLogin={login} />;
    }

    const renderModule = () => {
        // Guest mode has limited modules
        if (portalMode === 'guest' && !['dashboard', 'noticeBoard', 'calendar'].includes(activeView)) {
            setActiveView('dashboard');
        }

        switch (activeView) {
            case 'dashboard':
                return (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-bank-navy tracking-tight">{t('nav.dashboard')}</h2>
                                <p className="text-gray-500 mt-1 font-medium italic">
                                    {portalMode === 'guest' ? 'Public Information Access' : 'Welcome to the Regional Operations Command Center'}
                                </p>
                            </div>
                            <div className="px-4 py-2 bg-bank-gold/10 border border-bank-gold/20 rounded-xl">
                                <span className="text-[10px] font-black text-bank-gold uppercase tracking-widest inline-flex items-center">
                                    <span className="w-1.5 h-1.5 bg-bank-gold rounded-full mr-2 animate-ping" />
                                    {portalMode === 'guest' ? 'Public Access Session' : 'Live System Status: Secured'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <ErrorBoundary>
                                    <Suspense fallback={<ModuleLoader />}>
                                        <NoticeBoard />
                                    </Suspense>
                                </ErrorBoundary>
                            </div>
                            <div className="space-y-8">
                                {portalMode === 'region' && (
                                    <div className="card p-6 bg-bank-navy text-white relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 relative z-10">Quick Actions</h3>
                                        <div className="grid grid-cols-2 gap-3 relative z-10">
                                            <button onClick={() => setActiveView('officeNotes')} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">New Note</button>
                                            <button onClick={() => setActiveView('mis')} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">MIS Upload</button>
                                        </div>
                                    </div>
                                )}
                                <ErrorBoundary>
                                    <Suspense fallback={<ModuleLoader />}>
                                        <CalendarManager />
                                    </Suspense>
                                </ErrorBoundary>
                            </div>
                        </div>
                    </div>
                );
            case 'noticeBoard':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><NoticeBoard /></Suspense></ErrorBoundary>;
            case 'mis':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><MISUpload /></Suspense></ErrorBoundary> : null;
            case 'officeNotes':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><OfficeNoteManager /></Suspense></ErrorBoundary> : null;
            case 'settings':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><SettingsManager /></Suspense></ErrorBoundary> : null;
            case 'assets':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><AssetManager /></Suspense></ErrorBoundary> : null;
            case 'calendar':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><CalendarManager /></Suspense></ErrorBoundary>;
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 card bg-gray-50/50 border-dashed">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-400">Module Under Construction</h3>
                        <p className="text-gray-400 text-sm mt-1">This operational area is currently being provisioned.</p>
                    </div>
                );
        }
    };

    return (
        <Layout
            activeView={activeView}
            onViewChange={setActiveView}
            portalMode={portalMode}
            onExitPortal={() => setPortalMode('landing')}
        >
            {renderModule()}
        </Layout>
    );
}

export default App;
