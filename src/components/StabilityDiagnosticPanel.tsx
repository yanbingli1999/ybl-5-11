import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Wrench,
  History,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';
import useSimulationStore from '../store/useSimulationStore';
import { StabilityDiagnosticEngine } from '../engine/StabilityDiagnostic';
import type { StabilityDiagnosis, StabilityRiskLevel, StabilityIssue } from '@shared/types';

const riskConfig: Record<StabilityRiskLevel, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  pulseColor: string;
}> = {
  safe: {
    label: '安全',
    icon: <CheckCircle className="w-5 h-5" />,
    bgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
    pulseColor: 'bg-emerald-500',
  },
  warning: {
    label: '警告',
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    pulseColor: 'bg-amber-500',
  },
  danger: {
    label: '危险',
    icon: <XCircle className="w-5 h-5" />,
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    pulseColor: 'bg-red-500',
  },
};

const issueTypeConfig: Record<StabilityIssue['type'], {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  stability: {
    label: '数值稳定性',
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-red-400',
  },
  accuracy: {
    label: '计算精度',
    icon: <Info className="w-4 h-4" />,
    color: 'text-blue-400',
  },
  boundary: {
    label: '边界条件',
    icon: <Info className="w-4 h-4" />,
    color: 'text-purple-400',
  },
  performance: {
    label: '计算性能',
    icon: <Info className="w-4 h-4" />,
    color: 'text-cyan-400',
  },
};

const severityConfig: Record<StabilityIssue['severity'], {
  label: string;
  color: string;
  bgColor: string;
}> = {
  low: {
    label: '低',
    color: 'text-slate-400',
    bgColor: 'bg-slate-700/50',
  },
  medium: {
    label: '中',
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/30',
  },
  high: {
    label: '高',
    color: 'text-red-400',
    bgColor: 'bg-red-900/30',
  },
};

interface StabilityDiagnosticPanelProps {
  onShowHistory: () => void;
}

export const StabilityDiagnosticPanel: React.FC<StabilityDiagnosticPanelProps> = ({
  onShowHistory,
}) => {
  const {
    stability,
    setAutoFixEnabled,
    applyFixSuggestions,
  } = useSimulationStore();

  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const diagnosis = stability.latestDiagnosis;

  const toggleIssue = (issueIndex: number) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      const key = `issue-${issueIndex}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAutoFix = () => {
    if (!diagnosis) return;
    const suggestions = StabilityDiagnosticEngine.getAutoFixSuggestions(diagnosis);
    if (suggestions.length > 0) {
      applyFixSuggestions(suggestions);
    }
  };

  const formatFourier = (value: number): string => {
    if (value >= 1) return value.toFixed(2);
    if (value >= 0.01) return value.toFixed(4);
    return value.toExponential(2);
  };

  const getStabilityPercentage = (diagnosis: StabilityDiagnosis): number => {
    const ratio = diagnosis.fourierNumber / diagnosis.maxStableFourier;
    return Math.min(100, Math.max(0, ratio * 100));
  };

  const getAutoFixCount = (diagnosis: StabilityDiagnosis): number => {
    return StabilityDiagnosticEngine.getAutoFixSuggestions(diagnosis).length;
  };

  if (!diagnosis) {
    return (
      <div className="w-72 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 h-full overflow-y-auto p-4">
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">正在初始化诊断系统...</p>
          </div>
        </div>
      </div>
    );
  }

  const config = riskConfig[diagnosis.riskLevel];
  const stabilityPercentage = getStabilityPercentage(diagnosis);
  const autoFixCount = getAutoFixCount(diagnosis);

  return (
    <div className="w-72 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 h-full overflow-y-auto p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            稳定性诊断
          </h2>
          <button
            onClick={onShowHistory}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <History className="w-3 h-3" />
            历史
            <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
              {stability.diagnosisHistory.length}
            </span>
          </button>
        </div>
        <div className="h-px bg-slate-700" />
      </div>

      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`${config.textColor} relative`}>
              {config.icon}
              {diagnosis.riskLevel !== 'safe' && (
                <span className={`absolute -top-1 -right-1 w-2 h-2 ${config.pulseColor} rounded-full animate-ping`} />
              )}
            </div>
            <span className={`font-bold ${config.textColor}`}>
              {config.label}
            </span>
          </div>
          {diagnosis.isAutoFixed && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded">
              <Sparkles className="w-3 h-3" />
              已自动修正
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">傅里叶数 Fo</span>
              <span className={`font-mono ${
                diagnosis.fourierNumber > diagnosis.maxStableFourier
                  ? 'text-red-400'
                  : diagnosis.fourierNumber > 0.2
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {formatFourier(diagnosis.fourierNumber)} / {diagnosis.maxStableFourier}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  diagnosis.riskLevel === 'danger'
                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                    : diagnosis.riskLevel === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, stabilityPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-slate-500">
              <span>稳定</span>
              <span>不稳定</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-500">扩散系数 α</div>
              <div className="font-mono text-slate-200">
                {diagnosis.params.diffusionCoefficient.toExponential(2)} m²/s
              </div>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-500">时间步长 Δt</div>
              <div className="font-mono text-slate-200">
                {diagnosis.params.timeStep.toExponential(2)} s
              </div>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-500">网格尺寸</div>
              <div className="font-mono text-slate-200">
                {diagnosis.params.gridWidth}×{diagnosis.params.gridHeight}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-500">边界温差</div>
              <div className="font-mono text-slate-200">
                {diagnosis.params.boundaryTempDiff.toFixed(0)}°C
              </div>
            </div>
          </div>
        </div>
      </div>

      {diagnosis.issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            检测到 {diagnosis.issues.length} 个问题
          </h3>

          <div className="space-y-2">
            {diagnosis.issues.map((issue, index) => {
              const issueKey = `issue-${index}`;
              const isExpanded = expandedIssues.has(issueKey);
              const typeConfig = issueTypeConfig[issue.type];
              const sevConfig = severityConfig[issue.severity];

              return (
                <div
                  key={index}
                  className={`border rounded-lg overflow-hidden ${sevConfig.bgColor} border-slate-700`}
                >
                  <button
                    onClick={() => toggleIssue(index)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`${typeConfig.color}`}>
                        {typeConfig.icon}
                      </span>
                      <span className="text-sm text-slate-200 text-left">
                        {typeConfig.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${sevConfig.bgColor} ${sevConfig.color}`}>
                        {sevConfig.label}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 text-sm border-t border-slate-700/50 pt-2">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500">问题原因</div>
                        <p className="text-slate-300">{issue.reason}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500">建议取值</div>
                        <p className="text-cyan-400">{issue.suggestion}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">当前: </span>
                          <span className="font-mono text-slate-300">
                            {StabilityDiagnosticEngine.formatValue(
                              issue.affectedParam as any,
                              issue.currentValue
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">建议: </span>
                          <span className="font-mono text-emerald-400">
                            {StabilityDiagnosticEngine.formatValue(
                              issue.affectedParam as any,
                              issue.recommendedValue
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {diagnosis.issues.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm text-slate-400">所有参数均在安全范围内</p>
          <p className="text-xs text-slate-500 mt-1">模拟结果稳定可靠</p>
        </div>
      )}

      {autoFixCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <input
              type="checkbox"
              id="auto-fix-toggle"
              checked={stability.autoFixEnabled}
              onChange={(e) => setAutoFixEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <label htmlFor="auto-fix-toggle" className="text-sm text-slate-300 cursor-pointer">
              检测到危险参数时自动修正
            </label>
          </div>

          <button
            onClick={handleAutoFix}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            <Wrench className="w-4 h-4" />
            一键修正 {autoFixCount} 个参数
          </button>

          <div className="text-xs text-slate-500 px-1">
            建议修正:
            <ul className="mt-1 space-y-0.5">
              {StabilityDiagnosticEngine.getAutoFixSuggestions(diagnosis).map((s, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">{s.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-600 text-center pt-2 border-t border-slate-700">
        诊断时间: {new Date(diagnosis.timestamp).toLocaleString('zh-CN')}
      </div>
    </div>
  );
};

export default StabilityDiagnosticPanel;
