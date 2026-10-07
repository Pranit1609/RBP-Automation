import { test, expect } from '@playwright/test';
import { ConfigLoader } from '../../src/config/ConfigLoader';
import { AuthManager } from '../../src/auth/AuthManager';

const selectedProject = process.env.PROJECT || 'demo-rbp';

test.describe(`Authentication & Session Isolation (${selectedProject})`, () => {
  let config: any;
  let authManager: AuthManager;

  test.beforeAll(async () => {
    config = ConfigLoader.loadProjectConfig(selectedProject);
    authManager = new AuthManager(config);
  });

  test('Create completely independent Employee and Manager sessions', async () => {
    const employeeSession = await authManager.createEmployeeSession();
    const managerSession = await authManager.createManagerSession();

    expect(employeeSession.role).toBe('employee');
    expect(managerSession.role).toBe('manager');

    // Ensure tokens/headers are distinct and not cross-pollinated
    if (employeeSession.token && managerSession.token) {
      expect(employeeSession.token).not.toEqual(managerSession.token);
    }

    expect(employeeSession.headers.Authorization).not.toEqual(managerSession.headers.Authorization);
  });
});
