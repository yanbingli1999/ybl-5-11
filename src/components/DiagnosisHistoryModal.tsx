import React from 'react';
import {
  X,
  History,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
  ChevronRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import useSimulationStore from '../store/useSimulationStore';
import type { StabilityDiagnosis, StabilityRiskLevel } from '@shared/types';

interface DiagnosisHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDiagnosis: (diagnosis: StabilityDiagnosis) => void;
}

const riskBadgeConfig: Record<StabilityRiskLevel, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  safe: {
    label: '安全',
    icon: <CheckCircle className="w-3 h-3" />,
    className: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30',
  },
  warning: {
    label: '警告',
    icon: <AlertTriangle className="w-3 h-3" />,
    className: 'bg-amber-900/30 text-amber-400 border-amber-500/30',
  },
  danger: {
    label: '危险',
    icon: <XCircle className="w-3 h-3" />,
    className: 'bg-red-900/30 text-red-400 border-red-500/30',
  },
};

export const DiagnosisHistoryModal: React.FC<DiagnosisHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectDiagnosis,
}) => {
  const { stability, clearDiagnosisHistory, setLatestDiagnosis } = useSimulationStore();

  const handleSelect = (diagnosis: StabilityDiagnosis) => {
    setLatestDiagnosis(diagnosis);
    onSelectDiagnosis(diagnosis);
    onClose();
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatFourier = (value: number): string => {
    if (value >= 0.01) return value.toFixed(4);
    return value.toExponential(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">诊断历史记录</h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              共 {stability.diagnosisHistory.length} 条
            </span>
          </div>
          <div className="flex items-center gap-2">
            {stability.diagnosisHistory.length > 0 && (
              <button
                onClick={clearDiagnosisHistory}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                清空历史
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {stability.diagnosisHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <History className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">暂无诊断历史记录</p>
              <p className="text-xs mt-1">调整参数时将自动记录诊断结果</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...stability.diagnosisHistory].reverse().map((diagnosis, index) => {
                const config = riskBadgeConfig[diagnosis.riskLevel];
                const isLatest = index === 0;

                return (
                  <button
                    key={diagnosis.id}
                    onClick={() => handleSelect(diagnosis)}
                    className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg transition-all group text-left"
                  >
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${config.className}`}>
                      {config.icon}
                      {config.label}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200 font-medium">
                          {formatTime(diagnosis.timestamp)}
                        </span>
                        {isLatest && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                            最新
                          </span>
                        )}
                        {diagnosis.isAutoFixed && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" />
                            已修正
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Fo = {formatFourier(diagnosis.fourierNumber)}
                        </span>
                        <span>
                          {diagnosis.params.gridWidth}×{diagnosis.params.gridHeight}
                        </span>
                        <span>
                          Δt = {diagnosis.params.timeStep.toExponential(2)}s
                        </span>
                        {diagnosis.issues.length > 0 && (
                          <span className="text-amber-400">
                            {diagnosis.issues.length} 个问题
                          </span>
                        )}
                      </div>

                      {diagnosis.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {diagnosis.issues.slice(0, 3).map((issue, i) => (
                            <span
                              key={i}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                issue.severity === 'high'
                                  ? 'bg-red-900/30 text-red-400'
                                  : issue.severity === 'medium'
                                  ? 'bg-amber-900/30 text-amber-400'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {issue.type === 'stability'
                                ? '稳定性'
                                : issue.type === 'accuracy'
                                ? '精度'
                                : issue.type === 'boundary'
                                ? '边界'
                                : '性能'}
                            </span>
                          ))}
                          {diagnosis.issues.length > 3 && (
                            <span className="text-xs text-slate-500">
                              +{diagnosis.issues.length - 3} 更多
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-700 bg-slate-900/90">
          <p className="text-xs text-slate-500 text-center">
            点击历史记录可查看当时的诊断详情，最多保留 50 条记录
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisHistoryModal;
