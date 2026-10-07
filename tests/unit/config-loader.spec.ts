import { test, expect } from '@playwright/test';
import { ConfigLoader } from '../../src/config/ConfigLoader';

test.describe('Unit Test: ConfigLoader', () => {
  test('loads project-a configuration correctly', () => {
    const config = ConfigLoader.loadProjectConfig('project-a');

    expect(config.project.name).toBe('Project-A');
    expect(config.project.baseUrl).toBe('https://project-a.company.com');
    expect(config.responseMapping.recordPath).toBe('data');
    expect(config.responseMapping.recordIdField).toBe('id');
    expect(config.rbpRules.length).toBeGreaterThan(0);
  });

  test('loads demo-rbp configuration correctly', () => {
    const config = ConfigLoader.loadProjectConfig('demo-rbp');

    expect(config.project.name).toBe('Demo-RBP');
    expect(config.project.baseUrl).toBe('http://localhost:4000');
  });

  test('lists available projects under config/projects', () => {
    const projects = ConfigLoader.listAvailableProjects();

    expect(projects).toContain('project-a');
    expect(projects).toContain('project-b');
    expect(projects).toContain('demo-rbp');
  });
});
