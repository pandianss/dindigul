import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';

// Lazy load major modules
const PortalLanding = lazy(() => import('./modules/PortalLanding'));
const NoticeBoard = lazy(() => import('./modules/NoticeBoard'));
const BusinessSnapshot = lazy(() => import('./modules/BusinessSnapshot'));
const OfficeNoteManager = lazy(() => import('./modules/OfficeNoteManager'));
const SettingsManager = lazy(() => import('./modules/SettingsManager'));
const Dashboard = lazy(() => import('./modules/Dashboard'));
const GuestLanding = lazy(() => import('./modules/GuestLanding'));
const AssetManager = lazy(() => import('./modules/AssetManager'));
const CalendarManager = lazy(() => import('./modules/admin/CalendarManager'));
const PlanningAnalytics = lazy(() => import('./modules/PlanningAnalytics'));
// GAP 07: Wire missing modules
const AuditManager = lazy(() => import('./modules/AuditManager'));
const CommitteeManager = lazy(() => import('./modules/CommitteeManager'));
const CorrespondenceCenter = lazy(() => import('./modules/CorrespondenceCenter'));
const DispatchManager = lazy(() => import('./modules/DispatchManager'));
const ExpenditureManager = lazy(() => import('./modules/ExpenditureManager'));
const LegalManager = lazy(() => import('./modules/LegalManager'));
const MagazineGenerator = lazy(() => import('./modules/MagazineGenerator'));
const RequestManager = lazy(() => import('./modules/RequestManager'));
const InternalNoteSystem = lazy(() => import('./modules/InternalNote/InternalNoteSystem'));

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
            <ThemeProvider>
                <Suspense fallback={<ModuleLoader />}>
                    <PortalLanding onSelectPortal={(mode) => setPortalMode(mode)} />
                </Suspense>
            </ThemeProvider>
        );
    }

    // Regional User Portal (Requires Login)
    if (portalMode === 'region' && !user) {
        return (
            <ThemeProvider>
                <LoginScreen onLogin={login} onVisitGuest={() => setPortalMode('guest')} />
            </ThemeProvider>
        );
    }

    // Guest Portal (Full Screen)
    if (portalMode === 'guest') {
        return (
            <ThemeProvider>
                <ErrorBoundary>
                    <Suspense fallback={<ModuleLoader />}>
                        <GuestLanding onExitPortal={() => setPortalMode('landing')} />
                    </Suspense>
                </ErrorBoundary>
            </ThemeProvider>
        );
    }

    const renderModule = () => {

        switch (activeView) {
            case 'dashboard':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><Dashboard /></Suspense></ErrorBoundary>;
            case 'noticeBoard':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><NoticeBoard /></Suspense></ErrorBoundary>;
            case 'mis':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><BusinessSnapshot /></Suspense></ErrorBoundary>;
            case 'officeNotes':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><OfficeNoteManager /></Suspense></ErrorBoundary> : null;
            case 'settings':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><SettingsManager /></Suspense></ErrorBoundary> : null;
            case 'assets':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><AssetManager /></Suspense></ErrorBoundary> : null;
            case 'calendar':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><CalendarManager /></Suspense></ErrorBoundary>;
            case 'audit':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><AuditManager /></Suspense></ErrorBoundary> : null;
            case 'committees':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><CommitteeManager /></Suspense></ErrorBoundary> : null;
            case 'correspondence':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><CorrespondenceCenter /></Suspense></ErrorBoundary> : null;
            case 'dispatch':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><DispatchManager /></Suspense></ErrorBoundary> : null;
            case 'expenditure':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><ExpenditureManager /></Suspense></ErrorBoundary> : null;
            case 'legal':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><LegalManager /></Suspense></ErrorBoundary> : null;
            case 'magazine':
                return <ErrorBoundary><Suspense fallback={<ModuleLoader />}><MagazineGenerator /></Suspense></ErrorBoundary>;
            case 'requests':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><RequestManager /></Suspense></ErrorBoundary> : null;
            case 'planning':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><PlanningAnalytics /></Suspense></ErrorBoundary> : null;
            case 'internalNotes':
                return portalMode === 'region' ? <ErrorBoundary><Suspense fallback={<ModuleLoader />}><InternalNoteSystem /></Suspense></ErrorBoundary> : null;

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
        <ThemeProvider>
            <Layout
                activeView={activeView}
                onViewChange={setActiveView}
                portalMode={portalMode}
                onExitPortal={() => setPortalMode('landing')}
            >
                {renderModule()}
            </Layout>
        </ThemeProvider>
    );
}

export default App;
