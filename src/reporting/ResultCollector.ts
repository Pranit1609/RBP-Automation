import { ExecutionRecord, ProjectConfig, TestResult } from '../types';
import { Helpers } from '../utils/Helpers';

export class ResultCollector {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  private projectName: string;

  constructor(config: ProjectConfig) {
    this.projectName = config.project.name;
  }

  public addResult(result: TestResult): void {
    this.results.push(result);
  }

  public getResults(): TestResult[] {
    return this.results;
  }

  public generateExecutionRecord(executionId?: string, environment: string = 'local'): ExecutionRecord {
    const durationMs = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.result === 'PASS').length;
    const failed = this.results.filter((r) => r.result === 'FAIL').length;
    const warned = this.results.filter((r) => r.result === 'WARN').length;
    const skipped = this.results.filter((r) => r.result === 'SKIP').length;

    return {
      executionId: executionId || Helpers.generateExecutionId('EXEC'),
      projectName: this.projectName,
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed,
      failed,
      warned,
      skipped,
      durationMs,
      environment,
      results: this.results
    };
  }
}
