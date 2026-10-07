import * as dotenv from 'dotenv';
dotenv.config();

export class Helpers {
  public static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  public static getEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }

  public static generateExecutionId(prefix: string = 'EXEC'): string {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}`;
  }

  public static safeJsonParse<T = any>(str: string, fallback: any = null): T {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }
}
