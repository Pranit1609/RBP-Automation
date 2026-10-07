import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { ProjectConfig } from '../types';
import { Logger } from '../utils/Logger';
import { Helpers } from '../utils/Helpers';

// Zod Schema definition for strict validation
const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const AccessTypeSchema = z.enum(['ALLOW', 'DENY']);
const DenyPolicySchema = z.enum(['DENY_ALL', 'FORBIDDEN_RECORDS']).optional();

const UserAuthConfigSchema = z.object({
  role: z.string(),
  emailEnv: z.string(),
  passwordEnv: z.string(),
  customHeaders: z.record(z.string()).optional()
});

const AuthConfigSchema = z.object({
  login: z.object({
    endpoint: z.string(),
    method: HttpMethodSchema,
    authType: z.enum(['TOKEN', 'COOKIE', 'BOTH']).optional().default('TOKEN'),
    requestBodyTemplate: z.record(z.string()).optional(),
    responseTokenPath: z.string().optional().default('token'),
    responseCookieName: z.string().optional(),
    tokenHeaderName: z.string().optional().default('Authorization'),
    tokenHeaderPrefix: z.string().optional().default('Bearer ')
  }),
  users: z.record(UserAuthConfigSchema)
});

const ApiEndpointConfigSchema = z.object({
  method: HttpMethodSchema,
  endpoint: z.string(),
  entityName: z.string().optional(),
  queryParams: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional()
});

const RecordConfigSchema = z.object({
  expected: z.array(z.string())
});

const RoleConfigSchema = z.object({
  pathSegment: z.string()
});

const ResponseMappingConfigSchema = z.object({
  recordPath: z.string(),
  recordIdField: z.string(),
  totalPath: z.string().optional()
});

const RbpRuleConfigSchema = z.object({
  name: z.string(),
  sessionRole: z.string(),
  apiRole: z.string(),
  access: AccessTypeSchema,
  policy: DenyPolicySchema,
  expectedRecords: z.array(z.string()).optional(),
  forbiddenRecords: z.array(z.string()).optional(),
  testAlternateUrl: z.boolean().optional().default(false)
});

const RetryConfigSchema = z.object({
  maxRetries: z.number().default(2),
  backoffMs: z.number().default(1000),
  retryableStatusCodes: z.array(z.number()).default([500, 502, 503, 504])
}).optional();

const ProjectConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    baseUrl: z.string().url('baseUrl must be a valid URL'),
    environment: z.string().optional().default('local')
  }),
  authentication: AuthConfigSchema,
  apis: z.record(ApiEndpointConfigSchema),
  records: z.record(RecordConfigSchema),
  responseMapping: ResponseMappingConfigSchema,
  roles: z.record(RoleConfigSchema).optional(),
  rbpRules: z.array(RbpRuleConfigSchema),
  retry: RetryConfigSchema
});

export class ConfigLoader {
  private static configCache: Map<string, ProjectConfig> = new Map();

  /**
   * Load project YAML configuration by project name or file path.
   */
  public static loadProjectConfig(projectNameOrPath: string): ProjectConfig {
    const resolvedPath = this.resolveConfigPath(projectNameOrPath);

    if (this.configCache.has(resolvedPath)) {
      return this.configCache.get(resolvedPath)!;
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Configuration file not found at: ${resolvedPath}`);
    }

    Logger.info(`Loading project configuration from: ${resolvedPath}`);
    const rawYaml = fs.readFileSync(resolvedPath, 'utf-8');
    const parsedObj = yaml.load(rawYaml) as any;

    if (!parsedObj) {
      throw new Error(`Failed to parse YAML file at: ${resolvedPath}`);
    }

    // Validate using Zod schema
    const validationResult = ProjectConfigSchema.safeParse(parsedObj);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.errors
        .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
        .join('\n');
      throw new Error(`Invalid project configuration in ${resolvedPath}:\n${formattedErrors}`);
    }

    const validatedConfig = validationResult.data as ProjectConfig;

    // Verify environment variables for users
    for (const [role, userAuth] of Object.entries(validatedConfig.authentication.users)) {
      const email = Helpers.getEnv(userAuth.emailEnv);
      const password = Helpers.getEnv(userAuth.passwordEnv);

      if (!email && process.env.NODE_ENV !== 'test') {
        Logger.warn(`Environment variable '${userAuth.emailEnv}' for role '${role}' is missing or empty.`);
      }
      if (!password && process.env.NODE_ENV !== 'test') {
        Logger.warn(`Environment variable '${userAuth.passwordEnv}' for role '${role}' is missing or empty.`);
      }
    }

    this.configCache.set(resolvedPath, validatedConfig);
    return validatedConfig;
  }

  /**
   * List all available project configurations in config/projects directory.
   */
  public static listAvailableProjects(): string[] {
    const projectsDir = path.resolve(process.cwd(), 'config', 'projects');
    if (!fs.existsSync(projectsDir)) {
      return [];
    }
    return fs
      .readdirSync(projectsDir)
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map((file) => file.replace(/\.yaml$|\.yml$/, ''));
  }

  private static resolveConfigPath(inputPath: string): string {
    if (inputPath.endsWith('.yaml') || inputPath.endsWith('.yml')) {
      return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    }
    // Search in config/projects/<inputPath>.yaml
    return path.resolve(process.cwd(), 'config', 'projects', `${inputPath}.yaml`);
  }
}
