import { DenyPolicy, RbpRuleConfig } from '../types';

export interface PolicyEvaluationResult {
  passed: boolean;
  result: 'PASS' | 'FAIL';
  reason: string;
  expectedRecords: string[];
  forbiddenRecords: string[];
  actualRecords: string[];
  policyUsed: string;
}

export class PolicyEngine {
  /**
   * Evaluates an RBP rule against the actual records extracted from an API response.
   */
  public static evaluate(
    rule: RbpRuleConfig,
    actualRecords: string[],
    statusCode: number
  ): PolicyEvaluationResult {
    const expectedRecords = rule.expectedRecords || [];
    const forbiddenRecords = rule.forbiddenRecords || [];

    if (rule.access === 'ALLOW') {
      return this.evaluateAllowRule(rule, actualRecords, expectedRecords, statusCode);
    } else {
      return this.evaluateDenyRule(rule, actualRecords, forbiddenRecords, statusCode);
    }
  }

  private static evaluateAllowRule(
    rule: RbpRuleConfig,
    actualRecords: string[],
    expectedRecords: string[],
    statusCode: number
  ): PolicyEvaluationResult {
    if (statusCode >= 400) {
      return {
        passed: false,
        result: 'FAIL',
        reason: `ALLOW rule expected HTTP 2xx success, but received HTTP ${statusCode}`,
        expectedRecords,
        forbiddenRecords: [],
        actualRecords,
        policyUsed: 'ALLOW'
      };
    }

    if (expectedRecords.length === 0) {
      return {
        passed: true,
        result: 'PASS',
        reason: `Session '${rule.sessionRole}' granted access to '${rule.apiRole}' API as expected`,
        expectedRecords,
        forbiddenRecords: [],
        actualRecords,
        policyUsed: 'ALLOW'
      };
    }

    const missingRecords = expectedRecords.filter((rec) => !actualRecords.includes(rec));

    if (missingRecords.length > 0) {
      return {
        passed: false,
        result: 'FAIL',
        reason: `Session '${rule.sessionRole}' accessed '${rule.apiRole}' API, but expected record(s) [${missingRecords.join(', ')}] were missing from response`,
        expectedRecords,
        forbiddenRecords: [],
        actualRecords,
        policyUsed: 'ALLOW'
      };
    }

    return {
      passed: true,
      result: 'PASS',
      reason: `Session '${rule.sessionRole}' successfully accessed '${rule.apiRole}' API and verified expected record(s) [${expectedRecords.join(', ')}]`,
      expectedRecords,
      forbiddenRecords: [],
      actualRecords,
      policyUsed: 'ALLOW'
    };
  }

  private static evaluateDenyRule(
    rule: RbpRuleConfig,
    actualRecords: string[],
    forbiddenRecords: string[],
    statusCode: number
  ): PolicyEvaluationResult {
    // If HTTP status is 401 or 403, access is denied at gateway/auth level => PASS
    if (statusCode === 401 || statusCode === 403) {
      return {
        passed: true,
        result: 'PASS',
        reason: `Session '${rule.sessionRole}' request to '${rule.apiRole}' API was correctly rejected with HTTP ${statusCode}`,
        expectedRecords: [],
        forbiddenRecords,
        actualRecords,
        policyUsed: 'HTTP_STATUS_DENY'
      };
    }

    const policy: DenyPolicy = rule.policy || (forbiddenRecords.length > 0 ? 'FORBIDDEN_RECORDS' : 'DENY_ALL');

    if (policy === 'DENY_ALL') {
      if (actualRecords.length > 0) {
        return {
          passed: false,
          result: 'FAIL',
          reason: `Policy DENY_ALL violated: Session '${rule.sessionRole}' received ${actualRecords.length} record(s) from forbidden '${rule.apiRole}' API`,
          expectedRecords: [],
          forbiddenRecords,
          actualRecords,
          policyUsed: 'DENY_ALL'
        };
      }
      return {
        passed: true,
        result: 'PASS',
        reason: `Policy DENY_ALL satisfied: Session '${rule.sessionRole}' received zero records from forbidden '${rule.apiRole}' API`,
        expectedRecords: [],
        forbiddenRecords,
        actualRecords,
        policyUsed: 'DENY_ALL'
      };
    } else {
      // FORBIDDEN_RECORDS policy
      const exposedForbidden = forbiddenRecords.filter((rec) => actualRecords.includes(rec));

      if (exposedForbidden.length > 0) {
        return {
          passed: false,
          result: 'FAIL',
          reason: `Security Violation: Unauthorized record(s) [${exposedForbidden.join(', ')}] exposed to '${rule.sessionRole}' session calling '${rule.apiRole}' API`,
          expectedRecords: [],
          forbiddenRecords,
          actualRecords,
          policyUsed: 'FORBIDDEN_RECORDS'
        };
      }

      return {
        passed: true,
        result: 'PASS',
        reason: `Forbidden manager/restricted record(s) [${forbiddenRecords.join(', ')}] were not exposed to '${rule.sessionRole}' session`,
        expectedRecords: [],
        forbiddenRecords,
        actualRecords,
        policyUsed: 'FORBIDDEN_RECORDS'
      };
    }
  }
}
