import { request as playwrightRequest } from '@playwright/test';
import { ProjectConfig, SessionContext, UserAuthConfig } from '../types';
import { SessionManager } from './SessionManager';
import { RecordExtractor } from '../response/RecordExtractor';
import { Logger } from '../utils/Logger';
import { Helpers } from '../utils/Helpers';
import { UrlRoleTransformer } from '../url/UrlRoleTransformer';

export class AuthManager {
  private config: ProjectConfig;
  private sessionManager: SessionManager;

  constructor(config: ProjectConfig, sessionManager?: SessionManager) {
    this.config = config;
    this.sessionManager = sessionManager || new SessionManager();
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Authenticate a user by role name and create an independent SessionContext.
   */
  public async createRoleSession(role: string): Promise<SessionContext> {
    const roleKey = role.toLowerCase();
    const userConfig: UserAuthConfig | undefined = this.config.authentication.users[roleKey];

    if (!userConfig) {
      throw new Error(`Role '${role}' is not defined under authentication.users in configuration.`);
    }

    const email = Helpers.getEnv(userConfig.emailEnv);
    const password = Helpers.getEnv(userAuthPasswordKey(userConfig.passwordEnv));

    if (!email || !password) {
      Logger.warn(`Credentials missing in env for role '${role}' (${userConfig.emailEnv}, ${userConfig.passwordEnv})`);
    }

    Logger.info(`Authenticating session for role: '${role}' (${email || 'no-email-set'})`);

    const loginConfig = this.config.authentication.login;
    const loginUrl = UrlRoleTransformer.buildFullUrl(this.config.project.baseUrl, loginConfig.endpoint);

    // Build payload
    const bodyTemplate = loginConfig.requestBodyTemplate || {
      email: '{email}',
      password: '{password}'
    };

    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(bodyTemplate)) {
      payload[k] = v.replace('{email}', email).replace('{password}', password);
    }

    // Create fresh, isolated Playwright APIRequestContext
    const requestContext = await playwrightRequest.newContext({
      baseURL: this.config.project.baseUrl,
      ignoreHTTPSErrors: true
    });

    try {
      const response = await requestContext.post(loginUrl, {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          ...(userConfig.customHeaders || {})
        }
      });

      const statusCode = response.status();
      const rawText = await response.text();
      let body: any = {};
      try {
        body = JSON.parse(rawText);
      } catch {
        body = rawText;
      }

      if (statusCode >= 400) {
        throw new Error(
          `Authentication failed for role '${role}' (Status ${statusCode}): ${JSON.stringify(body)}`
        );
      }

      const headers: Record<string, string> = {};
      let token: string | undefined;

      // Extract Token if required
      if (loginConfig.authType === 'TOKEN' || loginConfig.authType === 'BOTH' || !loginConfig.authType) {
        const tokenPath = loginConfig.responseTokenPath || 'token';
        token = RecordExtractor.getValueByPath(body, tokenPath);

        if (!token && typeof body === 'object') {
          // Fallback common token keys
          token = body.token || body.accessToken || body.access_token || body.jwt;
        }

        if (!token) {
          throw new Error(`Token path '${tokenPath}' not found in auth response for role '${role}'`);
        }

        const headerName = loginConfig.tokenHeaderName || 'Authorization';
        const prefix = loginConfig.tokenHeaderPrefix !== undefined ? loginConfig.tokenHeaderPrefix : 'Bearer ';
        headers[headerName] = `${prefix}${token}`;
      }

      // Extract Cookies if required
      const responseHeaders = response.headers();
      const cookiesHeader = responseHeaders['set-cookie'];
      const cookies: Record<string, string> = {};

      if (cookiesHeader) {
        // Parse set-cookie
        const cookiePairs = Array.isArray(cookiesHeader) ? cookiesHeader : cookiesHeader.split('\n');
        for (const pair of cookiePairs) {
          const mainPart = pair.split(';')[0];
          const [cKey, cVal] = mainPart.split('=');
          if (cKey && cVal) {
            cookies[cKey.trim()] = cVal.trim();
          }
        }
        if (loginConfig.authType === 'COOKIE' || loginConfig.authType === 'BOTH') {
          headers['Cookie'] = Object.entries(cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
        }
      }

      // Add custom headers if specified
      if (userConfig.customHeaders) {
        Object.assign(headers, userConfig.customHeaders);
      }

      const session: SessionContext = {
        role: roleKey,
        email,
        token,
        cookies,
        headers,
        createdAt: new Date().toISOString()
      };

      this.sessionManager.registerSession(roleKey, session);
      await requestContext.dispose();

      return session;
    } catch (error) {
      await requestContext.dispose();
      throw error;
    }
  }

  public async createEmployeeSession(): Promise<SessionContext> {
    return this.createRoleSession('employee');
  }

  public async createManagerSession(): Promise<SessionContext> {
    return this.createRoleSession('manager');
  }
}

function userAuthPasswordKey(key: string): string {
  return key;
}
