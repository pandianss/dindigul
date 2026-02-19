import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import CalendarManager from './modules/admin/CalendarManager'
import { useTranslation } from 'react-i18next'
import MISUpload from './modules/admin/MISUpload'
import NoticeBoard from './modules/NoticeBoard'
import CorrespondenceCenter from './modules/CorrespondenceCenter'
import OfficeNoteManager from './modules/OfficeNoteManager'
import RequestManager from './modules/RequestManager'
import CommitteeManager from './modules/CommitteeManager'
import DispatchManager from './modules/DispatchManager';
import ExpenditureManager from './modules/ExpenditureManager';
import LegalManager from './modules/LegalManager';
import AuditManager from './modules/AuditManager';
import AssetManager from './modules/AssetManager';
import MagazineGenerator from './modules/MagazineGenerator';

interface Snapshot {
  id: string;
  value: number;
  budget: number | null;
  status: string;
  parameter: {
    code: string;
    nameEn: string;
    unit: string;
  };
}

function App() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('dashboard');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/mis/snapshots')
      .then(res => res.json())
      .then(data => {
        setSnapshots(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching snapshots:', err);
        setLoading(false);
      });
  }, []);

  const getSnapshot = (code: string) => snapshots.find(s => s.parameter.code === code);

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-bank-navy">Regional Snapshot</h2>
            <div className="flex space-x-3 text-sm font-medium text-gray-500">
              <span>FY: 2025-26</span>
              <span>|</span>
              <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { code: 'TOTAL_DEPOSITS', label: 'mis.totalDeposits', color: 'amber' },
              { code: 'TOTAL_ADVANCES', label: 'mis.totalAdvances', color: 'bank-teal' },
              { code: 'CASA_RATIO', label: 'mis.casaRatio', color: 'blue' },
              { code: 'GROSS_NPA', label: 'mis.grossNpa', color: 'red' }
            ].map(param => {
              const snapshot = getSnapshot(param.code);
              return (
                <div key={param.code} className="card p-6">
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">{t(param.label)}</h3>
                  <div className="text-2xl font-bold text-bank-navy">
                    {snapshot ? `₹ ${snapshot.value.toLocaleString()} ${snapshot.parameter.unit}` : loading ? '...' : '--'}
                  </div>
                  {snapshot && (
                    <div className={`mt-2 text-xs font-bold text-${snapshot.status === 'SURPASSED' ? 'green' : 'red'}-600 bg-${snapshot.status === 'SURPASSED' ? 'green' : 'red'}-50 inline-block px-2 py-1 rounded`}>
                      {t(`status.${snapshot.status.toLowerCase()}`)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card p-8 bg-bank-navy text-white flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Welcome Back, RO Administrator</h2>
              <p className="text-blue-100 text-sm max-w-lg">
                The regional MIS has been updated as of 06:45 AM today.
                3 branches have triggered Operational Risk alerts. Please review the explanation letters.
              </p>
            </div>
            <button className="bg-bank-gold text-white px-6 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-lg ring-2 ring-white ring-offset-2 ring-offset-bank-navy">
              Review Alerts
            </button>
          </div>
        </div>
      )}

      {activeView === 'calendar' && <CalendarManager />}
      {activeView === 'mis' && <MISUpload />}
      {activeView === 'noticeBoard' && <NoticeBoard />}
      {activeView === 'letters' && <CorrespondenceCenter />}
      {activeView === 'officeNotes' && <OfficeNoteManager />}
      {activeView === 'requests' && <RequestManager />}
      {activeView === 'committees' && <CommitteeManager />}
      {activeView === 'dispatch' && <DispatchManager />}
      {activeView === 'expenditure' && <ExpenditureManager />}
      {activeView === 'legal' && <LegalManager />}
      {activeView === 'audit' && <AuditManager />}
      {activeView === 'assets' && <AssetManager />}

      {activeView === 'magazine' && <MagazineGenerator />}
    </Layout>
  )
}

export default App
