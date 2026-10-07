export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AccessType = 'ALLOW' | 'DENY';

export type DenyPolicy = 'DENY_ALL' | 'FORBIDDEN_RECORDS';

export type AuthType = 'TOKEN' | 'COOKIE' | 'BOTH';

export interface UserAuthConfig {
  role: string;
  emailEnv: string;
  passwordEnv: string;
  customHeaders?: Record<string, string>;
}

export interface AuthConfig {
  login: {
    endpoint: string;
    method: HttpMethod;
    authType?: AuthType;
    requestBodyTemplate?: Record<string, string>;
    responseTokenPath?: string;
    responseCookieName?: string;
    tokenHeaderName?: string;
    tokenHeaderPrefix?: string;
  };
  users: Record<string, UserAuthConfig>;
}

export interface ApiEndpointConfig {
  method: HttpMethod;
  endpoint: string;
  entityName?: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface RecordConfig {
  expected: string[];
}

export interface RoleConfig {
  pathSegment: string;
}

export interface ResponseMappingConfig {
  recordPath: string;
  recordIdField: string;
  totalPath?: string;
}

export interface RbpRuleConfig {
  name: string;
  sessionRole: string;
  apiRole: string;
  access: AccessType;
  policy?: DenyPolicy;
  expectedRecords?: string[];
  forbiddenRecords?: string[];
  testAlternateUrl?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  retryableStatusCodes: number[];
}

export interface ProjectConfig {
  project: {
    name: string;
    baseUrl: string;
    environment?: string;
  };
  authentication: AuthConfig;
  apis: Record<string, ApiEndpointConfig>;
  records: Record<string, RecordConfig>;
  responseMapping: ResponseMappingConfig;
  roles?: Record<string, RoleConfig>;
  rbpRules: RbpRuleConfig[];
  retry?: RetryConfig;
}

export interface RequestResponseEvidence {
  requestUrl: string;
  requestMethod: HttpMethod;
  requestHeaders: Record<string, string>;
  requestPayload?: any;
  responseStatusCode: number;
  responseHeaders: Record<string, string>;
  responseBody?: any;
}

export interface TestResult {
  testId: string;
  project: string;
  sessionRole: string;
  targetRole: string;
  method: HttpMethod;
  url: string;
  statusCode: number;
  expectedRecords: string[];
  forbiddenRecords: string[];
  actualRecords: string[];
  result: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  policyUsed?: AccessType | DenyPolicy;
  reason: string;
  timestamp: string;
  durationMs: number;
  evidence: RequestResponseEvidence;
}

export interface ExecutionSummary {
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
}

export interface ExecutionRecord extends ExecutionSummary {
  results: TestResult[];
}

export interface SessionContext {
  role: string;
  email: string;
  token?: string;
  cookies?: Record<string, string>;
  headers: Record<string, string>;
  createdAt: string;
}
