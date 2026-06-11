import type {
  GridConfig,
  BoundaryConditions,
  StabilityDiagnosis,
  StabilityIssue,
  StabilityRiskLevel,
  ParamName,
} from '@shared/types';

const MAX_STABLE_FOURIER_2D = 0.25;
const WARNING_FOURIER_THRESHOLD = 0.2;
const MAX_RECOMMENDED_TIME_STEP = 10;
const MIN_RECOMMENDED_TIME_STEP = 0.001;

export interface DiagnosticParams {
  diffusionCoefficient: number;
  timeStep: number;
  gridSpacing: number;
  grid: GridConfig;
  boundaryConditions: BoundaryConditions;
}

export interface FixSuggestion {
  param: ParamName;
  recommendedValue: number;
  description: string;
  boundaryAdjustment?: {
    targetMin: number;
    targetMax: number;
  };
}

export class StabilityDiagnosticEngine {
  static calculateFourierNumber(
    diffusionCoefficient: number,
    timeStep: number,
    gridSpacing: number
  ): number {
    if (gridSpacing <= 0) return Infinity;
    return (diffusionCoefficient * timeStep) / (gridSpacing * gridSpacing);
  }

  static calculateBoundaryTempDiff(bc: BoundaryConditions): {
    max: number;
    min: number;
    diff: number;
  } {
    const temps = [bc.top, bc.bottom, bc.left, bc.right];
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    return { max, min, diff: max - min };
  }

  static diagnose(params: DiagnosticParams): StabilityDiagnosis {
    const { diffusionCoefficient, timeStep, gridSpacing, grid, boundaryConditions } = params;

    const fourierNumber = this.calculateFourierNumber(
      diffusionCoefficient,
      timeStep,
      gridSpacing
    );

    const boundaryStats = this.calculateBoundaryTempDiff(boundaryConditions);
    const issues: StabilityIssue[] = [];

    if (fourierNumber > MAX_STABLE_FOURIER_2D) {
      const maxSafeTimeStep = (MAX_STABLE_FOURIER_2D * gridSpacing * gridSpacing) / diffusionCoefficient;
      const recommendedValue = Math.max(MIN_RECOMMENDED_TIME_STEP, maxSafeTimeStep * 0.8);
      issues.push({
        type: 'stability',
        severity: 'high',
        reason: `傅里叶数 Fo = ${fourierNumber.toFixed(4)} 超过 2D 显式方法稳定上限 ${MAX_STABLE_FOURIER_2D}，将导致数值发散（温度指数增长或振荡）`,
        suggestion: `将时间步长减小至 ${maxSafeTimeStep.toExponential(2)} 以下，或增大网格间距`,
        affectedParam: 'timeStep',
        currentValue: timeStep,
        recommendedValue,
      });
    } else if (fourierNumber > WARNING_FOURIER_THRESHOLD) {
      const maxSafeTimeStep = (MAX_STABLE_FOURIER_2D * gridSpacing * gridSpacing) / diffusionCoefficient;
      const recommendedValue = Math.max(MIN_RECOMMENDED_TIME_STEP, maxSafeTimeStep * 0.7);
      issues.push({
        type: 'stability',
        severity: 'medium',
        reason: `傅里叶数 Fo = ${fourierNumber.toFixed(4)} 接近稳定上限 ${MAX_STABLE_FOURIER_2D}，可能出现数值振荡`,
        suggestion: `建议将时间步长减小至 ${maxSafeTimeStep.toExponential(2)} 以下以提高稳定性`,
        affectedParam: 'timeStep',
        currentValue: timeStep,
        recommendedValue,
      });
    }

    if (fourierNumber < 0.001) {
      const rawRecommendedTimeStep = (WARNING_FOURIER_THRESHOLD * gridSpacing * gridSpacing) / diffusionCoefficient;
      const recommendedTimeStep = Math.min(MAX_RECOMMENDED_TIME_STEP, Math.max(MIN_RECOMMENDED_TIME_STEP, rawRecommendedTimeStep));
      issues.push({
        type: 'performance',
        severity: 'low',
        reason: `傅里叶数 Fo = ${fourierNumber.toExponential(2)} 过小，计算效率低下（需要过多迭代步）`,
        suggestion: `建议将时间步长增大至 ${recommendedTimeStep.toExponential(2)} 左右以提升模拟效率`,
        affectedParam: 'timeStep',
        currentValue: timeStep,
        recommendedValue: recommendedTimeStep,
      });
    }

    if (gridSpacing > 5) {
      issues.push({
        type: 'accuracy',
        severity: 'medium',
        reason: `网格间距过大（${gridSpacing}），空间离散精度不足，可能导致结果失真`,
        suggestion: `建议减小网格尺寸以提高空间分辨率`,
        affectedParam: 'gridSpacing',
        currentValue: gridSpacing,
        recommendedValue: Math.max(1, gridSpacing * 0.5),
      });
    }

    if (grid.width > 80 || grid.height > 80) {
      const totalCells = grid.width * grid.height;
      issues.push({
        type: 'performance',
        severity: 'medium',
        reason: `网格尺寸过大（${grid.width}×${grid.height} = ${totalCells} 单元格），每步计算耗时较长`,
        suggestion: `建议将网格尺寸减小至 60×60 以下以提升性能`,
        affectedParam: 'gridSize',
        currentValue: Math.max(grid.width, grid.height),
        recommendedValue: 60,
      });
    }

    if (boundaryStats.diff > 150) {
      const targetMax = 100;
      const targetMin = 0;
      issues.push({
        type: 'boundary',
        severity: 'high',
        reason: `边界温差过大（${boundaryStats.min.toFixed(0)}°C ~ ${boundaryStats.max.toFixed(0)}°C，温差 ${boundaryStats.diff.toFixed(0)}°C），可能导致温度梯度区域数值振荡`,
        suggestion: `建议将边界温度调整至 ${targetMin}°C ~ ${targetMax}°C 范围内，温差控制在 ${targetMax - targetMin}°C 以内`,
        affectedParam: 'boundaryTemp',
        currentValue: boundaryStats.diff,
        recommendedValue: targetMax - targetMin,
        boundaryAdjustment: {
          targetMin,
          targetMax,
          originalMin: boundaryStats.min,
          originalMax: boundaryStats.max,
        },
      });
    } else if (boundaryStats.diff > 80) {
      const targetMax = 80;
      const targetMin = 0;
      issues.push({
        type: 'boundary',
        severity: 'low',
        reason: `边界温差较大（${boundaryStats.diff.toFixed(0)}°C），高梯度区域精度可能下降`,
        suggestion: `建议将边界温度调整至 ${targetMin}°C ~ ${targetMax}°C 范围内以提高梯度区域稳定性`,
        affectedParam: 'boundaryTemp',
        currentValue: boundaryStats.diff,
        recommendedValue: targetMax - targetMin,
        boundaryAdjustment: {
          targetMin,
          targetMax,
          originalMin: boundaryStats.min,
          originalMax: boundaryStats.max,
        },
      });
    }

    if (boundaryStats.max > 200 || boundaryStats.min < -20) {
      issues.push({
        type: 'accuracy',
        severity: 'medium',
        reason: `边界温度超出常规范围（${boundaryStats.min.toFixed(0)}°C ~ ${boundaryStats.max.toFixed(0)}°C），材料热扩散系数可能随温度发生显著变化，当前恒定系数假设可能导致结果偏差`,
        suggestion: `建议在极端温度条件下考虑温度相关的扩散系数模型`,
        affectedParam: 'boundaryTemp',
        currentValue: boundaryStats.max,
        recommendedValue: 100,
      });
    }

    const riskLevel = this.determineRiskLevel(issues, fourierNumber);

    return {
      id: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      riskLevel,
      fourierNumber,
      maxStableFourier: MAX_STABLE_FOURIER_2D,
      issues,
      params: {
        diffusionCoefficient,
        timeStep,
        gridSpacing,
        gridWidth: grid.width,
        gridHeight: grid.height,
        boundaryTempDiff: boundaryStats.diff,
        maxBoundaryTemp: boundaryStats.max,
        minBoundaryTemp: boundaryStats.min,
      },
    };
  }

  private static determineRiskLevel(
    issues: StabilityIssue[],
    fourierNumber: number
  ): StabilityRiskLevel {
    if (fourierNumber > MAX_STABLE_FOURIER_2D) {
      return 'danger';
    }

    const highSeverityIssues = issues.filter(i => i.severity === 'high' && i.type === 'stability');
    if (highSeverityIssues.length > 0) {
      return 'danger';
    }

    const mediumSeverityIssues = issues.filter(i => i.severity === 'medium');
    const highSeverityNonStability = issues.filter(i => i.severity === 'high' && i.type !== 'stability');

    if (mediumSeverityIssues.length > 0 || highSeverityNonStability.length > 0 || fourierNumber > WARNING_FOURIER_THRESHOLD) {
      return 'warning';
    }

    return 'safe';
  }

  static getAutoFixSuggestions(diagnosis: StabilityDiagnosis): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    for (const issue of diagnosis.issues) {
      if (issue.type === 'stability') {
        if (issue.affectedParam === 'timeStep') {
          suggestions.push({
            param: 'timeStep',
            recommendedValue: issue.recommendedValue,
            description: `修正时间步长: ${issue.currentValue.toExponential(2)} → ${issue.recommendedValue.toExponential(2)}`,
          });
        }
      }

      if (issue.type === 'performance' && issue.affectedParam === 'timeStep' && diagnosis.fourierNumber < 0.001) {
        suggestions.push({
          param: 'timeStep',
          recommendedValue: issue.recommendedValue,
          description: `优化时间步长: ${issue.currentValue.toExponential(2)} → ${issue.recommendedValue.toExponential(2)}`,
        });
      }

      if (issue.type === 'performance' && issue.affectedParam === 'gridSize') {
        suggestions.push({
          param: 'gridSize',
          recommendedValue: issue.recommendedValue,
          description: `优化网格尺寸: ${issue.currentValue} → ${issue.recommendedValue}`,
        });
      }

      if (issue.type === 'boundary' && issue.boundaryAdjustment) {
        const { targetMin, targetMax, originalMin, originalMax } = issue.boundaryAdjustment;
        suggestions.push({
          param: 'boundaryTemp',
          recommendedValue: issue.recommendedValue,
          description: `调整边界温度: ${originalMin.toFixed(0)}°~${originalMax.toFixed(0)}° → ${targetMin}°~${targetMax}°`,
          boundaryAdjustment: { targetMin, targetMax },
        });
      }
    }

    return suggestions;
  }

  static formatParamName(param: ParamName): string {
    const names: Record<ParamName, string> = {
      timeStep: '时间步长',
      gridSpacing: '网格间距',
      diffusionCoefficient: '扩散系数',
      boundaryTemp: '边界温度',
      gridSize: '网格尺寸',
    };
    return names[param];
  }

  static formatValue(param: ParamName, value: number): string {
    switch (param) {
      case 'timeStep':
        if (value >= 0.01) return value.toFixed(3) + ' s';
        return value.toExponential(2) + ' s';
      case 'gridSpacing':
        return value.toFixed(1) + ' px';
      case 'diffusionCoefficient':
        if (value >= 0.01) return value.toFixed(3) + ' m²/s';
        return value.toExponential(2) + ' m²/s';
      case 'boundaryTemp':
        return value.toFixed(0) + ' °C';
      case 'gridSize':
        return value.toFixed(0);
      default:
        return value.toString();
    }
  }
}

export default StabilityDiagnosticEngine;
