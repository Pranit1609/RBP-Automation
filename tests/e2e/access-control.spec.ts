import { test, expect } from '@playwright/test';
import { ConfigLoader } from '../../src/config/ConfigLoader';
import { AuthManager } from '../../src/auth/AuthManager';
import { ApiClient } from '../../src/api/ApiClient';
import { UrlRoleTransformer } from '../../src/url/UrlRoleTransformer';
import { PolicyEngine } from '../../src/rbp/PolicyEngine';

const selectedProject = process.env.PROJECT || 'demo-rbp';

test.describe(`Scenarios 1-5 Detailed RBP Verification (${selectedProject})`, () => {
  let config: any;
  let authManager: AuthManager;
  let apiClient: ApiClient;

  test.beforeAll(async () => {
    config = ConfigLoader.loadProjectConfig(selectedProject);
    authManager = new AuthManager(config);
    apiClient = new ApiClient(config);
  });

  test('Scenario 1: Employee Own Access - GET Employee API', async () => {
    const employeeSession = await authManager.createEmployeeSession();
    const employeeApi = config.apis.employee;

    const response = await apiClient.sendRequest({
      method: employeeApi.method,
      url: employeeApi.endpoint,
      session: employeeSession
    });

    expect(response.statusCode).toBe(200);
    const expected = config.records.employee.expected[0]; // e.g., "101"
    expect(response.recordIds).toContain(expected);
  });

  test('Scenario 2: Manager Own Access - GET Manager API', async () => {
    const managerSession = await authManager.createManagerSession();
    const managerApi = config.apis.manager;

    const response = await apiClient.sendRequest({
      method: managerApi.method,
      url: managerApi.endpoint,
      session: managerSession
    });

    expect(response.statusCode).toBe(200);
    const expected = config.records.manager.expected[0]; // e.g., "102"
    expect(response.recordIds).toContain(expected);
  });

  test('Scenario 3 & 4: Employee Accessing Manager API - Forbidden Record Check', async () => {
    // Session 1: Employee session (do NOT login as Manager for this test!)
    const employeeSession = await authManager.createEmployeeSession();
    const managerApi = config.apis.manager;

    const response = await apiClient.sendRequest({
      method: managerApi.method,
      url: managerApi.endpoint,
      session: employeeSession
    });

    const forbiddenRecord = config.records.manager.expected[0]; // e.g., "102"

    const evaluation = PolicyEngine.evaluate(
      {
        name: 'Employee accessing Manager API',
        sessionRole: 'employee',
        apiRole: 'manager',
        access: 'DENY',
        policy: 'FORBIDDEN_RECORDS',
        forbiddenRecords: [forbiddenRecord]
      },
      response.recordIds,
      response.statusCode
    );

    expect(evaluation.passed, evaluation.reason).toBe(true);
    expect(response.recordIds).not.toContain(forbiddenRecord);
  });

  test('Scenario 5: Alternate URL Role Path Transformation Test', async () => {
    const employeeSession = await authManager.createEmployeeSession();
    const managerEndpoint = config.apis.manager.endpoint;

    const fromRoleSegment = config.roles?.manager?.pathSegment || 'manager';
    const toRoleSegment = config.roles?.employee?.pathSegment || 'employee';

    const transformedEndpoint = UrlRoleTransformer.transformRolePath(
      managerEndpoint,
      fromRoleSegment,
      toRoleSegment,
      config.project.baseUrl
    );

    const response = await apiClient.sendRequest({
      method: 'GET',
      url: transformedEndpoint,
      session: employeeSession
    });

    const forbiddenRecord = config.records.manager.expected[0];
    expect(response.recordIds).not.toContain(forbiddenRecord);
  });
});
