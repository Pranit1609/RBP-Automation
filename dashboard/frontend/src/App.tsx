import React, { useEffect, useState } from 'react';
import { Shield, Play, AlertTriangle, CheckCircle, XCircle, FileText, Layers, RefreshCw, X, Server } from 'lucide-react';

interface TestResult {
  testId: string;
  project: string;
  sessionRole: string;
  targetRole: string;
  method: string;
  url: string;
  statusCode: number;
  expectedRecords: string[];
  forbiddenRecords: string[];
  actualRecords: string[];
  result: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  reason: string;
  timestamp: string;
  durationMs: number;
  evidence: {
    requestUrl: string;
    requestMethod: string;
    requestHeaders: Record<string, string>;
    responseStatusCode: number;
    responseHeaders: Record<string, string>;
    responseBody: any;
  };
}

interface ExecutionRecord {
  executionId: string;
  projectName: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  durationMs: number;
  environment: string;
  results: TestResult[];
}

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'config'>('dashboard');
  const [execution, setExecution] = useState<ExecutionRecord | null>(null);
  const [executionsList, setExecutionsList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('demo-rbp');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningTest, setRunningTest] = useState<boolean>(false);
  const [projectConfig, setProjectConfig] = useState<any>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      if (projData.success) setProjectsList(projData.projects);

      const execListRes = await fetch('/api/executions');
      const execListData = await execListRes.json();
      if (execListData.success) setExecutionsList(execListData.executions);

      const latestRes = await fetch('/api/executions/latest');
      const latestData = await latestRes.json();
      if (latestData.success && latestData.execution) {
        setExecution(latestData.execution);
        setSelectedProject(latestData.execution.projectName.toLowerCase());
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectConfig = async (name: string) => {
    try {
      const res = await fetch(`/api/projects/${name}`);
      const data = await res.json();
      if (data.success) setProjectConfig(data.config);
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectConfig(selectedProject);
    }
  }, [selectedProject]);

  const triggerTestRun = async (badRbp: boolean = false) => {
    setRunningTest(true);
    try {
      await fetch('/api/trigger-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: selectedProject, badRbp })
      });
      await fetchDashboardData();
    } catch (err) {
      console.error('Test trigger failed:', err);
    } finally {
      setRunningTest(false);
    }
  };

  const filteredResults = (execution?.results || []).filter((r) => {
    if (roleFilter !== 'ALL' && r.sessionRole.toLowerCase() !== roleFilter.toLowerCase()) return false;
    if (statusFilter !== 'ALL' && r.result !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.testId.toLowerCase().includes(term) ||
        r.url.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="brand">
          <Shield size={24} />
          <span>RBP Security</span>
        </div>

        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Layers size={18} /> Dashboard
        </button>

        <button
          className={`nav-item ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <Shield size={18} /> RBP Matrix
        </button>

        <button
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <FileText size={18} /> Project Config
        </button>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Available Projects
          </div>
          <select
            className="select-input"
            style={{ width: '100%' }}
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projectsList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div className="page-title">
            <h1>Role-Based Permission Security Dashboard</h1>
            <p>Project: <strong>{execution?.projectName || selectedProject}</strong> | Environment: <strong>{execution?.environment || 'local'}</strong></p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="action-btn"
              onClick={() => triggerTestRun(false)}
              disabled={runningTest}
            >
              <Play size={16} /> {runningTest ? 'Executing Suite...' : 'Run RBP Suite (Pass Mode)'}
            </button>

            <button
              className="action-btn secondary"
              onClick={() => triggerTestRun(true)}
              disabled={runningTest}
            >
              <AlertTriangle size={16} /> Run BAD RBP Test
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card total">
                <div className="label">Total Validations</div>
                <div className="value">{execution?.totalTests || 0}</div>
              </div>
              <div className="kpi-card pass">
                <div className="label">Passed Checks</div>
                <div className="value">{execution?.passed || 0}</div>
              </div>
              <div className="kpi-card fail">
                <div className="label">Security Violations</div>
                <div className="value">{execution?.failed || 0}</div>
              </div>
              <div className="kpi-card warn">
                <div className="label">Duration</div>
                <div className="value">{execution ? `${(execution.durationMs / 1000).toFixed(1)}s` : '0s'}</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              <div className="filter-group">
                <label>Filter Session Role</label>
                <select className="select-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="ALL">All Roles</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Filter Result Status</label>
                <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                </select>
              </div>

              <div className="filter-group" style={{ flex: 1 }}>
                <label>Search Test / Reason</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Search by Test ID, endpoint or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="action-btn" style={{ marginTop: 'auto', background: '#334155' }} onClick={fetchDashboardData}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Test Execution Results Table */}
            <div className="table-card">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test ID</th>
                    <th>Session Role</th>
                    <th>Target API</th>
                    <th>Request URL</th>
                    <th>Status</th>
                    <th>Forbidden</th>
                    <th>Actual</th>
                    <th>Result</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No execution results found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((res) => (
                      <tr key={res.testId} onClick={() => setSelectedResult(res)}>
                        <td><strong>{res.testId}</strong></td>
                        <td><span className="tag">{res.sessionRole}</span></td>
                        <td><span className="tag">{res.targetRole} API</span></td>
                        <td><code>{res.method} {res.url}</code></td>
                        <td><code>{res.statusCode}</code></td>
                        <td>{res.forbiddenRecords?.join(', ') || '-'}</td>
                        <td>{res.actualRecords?.join(', ') || '-'}</td>
                        <td><span className={`status-chip ${res.result}`}>{res.result}</span></td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{res.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* RBP Matrix Tab */}
        {activeTab === 'matrix' && (
          <div className="table-card" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Configured RBP Permission Matrix ({selectedProject})</h2>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Session Role</th>
                  <th>API Target Role</th>
                  <th>Access Rule</th>
                  <th>Expected Records</th>
                  <th>Forbidden Records</th>
                </tr>
              </thead>
              <tbody>
                {projectConfig?.rbpRules?.map((rule: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{rule.name}</strong></td>
                    <td><span className="tag">{rule.sessionRole}</span></td>
                    <td><span className="tag">{rule.apiRole}</span></td>
                    <td><span className={`status-chip ${rule.access === 'ALLOW' ? 'PASS' : 'FAIL'}`}>{rule.access}</span></td>
                    <td>{rule.expectedRecords?.join(', ') || '-'}</td>
                    <td>{rule.forbiddenRecords?.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="table-card" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Project YAML Configuration ({selectedProject})</h2>
            <div className="evidence-block">
              {JSON.stringify(projectConfig, null, 2)}
            </div>
          </div>
        )}
      </div>

      {/* Test Evidence Details Modal */}
      {selectedResult && (
        <div className="modal-overlay" onClick={() => setSelectedResult(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>[Evidence] Test {selectedResult.testId} Details</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSelectedResult(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div><strong>Session Role:</strong> <span className="tag">{selectedResult.sessionRole}</span></div>
                <div><strong>Target Role:</strong> <span className="tag">{selectedResult.targetRole} API</span></div>
                <div><strong>Request URL:</strong> <code>{selectedResult.method} {selectedResult.url}</code></div>
                <div><strong>Result:</strong> <span className={`status-chip ${selectedResult.result}`}>{selectedResult.result}</span></div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>Reason:</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{selectedResult.reason}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>Masked Request Headers:</strong>
                <div className="evidence-block">
                  {JSON.stringify(selectedResult.evidence?.requestHeaders || {}, null, 2)}
                </div>
              </div>

              <div>
                <strong>Response Body (Status {selectedResult.statusCode}):</strong>
                <div className="evidence-block">
                  {JSON.stringify(selectedResult.evidence?.responseBody || {}, null, 2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
