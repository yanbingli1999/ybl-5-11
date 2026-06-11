import { useEffect, useRef, useCallback } from 'react';
import useSimulationStore from '../store/useSimulationStore';
import { StabilityDiagnosticEngine } from '../engine/StabilityDiagnostic';
import type { StabilityDiagnosis } from '@shared/types';

const DIAGNOSIS_DEBOUNCE_MS = 300;

export function useStabilityDiagnostic() {
  const {
    grid,
    boundaryConditions,
    diffusionCoefficient,
    timeStep,
    stability,
    setLatestDiagnosis,
    addDiagnosisToHistory,
    applyFixSuggestions,
  } = useSimulationStore();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastParamsRef = useRef<string | null>(null);

  const runDiagnosis = useCallback(() => {
    const gridSpacing = 1;

    const paramsKey = JSON.stringify({
      diffusionCoefficient,
      timeStep,
      gridSpacing,
      gridWidth: grid.width,
      gridHeight: grid.height,
      bcTop: boundaryConditions.top,
      bcBottom: boundaryConditions.bottom,
      bcLeft: boundaryConditions.left,
      bcRight: boundaryConditions.right,
    });

    if (paramsKey === lastParamsRef.current) {
      return;
    }
    lastParamsRef.current = paramsKey;

    const diagnosis = StabilityDiagnosticEngine.diagnose({
      diffusionCoefficient,
      timeStep,
      gridSpacing,
      grid,
      boundaryConditions,
    });

    setLatestDiagnosis(diagnosis);
    addDiagnosisToHistory(diagnosis);

    if (stability.autoFixEnabled && diagnosis.riskLevel === 'danger') {
      const suggestions = StabilityDiagnosticEngine.getAutoFixSuggestions(diagnosis);
      if (suggestions.length > 0) {
        setTimeout(() => {
          applyFixSuggestions(suggestions);
        }, 100);
      }
    }

    return diagnosis;
  }, [
    grid,
    boundaryConditions.top,
    boundaryConditions.bottom,
    boundaryConditions.left,
    boundaryConditions.right,
    diffusionCoefficient,
    timeStep,
    stability.autoFixEnabled,
    setLatestDiagnosis,
    addDiagnosisToHistory,
    applyFixSuggestions,
  ]);

  const debouncedDiagnosis = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      runDiagnosis();
    }, DIAGNOSIS_DEBOUNCE_MS);
  }, [runDiagnosis]);

  useEffect(() => {
    debouncedDiagnosis();
  }, [
    grid.width,
    grid.height,
    grid.cellSize,
    boundaryConditions.top,
    boundaryConditions.bottom,
    boundaryConditions.left,
    boundaryConditions.right,
    diffusionCoefficient,
    timeStep,
    debouncedDiagnosis,
  ]);

  useEffect(() => {
    const initialDiagnosis = runDiagnosis();
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const forceDiagnosis = useCallback((): StabilityDiagnosis | undefined => {
    lastParamsRef.current = null;
    return runDiagnosis();
  }, [runDiagnosis]);

  return {
    forceDiagnosis,
  };
}

export default useStabilityDiagnostic;
