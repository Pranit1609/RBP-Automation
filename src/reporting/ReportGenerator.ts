import fs from 'fs';
import path from 'path';
import { ExecutionRecord } from '../types';
import { SqliteExecutionRepository } from '../database/ExecutionRepository';
import { Logger } from '../utils/Logger';

export class ReportGenerator {
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || path.resolve(process.cwd(), 'reports');
  }

  public async saveAllReports(record: ExecutionRecord): Promise<void> {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // 1. JSON Report
    const jsonPath = path.join(this.outputDir, 'latest-execution.json');
    fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2));
    Logger.info(`Generated JSON report: ${jsonPath}`);

    // 2. Standalone HTML Report
    const htmlPath = path.join(this.outputDir, 'rbp-report.html');
    const htmlContent = this.generateHtmlContent(record);
    fs.writeFileSync(htmlPath, htmlContent);
    Logger.info(`Generated HTML report: ${htmlPath}`);

    // 3. JUnit XML Report
    const junitPath = path.join(this.outputDir, 'junit-results.xml');
    const junitContent = this.generateJunitXml(record);
    fs.writeFileSync(junitPath, junitContent);
    Logger.info(`Generated JUnit XML report: ${junitPath}`);

    // 4. Save to SQLite DB
    try {
      const dbRepo = new SqliteExecutionRepository();
      await dbRepo.saveExecution(record);
    } catch (err) {
      Logger.error(`Failed to save execution to SQLite DB: ${(err as Error).message}`);
    }
  }

  private generateHtmlContent(record: ExecutionRecord): string {
    const rowsHtml = record.results
      .map((r) => {
        const badgeClass = r.result === 'PASS' ? 'badge-pass' : 'badge-fail';
        return `
        <tr>
          <td><strong>${r.testId}</strong></td>
          <td><span class="role-tag">${r.sessionRole}</span></td>
          <td><span class="role-tag">${r.targetRole} API</span></td>
          <td><code>${r.method} ${r.url}</code></td>
          <td><span class="status-code code-${r.statusCode}">${r.statusCode}</span></td>
          <td>${r.expectedRecords.join(', ') || '-'}</td>
          <td>${r.forbiddenRecords.join(', ') || '-'}</td>
          <td>${r.actualRecords.join(', ') || '-'}</td>
          <td><span class="badge ${badgeClass}">${r.result}</span></td>
          <td class="reason-cell">${r.reason}</td>
        </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RBP Security Audit Report - ${record.projectName}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent-pass: #10b981;
      --accent-fail: #ef4444;
      --border: #334155;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    h1 { margin: 0; font-size: 26px; color: #38bdf8; }
    .meta { color: var(--text-muted); font-size: 14px; margin-top: 5px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .card .val { font-size: 32px; font-weight: bold; margin-top: 5px; }
    .card.total .val { color: #38bdf8; }
    .card.pass .val { color: var(--accent-pass); }
    .card.fail .val { color: var(--accent-fail); }
    .card.duration .val { color: #f59e0b; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    th {
      background: #0f172a;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
    }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: var(--accent-pass); }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: var(--accent-fail); }
    .role-tag {
      background: #334155;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    code { font-family: monospace; color: #a5f3fc; }
    .reason-cell { max-width: 300px; font-size: 13px; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>RBP API Security Audit Report</h1>
      <div class="meta">Project: <strong>${record.projectName}</strong> | Executed: ${new Date(record.timestamp).toLocaleString()} | Execution ID: ${record.executionId}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="card total">
      <div>TOTAL TESTS</div>
      <div class="val">${record.totalTests}</div>
    </div>
    <div class="card pass">
      <div>PASSED</div>
      <div class="val">${record.passed}</div>
    </div>
    <div class="card fail">
      <div>FAILED</div>
      <div class="val">${record.failed}</div>
    </div>
    <div class="card duration">
      <div>DURATION</div>
      <div class="val">${(record.durationMs / 1000).toFixed(2)}s</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Test ID</th>
        <th>Session Role</th>
        <th>Target API</th>
        <th>Request URL</th>
        <th>Status</th>
        <th>Expected</th>
        <th>Forbidden</th>
        <th>Actual</th>
        <th>Result</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
  }

  private generateJunitXml(record: ExecutionRecord): string {
    const testCasesXml = record.results
      .map((r) => {
        const failureXml =
          r.result === 'FAIL'
            ? `<failure message="${this.escapeXml(r.reason)}">${this.escapeXml(JSON.stringify(r.evidence, null, 2))}</failure>`
            : '';
        return `    <testcase classname="${record.projectName}.${r.sessionRole}" name="${r.testId} - ${r.sessionRole} calling ${r.targetRole} API" time="${(r.durationMs / 1000).toFixed(3)}">
${failureXml}
    </testcase>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="RBP Permission Tests - ${record.projectName}" tests="${record.totalTests}" failures="${record.failed}" errors="0" skipped="${record.skipped}" time="${(record.durationMs / 1000).toFixed(3)}" timestamp="${record.timestamp}">
${testCasesXml}
</testsuite>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
