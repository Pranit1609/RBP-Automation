const SENSITIVE_KEY_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /api[-_]?key/i,
  /auth/i,
  /session/i,
  /bearer/i
];

export class SecretMasker {
  /**
   * Mask a secret string, leaving at most 2 trailing/leading chars visible if long enough.
   */
  public static maskSecret(value?: string | null): string {
    if (!value) return '[EMPTY]';
    if (value.length <= 4) return '****';
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }

  /**
   * Mask sensitive headers in a headers dictionary.
   */
  public static maskHeaders(headers?: Record<string, string> | null): Record<string, string> {
    if (!headers) return {};
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      masked[key] = isSensitive ? this.maskSecret(value) : value;
    }
    return masked;
  }

  /**
   * Recursively mask sensitive fields in a JSON object or string payload.
   */
  public static maskPayload(payload: any): any {
    if (payload === null || payload === undefined) return payload;

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        return JSON.stringify(this.maskPayload(parsed));
      } catch {
        // If string matches token/password patterns, mask it
        if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(payload))) {
          return this.maskSecret(payload);
        }
        return payload;
      }
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.maskPayload(item));
    }

    if (typeof payload === 'object') {
      const maskedObj: Record<string, any> = {};
      for (const [key, value] of Object.entries(payload)) {
        const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitive) {
          maskedObj[key] = typeof value === 'string' ? this.maskSecret(value) : '[MASKED]';
        } else {
          maskedObj[key] = this.maskPayload(value);
        }
      }
      return maskedObj;
    }

    return payload;
  }
}
