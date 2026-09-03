import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { NewInspectionView } from './components/NewInspectionView';
import { InspectionDetailView } from './components/InspectionDetailView';
import { HistoryView } from './components/HistoryView';
import { RiskIntelligenceView } from './components/RiskIntelligenceView';
import { RuleDatabaseView } from './components/RuleDatabaseView';
import { InspectionReportModal } from './components/InspectionReportModal';
import { NoticeDraftModal } from './components/NoticeDraftModal';
import { DigitalComparisonModal } from './components/DigitalComparisonModal';
import { api } from './services/api';
import { Inspection, RiskIntelligenceAnalytics } from './types';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<RiskIntelligenceAnalytics | undefined>();
  const [initialPresetId, setInitialPresetId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [activeModal, setActiveModal] = useState<'report' | 'notice' | 'comparison' | null>(null);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [inspRes, analyticsRes] = await Promise.all([
        api.getInspections(),
        api.getRiskIntelligence(),
      ]);

      if (inspRes.success && inspRes.data) {
        setInspections(inspRes.data);
      }
      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSelectInspection = (id: string) => {
    setSelectedInspectionId(id);
    setCurrentTab('inspection_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartNewInspection = () => {
    setInitialPresetId(undefined);
    setCurrentTab('new_inspection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadPreset = (presetId: string) => {
    setInitialPresetId(presetId);
    setCurrentTab('new_inspection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectionCreated = (inspection: Inspection) => {
    setInspections(prev => [inspection, ...prev.filter(i => i.id !== inspection.id)]);
    setSelectedInspectionId(inspection.id);
    setCurrentTab('inspection_detail');
    // refresh analytics
    api.getRiskIntelligence().then(res => {
      if (res.success && res.data) setAnalytics(res.data);
    });
  };

  const handleDeleteInspection = async (id: string) => {
    try {
      await api.deleteInspection(id);
      setInspections(prev => prev.filter(i => i.id !== id));
      if (selectedInspectionId === id) {
        setSelectedInspectionId(null);
        setCurrentTab('dashboard');
      }
      const res = await api.getRiskIntelligence();
      if (res.success && res.data) setAnalytics(res.data);
    } catch (err) {
      console.error('Error deleting inspection:', err);
    }
  };

  const selectedInspection = inspections.find(i => i.id === selectedInspectionId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewInspection={handleStartNewInspection}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading && inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Initializing Aletiq Legal Metrology Compliance Engine...
            </p>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {currentTab === 'dashboard' && (
              <DashboardView
                inspections={inspections}
                analytics={analytics}
                onSelectInspection={handleSelectInspection}
                onNewInspection={handleStartNewInspection}
                onViewAllRecords={() => setCurrentTab('history')}
                onViewRiskIntelligence={() => setCurrentTab('risk_intelligence')}
                onViewRuleDatabase={() => setCurrentTab('rule_database')}
                onLoadPreset={handleLoadPreset}
              />
            )}

            {/* New Inspection Tab */}
            {currentTab === 'new_inspection' && (
              <NewInspectionView
                initialPresetId={initialPresetId}
                onInspectionCreated={handleInspectionCreated}
                onCancel={() => setCurrentTab('dashboard')}
              />
            )}

            {/* Inspection Detail Tab */}
            {currentTab === 'inspection_detail' && selectedInspection && (
              <InspectionDetailView
                inspection={selectedInspection}
                onBack={() => setCurrentTab('history')}
                onOpenReport={() => setActiveModal('report')}
                onOpenNotice={() => setActiveModal('notice')}
                onOpenComparison={() => setActiveModal('comparison')}
              />
            )}

            {/* History Tab */}
            {currentTab === 'history' && (
              <HistoryView
                inspections={inspections}
                onSelectInspection={handleSelectInspection}
                onDeleteInspection={handleDeleteInspection}
                onNewInspection={handleStartNewInspection}
              />
            )}

            {/* Risk Intelligence Tab */}
            {currentTab === 'risk_intelligence' && (
              <RiskIntelligenceView analytics={analytics} />
            )}

            {/* Rule Database Tab */}
            {currentTab === 'rule_database' && <RuleDatabaseView />}
          </>
        )}
      </main>

      {/* Modals */}
      {activeModal === 'report' && selectedInspection && (
        <InspectionReportModal
          inspection={selectedInspection}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'notice' && selectedInspection && (
        <NoticeDraftModal
          inspection={selectedInspection}
          notice={
            selectedInspection.noticeDraft || {
              noticeNumber: `ALETIQ/LMD-SIH/2026/INSP-${selectedInspection.id}`,
              date: new Date().toLocaleDateString('en-IN'),
              inspectorName: selectedInspection.inspectorName || 'Legal Metrology Inspector',
              inspectorDesignation: 'Inspector of Legal Metrology (Enforcement)',
              issuingAuthority: 'Office of the Controller of Legal Metrology, Dept. of Consumer Affairs',
              entityName: selectedInspection.result?.extractedDeclarations.manufacturer_name?.value || 'The Manufacturer / Packer',
              entityAddress: selectedInspection.result?.extractedDeclarations.manufacturer_address?.value || 'Distribution Records',
              productName: selectedInspection.productName || 'Packaged Commodity',
              batchNumber: selectedInspection.batchNumber || 'As Inspected',
              issues: [],
              statutoryReferences: ['Legal Metrology Act, 2009', 'LMPC Rules, 2011'],
              draftStatus: 'DRAFT_NOT_OFFICIAL',
              disclaimer: 'DRAFT DOCUMENT FOR INSPECTION ASSISTANCE ONLY.',
            }
          }
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'comparison' && selectedInspection && (
        <DigitalComparisonModal
          inspection={selectedInspection}
          onClose={() => setActiveModal(null)}
          onComparisonUpdated={updated => {
            setInspections(prev => prev.map(i => (i.id === updated.id ? updated : i)));
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Aletiq</span>
            <span>•</span>
            <span>SIH 2026 Problem Statement SIH26034</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Legal Metrology (Packaged Commodities) Compliance Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
