import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { ExecutionRecord, ExecutionSummary, TestResult } from '../types';
import { Logger } from '../utils/Logger';

export interface IExecutionRepository {
  init(): Promise<void>;
  saveExecution(record: ExecutionRecord): Promise<void>;
  getExecutions(): Promise<ExecutionSummary[]>;
  getExecutionById(executionId: string): Promise<ExecutionRecord | null>;
  getLatestExecution(): Promise<ExecutionRecord | null>;
}

export class SqliteExecutionRepository implements IExecutionRepository {
  private dbPath: string;
  private db: Database | null = null;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.resolve(process.cwd(), 'reports', 'execution_history.sqlite');
  }

  public async init(): Promise<void> {
    const SQL = await initSqlJs();

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.persistDb();
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS executions (
        execution_id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        total_tests INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        failed INTEGER NOT NULL,
        warned INTEGER NOT NULL,
        skipped INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        environment TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        project TEXT NOT NULL,
        session_role TEXT NOT NULL,
        target_role TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        expected_records TEXT NOT NULL,
        forbidden_records TEXT NOT NULL,
        actual_records TEXT NOT NULL,
        result TEXT NOT NULL,
        policy_used TEXT,
        reason TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        evidence_json TEXT NOT NULL,
        FOREIGN KEY (execution_id) REFERENCES executions(execution_id)
      );
    `);
  }

  private persistDb(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  public async saveExecution(record: ExecutionRecord): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO executions (execution_id, project_name, timestamp, total_tests, passed, failed, warned, skipped, duration_ms, environment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.executionId,
        record.projectName,
        record.timestamp,
        record.totalTests,
        record.passed,
        record.failed,
        record.warned,
        record.skipped,
        record.durationMs,
        record.environment
      ]
    );

    const stmt = this.db.prepare(`
      INSERT INTO test_results (test_id, execution_id, project, session_role, target_role, method, url, status_code, expected_records, forbidden_records, actual_records, result, policy_used, reason, timestamp, duration_ms, evidence_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const res of record.results) {
      stmt.run([
        res.testId,
        record.executionId,
        res.project,
        res.sessionRole,
        res.targetRole,
        res.method,
        res.url,
        res.statusCode,
        JSON.stringify(res.expectedRecords),
        JSON.stringify(res.forbiddenRecords),
        JSON.stringify(res.actualRecords),
        res.result,
        res.policyUsed || null,
        res.reason,
        res.timestamp,
        res.durationMs,
        JSON.stringify(res.evidence)
      ]);
    }
    stmt.free();

    this.persistDb();
    Logger.info(`Saved execution history (${record.executionId}) to SQLite database: ${this.dbPath}`);
  }

  public async getExecutions(): Promise<ExecutionSummary[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    const res = this.db.exec(`SELECT execution_id, project_name, timestamp, total_tests, passed, failed, warned, skipped, duration_ms, environment FROM executions ORDER BY timestamp DESC;`);
    if (res.length === 0) return [];

    return res[0].values.map((row) => ({
      executionId: String(row[0]),
      projectName: String(row[1]),
      timestamp: String(row[2]),
      totalTests: Number(row[3]),
      passed: Number(row[4]),
      failed: Number(row[5]),
      warned: Number(row[6]),
      skipped: Number(row[7]),
      durationMs: Number(row[8]),
      environment: String(row[9])
    }));
  }

  public async getExecutionById(executionId: string): Promise<ExecutionRecord | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const execRes = this.db.exec(
      `SELECT execution_id, project_name, timestamp, total_tests, passed, failed, warned, skipped, duration_ms, environment FROM executions WHERE execution_id = '${executionId}';`
    );

    if (execRes.length === 0 || execRes[0].values.length === 0) {
      return null;
    }

    const row = execRes[0].values[0];
    const summary: ExecutionSummary = {
      executionId: String(row[0]),
      projectName: String(row[1]),
      timestamp: String(row[2]),
      totalTests: Number(row[3]),
      passed: Number(row[4]),
      failed: Number(row[5]),
      warned: Number(row[6]),
      skipped: Number(row[7]),
      durationMs: Number(row[8]),
      environment: String(row[9])
    };

    const resultsRes = this.db.exec(
      `SELECT test_id, project, session_role, target_role, method, url, status_code, expected_records, forbidden_records, actual_records, result, policy_used, reason, timestamp, duration_ms, evidence_json FROM test_results WHERE execution_id = '${executionId}';`
    );

    const results: TestResult[] = [];
    if (resultsRes.length > 0) {
      for (const r of resultsRes[0].values) {
        results.push({
          testId: String(r[0]),
          project: String(r[1]),
          sessionRole: String(r[2]),
          targetRole: String(r[3]),
          method: String(r[4]) as any,
          url: String(r[5]),
          statusCode: Number(r[6]),
          expectedRecords: JSON.parse(String(r[7])),
          forbiddenRecords: JSON.parse(String(r[8])),
          actualRecords: JSON.parse(String(r[9])),
          result: String(r[10]) as any,
          policyUsed: r[11] ? String(r[11]) as any : undefined,
          reason: String(r[12]),
          timestamp: String(r[13]),
          durationMs: Number(r[14]),
          evidence: JSON.parse(String(r[15]))
        });
      }
    }

    return {
      ...summary,
      results
    };
  }

  public async getLatestExecution(): Promise<ExecutionRecord | null> {
    const list = await this.getExecutions();
    if (list.length === 0) return null;
    return this.getExecutionById(list[0].executionId);
  }
}
