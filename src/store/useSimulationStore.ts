import { create } from 'zustand';
import type {
  Material,
  GridConfig,
  BoundaryConditions,
  HeatSource,
  ExperimentConfig,
  TemperatureSnapshot,
  ExperimentResult,
  SimulationMode,
  StabilityDiagnosis,
  StabilityState,
  ParamName,
} from '@shared/types';
import type { FixSuggestion } from '../engine/StabilityDiagnostic';

interface SimulationState {
  mode: SimulationMode;
  currentStep: number;
  currentTemperature: number[][];
  temperatureHistory: number[][][];
  
  grid: GridConfig;
  boundaryConditions: BoundaryConditions;
  materialId: string;
  materials: Material[];
  diffusionCoefficient: number;
  initialHeatSources: HeatSource[];
  totalSteps: number;
  timeStep: number;
  playbackSpeed: number;
  minTemp: number;
  maxTemp: number;
  brushSize: number;
  brushTemperature: number;
  drawMode: 'heat' | 'erase' | 'none';
  
  snapshots: TemperatureSnapshot[];
  experiments: ExperimentConfig[];
  favorites: ExperimentResult[];
  
  currentExperimentId: string | null;
  hoveredCell: { x: number; y: number } | null;
  
  stability: StabilityState;
  
  setMode: (mode: SimulationMode) => void;
  setCurrentStep: (step: number) => void;
  setCurrentTemperature: (temp: number[][]) => void;
  addTemperatureToHistory: (temp: number[][]) => void;
  clearHistory: () => void;
  
  setGrid: (grid: GridConfig) => void;
  setBoundaryConditions: (bc: BoundaryConditions) => void;
  setMaterialId: (id: string) => void;
  setMaterials: (materials: Material[]) => void;
  setDiffusionCoefficient: (alpha: number) => void;
  setInitialHeatSources: (sources: HeatSource[]) => void;
  addHeatSource: (source: HeatSource) => void;
  removeHeatSource: (index: number) => void;
  clearHeatSources: () => void;
  setTotalSteps: (steps: number) => void;
  setTimeStep: (dt: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setBrushSize: (size: number) => void;
  setBrushTemperature: (temp: number) => void;
  setDrawMode: (mode: 'heat' | 'erase' | 'none') => void;
  setTempRange: (min: number, max: number) => void;
  
  setSnapshots: (snapshots: TemperatureSnapshot[]) => void;
  addSnapshot: (snapshot: TemperatureSnapshot) => void;
  removeSnapshot: (id: string) => void;
  setExperiments: (experiments: ExperimentConfig[]) => void;
  setFavorites: (favorites: ExperimentResult[]) => void;
  setCurrentExperimentId: (id: string | null) => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  
  setLatestDiagnosis: (diagnosis: StabilityDiagnosis) => void;
  addDiagnosisToHistory: (diagnosis: StabilityDiagnosis) => void;
  clearDiagnosisHistory: () => void;
  setAutoFixEnabled: (enabled: boolean) => void;
  applyFixSuggestions: (suggestions: FixSuggestion[]) => void;
  
  reset: () => void;
}

const DEFAULT_GRID: GridConfig = {
  width: 50,
  height: 50,
  cellSize: 12,
};

const DEFAULT_BC: BoundaryConditions = {
  top: 25,
  bottom: 25,
  left: 25,
  right: 25,
  type: 'dirichlet',
};

function createEmptyTemperature(grid: GridConfig): number[][] {
  const data: number[][] = [];
  for (let y = 0; y < grid.height; y++) {
    data[y] = new Array(grid.width).fill(25);
  }
  return data;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  mode: 'idle',
  currentStep: 0,
  currentTemperature: createEmptyTemperature(DEFAULT_GRID),
  temperatureHistory: [],
  
  grid: DEFAULT_GRID,
  boundaryConditions: DEFAULT_BC,
  materialId: 'copper',
  materials: [],
  diffusionCoefficient: 117e-6,
  initialHeatSources: [],
  totalSteps: 500,
  timeStep: 0.1,
  playbackSpeed: 30,
  minTemp: 0,
  maxTemp: 100,
  brushSize: 2,
  brushTemperature: 100,
  drawMode: 'heat',
  
  snapshots: [],
  experiments: [],
  favorites: [],
  
  currentExperimentId: null,
  hoveredCell: null,
  
  stability: {
    latestDiagnosis: null,
    diagnosisHistory: [],
    autoFixEnabled: false,
  },
  
  setMode: (mode) => set({ mode }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setCurrentTemperature: (temp) => set({ currentTemperature: temp }),
  addTemperatureToHistory: (temp) =>
    set((state) => ({
      temperatureHistory: [...state.temperatureHistory, temp],
    })),
  clearHistory: () => set({ temperatureHistory: [], currentStep: 0 }),
  
  setGrid: (grid) =>
    set({
      grid,
      currentTemperature: createEmptyTemperature(grid),
      temperatureHistory: [],
      currentStep: 0,
    }),
  setBoundaryConditions: (bc) => set({ boundaryConditions: bc }),
  setMaterialId: (id) => {
    const material = get().materials.find(m => m.id === id);
    if (material) {
      set({
        materialId: id,
        diffusionCoefficient: material.diffusionCoefficient,
      });
    }
  },
  setMaterials: (materials) => set({ materials }),
  setDiffusionCoefficient: (alpha) => set({ diffusionCoefficient: alpha }),
  setInitialHeatSources: (sources) => set({ initialHeatSources: sources }),
  addHeatSource: (source) =>
    set((state) => ({
      initialHeatSources: [...state.initialHeatSources, source],
    })),
  removeHeatSource: (index) =>
    set((state) => ({
      initialHeatSources: state.initialHeatSources.filter((_, i) => i !== index),
    })),
  clearHeatSources: () => set({ initialHeatSources: [] }),
  setTotalSteps: (steps) => set({ totalSteps: steps }),
  setTimeStep: (dt) => set({ timeStep: dt }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushTemperature: (temp) => set({ brushTemperature: temp }),
  setDrawMode: (mode) => set({ drawMode: mode }),
  setTempRange: (min, max) => set({ minTemp: min, maxTemp: max }),
  
  setSnapshots: (snapshots) => set({ snapshots }),
  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
    })),
  removeSnapshot: (id) =>
    set((state) => ({
      snapshots: state.snapshots.filter(s => s.id !== id),
    })),
  setExperiments: (experiments) => set({ experiments }),
  setFavorites: (favorites) => set({ favorites }),
  setCurrentExperimentId: (id) => set({ currentExperimentId: id }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  
  setLatestDiagnosis: (diagnosis) =>
    set((state) => ({
      stability: {
        ...state.stability,
        latestDiagnosis: diagnosis,
      },
    })),
  
  addDiagnosisToHistory: (diagnosis) =>
    set((state) => ({
      stability: {
        ...state.stability,
        diagnosisHistory: [...state.stability.diagnosisHistory.slice(-49), diagnosis],
      },
    })),
  
  clearDiagnosisHistory: () =>
    set((state) => ({
      stability: {
        ...state.stability,
        diagnosisHistory: [],
      },
    })),
  
  setAutoFixEnabled: (enabled) =>
    set((state) => ({
      stability: {
        ...state.stability,
        autoFixEnabled: enabled,
      },
    })),
  
  applyFixSuggestions: (suggestions) => {
    const state = get();
    const updates: Partial<SimulationState> = {};
    
    for (const suggestion of suggestions) {
      switch (suggestion.param) {
        case 'timeStep':
          updates.timeStep = suggestion.recommendedValue;
          break;
        case 'gridSize':
          const newSize = Math.floor(suggestion.recommendedValue);
          updates.grid = {
            ...state.grid,
            width: Math.min(state.grid.width, newSize),
            height: Math.min(state.grid.height, newSize),
          };
          break;
        case 'diffusionCoefficient':
          updates.diffusionCoefficient = suggestion.recommendedValue;
          break;
      }
    }
    
    if (updates.grid) {
      updates.currentTemperature = createEmptyTemperature(updates.grid);
      updates.temperatureHistory = [];
      updates.currentStep = 0;
    }
    
    set((state) => ({
      ...state,
      ...updates,
      stability: {
        ...state.stability,
        latestDiagnosis: state.stability.latestDiagnosis
          ? { ...state.stability.latestDiagnosis, isAutoFixed: true }
          : null,
      },
    }));
  },
  
  reset: () =>
    set((state) => ({
      mode: 'idle',
      currentStep: 0,
      currentTemperature: createEmptyTemperature(state.grid),
      temperatureHistory: [],
    })),
}));

export default useSimulationStore;
