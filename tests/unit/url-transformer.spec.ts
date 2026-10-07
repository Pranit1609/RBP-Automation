import { test, expect } from '@playwright/test';
import { UrlRoleTransformer } from '../../src/url/UrlRoleTransformer';

test.describe('Unit Test: UrlRoleTransformer', () => {
  test('transforms role path segment safely preserving query params', () => {
    const original = '/manager/getEmployeeData?page=1&sort=asc';
    const transformed = UrlRoleTransformer.transformRolePath(original, 'manager', 'employee');

    expect(transformed).toBe('/employee/getEmployeeData?page=1&sort=asc');
  });

  test('handles absolute URLs cleanly', () => {
    const original = 'https://app.company.com/api/manager/records';
    const transformed = UrlRoleTransformer.transformRolePath(original, 'manager', 'employee');

    expect(transformed).toBe('https://app.company.com/api/employee/records');
  });

  test('does not replace text inside query params or unrelated words', () => {
    const original = '/manager/getEmployee?manager=john';
    const transformed = UrlRoleTransformer.transformRolePath(original, 'manager', 'employee');

    expect(transformed).toBe('/employee/getEmployee?manager=john');
  });

  test('buildFullUrl combines base URL and endpoint without double slashes', () => {
    expect(UrlRoleTransformer.buildFullUrl('https://app.com/', '/api/v1')).toBe('https://app.com/api/v1');
    expect(UrlRoleTransformer.buildFullUrl('https://app.com', 'api/v1')).toBe('https://app.com/api/v1');
  });
});
