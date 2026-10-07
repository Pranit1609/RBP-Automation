import { ProjectConfig, TestResult } from '../types';
import { AuthManager } from '../auth/AuthManager';
import { ApiClient } from '../api/ApiClient';
import { PolicyEngine } from './PolicyEngine';
import { GeneratedTestCase } from './RBPMatrix';
import { UrlRoleTransformer } from '../url/UrlRoleTransformer';
import { SecretMasker } from '../utils/SecretMasker';
import { Logger } from '../utils/Logger';

export class RBPValidator {
  private config: ProjectConfig;
  private authManager: AuthManager;
  private apiClient: ApiClient;

  constructor(config: ProjectConfig, authManager?: AuthManager) {
    this.config = config;
    this.authManager = authManager || new AuthManager(config);
    this.apiClient = new ApiClient(config);
  }

  public getAuthManager(): AuthManager {
    return this.authManager;
  }

  /**
   * Execute a single generated RBP test case and return standardized TestResult evidence.
   */
  public async executeTestCase(testCase: GeneratedTestCase): Promise<TestResult> {
    const startTime = Date.now();
    const { rule, sessionRole, apiRole, isAlternateUrlTest } = testCase;

    Logger.info(`--------------------------------------------------`);
    Logger.info(`Executing [${testCase.testId}] ${testCase.name}`);
    Logger.info(`Session Role: ${sessionRole} | API Role: ${apiRole} | Access: ${rule.access}${isAlternateUrlTest ? ' (Alternate URL)' : ''}`);

    // Ensure authenticated session exists
    let session = this.authManager.getSessionManager().hasSession(sessionRole)
      ? this.authManager.getSessionManager().getSession(sessionRole)
      : await this.authManager.createRoleSession(sessionRole);

    const apiConfig = this.config.apis[apiRole.toLowerCase()];
    if (!apiConfig) {
      throw new Error(`API endpoint configuration for role/key '${apiRole}' is not defined.`);
    }

    let targetEndpoint = apiConfig.endpoint;

    // Handle Scenario 5: Alternate URL Role Path Test
    if (isAlternateUrlTest) {
      const fromRoleSegment = this.config.roles?.[apiRole.toLowerCase()]?.pathSegment || apiRole;
      const toRoleSegment = this.config.roles?.[sessionRole.toLowerCase()]?.pathSegment || sessionRole;
      
      const originalEndpoint = targetEndpoint;
      targetEndpoint = UrlRoleTransformer.transformRolePath(
        originalEndpoint,
        fromRoleSegment,
        toRoleSegment,
        this.config.project.baseUrl
      );

      Logger.info(`Alternate URL Transformation: '${originalEndpoint}' -> '${targetEndpoint}'`);
    }

    const fullUrl = UrlRoleTransformer.buildFullUrl(this.config.project.baseUrl, targetEndpoint);

    // Call API with isolated role session
    const response = await this.apiClient.sendRequest({
      method: apiConfig.method,
      url: fullUrl,
      queryParams: apiConfig.queryParams,
      headers: apiConfig.headers,
      session
    });

    // Policy Evaluation
    const expectedRecords = rule.expectedRecords || this.config.records[apiRole.toLowerCase()]?.expected || [];
    const forbiddenRecords = rule.forbiddenRecords || this.config.records[apiRole.toLowerCase()]?.expected || [];
    
    const evaluation = PolicyEngine.evaluate(
      {
        ...rule,
        expectedRecords,
        forbiddenRecords
      },
      response.recordIds,
      response.statusCode
    );

    const durationMs = Date.now() - startTime;

    if (evaluation.passed) {
      Logger.pass(`[${testCase.testId}] PASS: ${evaluation.reason}`);
    } else {
      Logger.fail(`[${testCase.testId}] FAIL: ${evaluation.reason}`);
    }

    // Build Evidence
    const evidence = {
      requestUrl: fullUrl,
      requestMethod: apiConfig.method,
      requestHeaders: SecretMasker.maskHeaders({
        ...session.headers,
        ...(apiConfig.headers || {})
      }),
      requestPayload: undefined,
      responseStatusCode: response.statusCode,
      responseHeaders: SecretMasker.maskHeaders(response.headers),
      responseBody: SecretMasker.maskPayload(response.body)
    };

    const testResult: TestResult = {
      testId: testCase.testId,
      project: this.config.project.name,
      sessionRole,
      targetRole: apiRole,
      method: apiConfig.method,
      url: targetEndpoint,
      statusCode: response.statusCode,
      expectedRecords: evaluation.expectedRecords,
      forbiddenRecords: evaluation.forbiddenRecords,
      actualRecords: response.recordIds,
      result: evaluation.result,
      policyUsed: evaluation.policyUsed as any,
      reason: evaluation.reason,
      timestamp: new Date().toISOString(),
      durationMs,
      evidence
    };

    return testResult;
  }
}
