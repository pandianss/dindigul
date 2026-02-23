import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import PortalLanding from './modules/PortalLanding';
import { viewConfigs, type PortalMode } from './routes/config';

// Loading fallback component
const ModuleLoader = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200 animate-pulse">
        <div className="w-10 h-10 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-bank-teal/50">Initializing Module...</p>
    </div>
);

function App() {
    const { user, login, isLoading } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');
    const [portalMode, setPortalMode] = useState<PortalMode>('landing');

    // Auto-select portal if already logged in
    useEffect(() => {
        if (user) {
            setPortalMode('region');
        }
    }, [user]);

    const currentViewConfig = useMemo(() =>
        viewConfigs.find(v => v.id === activeView),
        [activeView]);

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
                <PortalLanding onSelectPortal={(mode: any) => setPortalMode(mode)} />
            </Suspense>
        );
    }

    // Regional User Portal (Requires Login)
    if (portalMode === 'region' && !user) {
        return <LoginScreen onLogin={login} />;
    }

    const renderModule = () => {
        if (!currentViewConfig) {
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

        // Access Control
        const isAllowed = currentViewConfig.allowedModes.includes(portalMode);
        const authStatisfied = !currentViewConfig.requiresAuth || (user !== null);

        if (!isAllowed || !authStatisfied) {
            // Fallback to dashboard if not allowed
            if (activeView !== 'dashboard') {
                setActiveView('dashboard');
            }
            return null;
        }

        const ViewComponent = currentViewConfig.component;

        return (
            <ErrorBoundary>
                <Suspense fallback={<ModuleLoader />}>
                    <ViewComponent />
                </Suspense>
            </ErrorBoundary>
        );
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
