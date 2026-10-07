import { test, expect } from '@playwright/test';
import { ConfigLoader } from '../../src/config/ConfigLoader';
import { RBPMatrix } from '../../src/rbp/RBPMatrix';
import { RBPValidator } from '../../src/rbp/RBPValidator';
import { ResultCollector } from '../../src/reporting/ResultCollector';
import { ReportGenerator } from '../../src/reporting/ReportGenerator';
import { Logger } from '../../src/utils/Logger';

const selectedProject = process.env.PROJECT || 'demo-rbp';

test.describe(`RBP Permission Security Suite - ${selectedProject}`, () => {
  let config: any;
  let validator: RBPValidator;
  let collector: ResultCollector;

  test.beforeAll(async () => {
    config = ConfigLoader.loadProjectConfig(selectedProject);
    validator = new RBPValidator(config);
    collector = new ResultCollector(config);
    Logger.info(`Loaded configuration for project: ${config.project.name} (${config.project.baseUrl})`);
  });

  test.afterAll(async () => {
    const record = collector.generateExecutionRecord(undefined, config.project.environment);
    const reportGen = new ReportGenerator();
    await reportGen.saveAllReports(record);
    Logger.info(`Saved all execution evidence reports for ${selectedProject}`);
  });

  test('Execute Configuration-Driven RBP Matrix', async () => {
    const testCases = RBPMatrix.generateTestCases(config);
    Logger.info(`Generated ${testCases.length} dynamic RBP test case(s) from project config`);

    for (const testCase of testCases) {
      await test.step(`[${testCase.testId}] ${testCase.name}`, async () => {
        const result = await validator.executeTestCase(testCase);
        collector.addResult(result);
        expect(result.result, `Test ${testCase.testId} failed: ${result.reason}`).toBe('PASS');
      });
    }
  });
});
