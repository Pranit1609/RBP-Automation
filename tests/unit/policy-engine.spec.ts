import { test, expect } from '@playwright/test';
import { PolicyEngine } from '../../src/rbp/PolicyEngine';

test.describe('Unit Test: PolicyEngine', () => {
  test('ALLOW policy passes when expected record is found', () => {
    const rule: any = { access: 'ALLOW', sessionRole: 'employee', apiRole: 'employee' };
    const res = PolicyEngine.evaluate(rule, ['101', '105'], 200);

    expect(res.passed).toBe(true);
    expect(res.result).toBe('PASS');
  });

  test('FORBIDDEN_RECORDS policy fails when forbidden record 102 is present', () => {
    const rule: any = {
      access: 'DENY',
      sessionRole: 'employee',
      apiRole: 'manager',
      policy: 'FORBIDDEN_RECORDS',
      forbiddenRecords: ['102']
    };

    const res = PolicyEngine.evaluate(rule, ['101', '102'], 200);

    expect(res.passed).toBe(false);
    expect(res.result).toBe('FAIL');
    expect(res.reason).toContain('102');
  });

  test('FORBIDDEN_RECORDS policy passes when forbidden record 102 is absent', () => {
    const rule: any = {
      access: 'DENY',
      sessionRole: 'employee',
      apiRole: 'manager',
      policy: 'FORBIDDEN_RECORDS',
      forbiddenRecords: ['102']
    };

    const res = PolicyEngine.evaluate(rule, ['101', '103'], 200);

    expect(res.passed).toBe(true);
    expect(res.result).toBe('PASS');
  });

  test('DENY_ALL policy fails when any record is returned', () => {
    const rule: any = {
      access: 'DENY',
      sessionRole: 'employee',
      apiRole: 'manager',
      policy: 'DENY_ALL'
    };

    const res = PolicyEngine.evaluate(rule, ['101'], 200);

    expect(res.passed).toBe(false);
    expect(res.result).toBe('FAIL');
  });

  test('DENY rule passes when HTTP 403 Forbidden is returned', () => {
    const rule: any = {
      access: 'DENY',
      sessionRole: 'employee',
      apiRole: 'manager'
    };

    const res = PolicyEngine.evaluate(rule, [], 403);

    expect(res.passed).toBe(true);
    expect(res.result).toBe('PASS');
    expect(res.reason).toContain('403');
  });
});
