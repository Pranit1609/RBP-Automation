import { ProjectConfig, RbpRuleConfig } from '../types';

export interface GeneratedTestCase {
  testId: string;
  name: string;
  rule: RbpRuleConfig;
  sessionRole: string;
  apiRole: string;
  access: 'ALLOW' | 'DENY';
  isAlternateUrlTest?: boolean;
}

export class RBPMatrix {
  /**
   * Dynamically generate test cases from YAML project configuration rules.
   */
  public static generateTestCases(config: ProjectConfig): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];
    let counter = 1;

    for (const rule of config.rbpRules) {
      const testId = `RBP-${String(counter++).padStart(3, '0')}`;
      
      testCases.push({
        testId,
        name: rule.name,
        rule,
        sessionRole: rule.sessionRole,
        apiRole: rule.apiRole,
        access: rule.access,
        isAlternateUrlTest: false
      });

      // If rule specifies testAlternateUrl, generate alternate URL test
      if (rule.testAlternateUrl) {
        const altTestId = `RBP-${String(counter++).padStart(3, '0')}`;
        testCases.push({
          testId: altTestId,
          name: `${rule.name} (Alternate URL Path Test)`,
          rule,
          sessionRole: rule.sessionRole,
          apiRole: rule.apiRole,
          access: rule.access,
          isAlternateUrlTest: true
        });
      }
    }

    return testCases;
  }
}
