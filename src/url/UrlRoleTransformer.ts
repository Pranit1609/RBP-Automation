import { Logger } from '../utils/Logger';

export class UrlRoleTransformer {
  /**
   * Safely transforms a URL by replacing a source role path segment with a target role path segment.
   * Preserves query params, hash, encoding, and relative/absolute structure.
   */
  public static transformRolePath(
    originalUrl: string,
    fromRoleSegment: string,
    toRoleSegment: string,
    baseUrl: string = 'http://localhost'
  ): string {
    if (!originalUrl || !fromRoleSegment || !toRoleSegment) {
      return originalUrl;
    }

    if (fromRoleSegment === toRoleSegment) {
      return originalUrl;
    }

    try {
      const isAbsolute = originalUrl.startsWith('http://') || originalUrl.startsWith('https://');
      const parsedUrl = new URL(originalUrl, isAbsolute ? undefined : baseUrl);

      // Split pathname into segments
      const pathSegments = parsedUrl.pathname.split('/');

      // Replace only segment matches in pathname (not query params)
      let replaced = false;
      const newPathSegments = pathSegments.map((segment) => {
        if (!replaced && segment.toLowerCase() === fromRoleSegment.toLowerCase()) {
          replaced = true;
          return toRoleSegment;
        }
        return segment;
      });

      if (!replaced) {
        Logger.warn(`Role path segment '${fromRoleSegment}' not found in URL pathname: '${parsedUrl.pathname}'`);
      }

      parsedUrl.pathname = newPathSegments.join('/');

      if (isAbsolute) {
        return parsedUrl.toString();
      }

      // Return relative pathname + search + hash
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch (error) {
      Logger.error(`Failed to transform URL '${originalUrl}': ${(error as Error).message}`);
      return originalUrl;
    }
  }

  /**
   * Constructs a full absolute URL given a baseUrl and an endpoint, handling trailing/leading slashes.
   */
  public static buildFullUrl(baseUrl: string, endpoint: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
}
