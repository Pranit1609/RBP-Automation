import { ApiClient } from './ApiClient';
import { ProjectConfig, SessionContext } from '../types';
import { ParsedResponse } from '../response/ResponseParser';
import { UrlRoleTransformer } from '../url/UrlRoleTransformer';

export class RequestManager {
  private apiClient: ApiClient;
  private config: ProjectConfig;

  constructor(config: ProjectConfig) {
    this.config = config;
    this.apiClient = new ApiClient(config);
  }

  public getApiClient(): ApiClient {
    return this.apiClient;
  }

  /**
   * Execute an API endpoint defined in configuration using a specified session role.
   */
  public async executeConfiguredApi(
    apiRoleOrKey: string,
    session: SessionContext
  ): Promise<ParsedResponse> {
    const apiConfig = this.config.apis[apiRoleOrKey.toLowerCase()];
    if (!apiConfig) {
      throw new Error(`API endpoint for key '${apiRoleOrKey}' is not defined under apis in configuration.`);
    }

    const fullUrl = UrlRoleTransformer.buildFullUrl(this.config.project.baseUrl, apiConfig.endpoint);

    return this.apiClient.sendRequest({
      method: apiConfig.method,
      url: fullUrl,
      queryParams: apiConfig.queryParams,
      headers: apiConfig.headers,
      session
    });
  }
}
