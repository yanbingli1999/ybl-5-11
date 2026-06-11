import { useEffect, useState } from 'react';
import ConfigPanel from '@/components/ConfigPanel';
import HeatCanvas from '@/components/HeatCanvas';
import ControlBar from '@/components/ControlBar';
import Timeline from '@/components/Timeline';
import ExperimentPanel from '@/components/ExperimentPanel';
import StabilityDiagnosticPanel from '@/components/StabilityDiagnosticPanel';
import DiagnosisHistoryModal from '@/components/DiagnosisHistoryModal';
import useSimulationStore from '@/store/useSimulationStore';
import useStabilityDiagnostic from '@/hooks/useStabilityDiagnostic';
import api from '@/services/api';
import { Flame, ShieldAlert, ShieldCheck, ShieldX, ArrowLeft, Eye } from 'lucide-react';
import type { StabilityDiagnosis } from '@shared/types';

export default function Home() {
  const {
    setMaterials,
    setExperiments,
    setFavorites,
    setSnapshots,
    currentExperimentId,
    stability,
    setViewingHistoryDiagnosis,
  } = useSimulationStore();

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryDiagnosis, setSelectedHistoryDiagnosis] = useState<StabilityDiagnosis | null>(null);

  useStabilityDiagnostic();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [materials, experiments, favorites] = await Promise.all([
          api.materials.getAll(),
          api.experiments.getAll(),
          api.favorites.getAll(),
        ]);
        
        setMaterials(materials);
        setExperiments(experiments);
        setFavorites(favorites);
      } catch (error) {
        console.error('加载初始数据失败:', error);
      }
    };

    loadInitialData();
  }, [setMaterials, setExperiments, setFavorites]);

  useEffect(() => {
    if (currentExperimentId) {
      const loadSnapshots = async () => {
        try {
          const snapshots = await api.snapshots.getByExperiment(currentExperimentId);
          setSnapshots(snapshots);
        } catch (error) {
          console.error('加载快照失败:', error);
        }
      };
      loadSnapshots();
    }
  }, [currentExperimentId, setSnapshots]);

  const isViewingHistory = stability.viewingHistoryDiagnosis !== null;
  const activeDiagnosis = isViewingHistory ? stability.viewingHistoryDiagnosis : stability.latestDiagnosis;
  const riskLevel = activeDiagnosis?.riskLevel || 'safe';

  const riskIndicatorConfig = {
    safe: {
      icon: <ShieldCheck className="w-4 h-4" />,
      label: '安全',
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/30 border-emerald-500/30',
      pulse: 'bg-emerald-500',
    },
    warning: {
      icon: <ShieldAlert className="w-4 h-4" />,
      label: '警告',
      color: 'text-amber-400',
      bg: 'bg-amber-900/30 border-amber-500/30',
      pulse: 'bg-amber-500',
    },
    danger: {
      icon: <ShieldX className="w-4 h-4" />,
      label: '危险',
      color: 'text-red-400',
      bg: 'bg-red-900/30 border-red-500/30',
      pulse: 'bg-red-500',
    },
  };

  const riskConfig = riskIndicatorConfig[riskLevel];

  const handleShowHistory = () => {
    setShowHistoryModal(true);
  };

  const handleSelectHistoryDiagnosis = (diagnosis: StabilityDiagnosis) => {
    setSelectedHistoryDiagnosis(diagnosis);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">热扩散实验室</h1>
            <p className="text-xs text-slate-400">Heat Diffusion Simulator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isViewingHistory ? (
            <button
              onClick={() => setViewingHistoryDiagnosis(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:brightness-110 bg-blue-900/30 border-blue-500/30 text-blue-400"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回当前诊断</span>
            </button>
          ) : (
            <button
              onClick={handleShowHistory}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:brightness-110 ${riskConfig.bg} ${riskConfig.color}`}
            >
              <div className="relative">
                {riskConfig.icon}
                {riskLevel !== 'safe' && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${riskConfig.pulse} rounded-full animate-ping`} />
                )}
              </div>
              <span>稳定性: {riskConfig.label}</span>
              {activeDiagnosis && activeDiagnosis.issues.length > 0 && (
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  {activeDiagnosis.issues.length}
                </span>
              )}
            </button>
          )}
          {isViewingHistory && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-900/20 border border-amber-500/20 rounded-lg">
              <Eye className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">查看历史记录</span>
            </div>
          )}
          <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800 rounded-md">v1.2.0</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ConfigPanel />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <HeatCanvas />
          <Timeline />
          <ControlBar />
        </div>

        <div className="flex h-full shrink-0">
          <div className="w-72 border-l border-slate-700 h-full overflow-hidden">
            <ExperimentPanel />
          </div>
          <StabilityDiagnosticPanel onShowHistory={handleShowHistory} />
        </div>
      </div>

      <DiagnosisHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectDiagnosis={handleSelectHistoryDiagnosis}
      />
    </div>
  );
}
