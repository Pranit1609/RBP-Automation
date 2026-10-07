import { request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { HttpMethod, ProjectConfig, SessionContext } from '../types';
import { ResponseParser, ParsedResponse } from '../response/ResponseParser';
import { Logger } from '../utils/Logger';
import { SecretMasker } from '../utils/SecretMasker';
import { Helpers } from '../utils/Helpers';

export interface RequestOptions {
  method: HttpMethod;
  url: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  session?: SessionContext;
}

export class ApiClient {
  private config: ProjectConfig;

  constructor(config: ProjectConfig) {
    this.config = config;
  }

  /**
   * Execute an HTTP API request with isolated context, logging, retry capability, and parsing.
   */
  public async sendRequest(options: RequestOptions): Promise<ParsedResponse> {
    const method = options.method.toUpperCase() as HttpMethod;
    const baseUrl = this.config.project.baseUrl;
    const url = options.url.startsWith('http') ? options.url : `${baseUrl.replace(/\/+$/, '')}/${options.url.replace(/^\/+/, '')}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.session ? options.session.headers : {}),
      ...(options.headers || {})
    };

    const maxRetries = this.config.retry?.maxRetries ?? 2;
    const backoffMs = this.config.retry?.backoffMs ?? 1000;
    const retryableStatusCodes = this.config.retry?.retryableStatusCodes ?? [500, 502, 503, 504];

    Logger.info(`[API Request] ${method} ${url}`, {
      queryParams: options.queryParams,
      headers: SecretMasker.maskHeaders(headers),
      payload: SecretMasker.maskPayload(options.data)
    });

    let attempt = 0;
    let lastError: Error | null = null;
    let lastResponse: ParsedResponse | null = null;

    while (attempt <= maxRetries) {
      attempt++;
      let context: APIRequestContext | null = null;
      const startTime = Date.now();

      try {
        context = await playwrightRequest.newContext({
          ignoreHTTPSErrors: true,
          extraHTTPHeaders: headers
        });

        const response = await context.fetch(url, {
          method,
          params: options.queryParams,
          data: options.data,
          timeout: options.timeout || 30000
        });

        const statusCode = response.status();
        const rawHeaders = response.headers();
        const rawText = await response.text();
        const duration = Date.now() - startTime;

        const parsed = ResponseParser.parse(
          statusCode,
          rawHeaders,
          rawText,
          this.config.responseMapping
        );

        Logger.info(`[API Response] ${method} ${url} -> ${statusCode} (${duration}ms)`, {
          headers: SecretMasker.maskHeaders(rawHeaders),
          recordIdsFound: parsed.recordIds
        });

        await context.dispose();

        // Check if retryable status code
        if (retryableStatusCodes.includes(statusCode) && attempt <= maxRetries) {
          Logger.warn(`Received transient status code ${statusCode}. Retrying attempt ${attempt}/${maxRetries} after ${backoffMs}ms...`);
          await Helpers.sleep(backoffMs * attempt);
          lastResponse = parsed;
          continue;
        }

        return parsed;
      } catch (error) {
        if (context) {
          await context.dispose().catch(() => {});
        }
        lastError = error as Error;

        if (attempt <= maxRetries) {
          Logger.warn(`Network/API error: ${lastError.message}. Retrying attempt ${attempt}/${maxRetries} after ${backoffMs}ms...`);
          await Helpers.sleep(backoffMs * attempt);
        }
      }
    }

    if (lastResponse) {
      return lastResponse;
    }

    throw lastError || new Error(`Failed request to ${url} after ${maxRetries} retries.`);
  }

  public async get(url: string, session?: SessionContext, queryParams?: Record<string, string>): Promise<ParsedResponse> {
    return this.sendRequest({ method: 'GET', url, session, queryParams });
  }

  public async post(url: string, data: any, session?: SessionContext): Promise<ParsedResponse> {
    return this.sendRequest({ method: 'POST', url, data, session });
  }

  public async put(url: string, data: any, session?: SessionContext): Promise<ParsedResponse> {
    return this.sendRequest({ method: 'PUT', url, data, session });
  }

  public async delete(url: string, session?: SessionContext): Promise<ParsedResponse> {
    return this.sendRequest({ method: 'DELETE', url, session });
  }
}
