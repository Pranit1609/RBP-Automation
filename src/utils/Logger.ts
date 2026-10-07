import { SecretMasker } from './SecretMasker';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  PASS = 'PASS',
  FAIL = 'FAIL'
}

export class Logger {
  private static formatTime(): string {
    return new Date().toISOString();
  }

  private static log(level: LogLevel, message: string, meta?: any): void {
    const timestamp = this.formatTime();
    const maskedMessage = SecretMasker.maskPayload(message);
    const maskedMeta = meta ? SecretMasker.maskPayload(meta) : '';
    const metaStr = meta ? ` | ${JSON.stringify(maskedMeta)}` : '';
    
    const formatted = `[${timestamp}] [${level}] ${maskedMessage}${metaStr}`;

    switch (level) {
      case LogLevel.FAIL:
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.PASS:
      case LogLevel.INFO:
      case LogLevel.DEBUG:
      default:
        console.log(formatted);
        break;
    }
  }

  public static info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  public static warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  public static error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  public static pass(message: string, meta?: any): void {
    this.log(LogLevel.PASS, message, meta);
  }

  public static fail(message: string, meta?: any): void {
    this.log(LogLevel.FAIL, message, meta);
  }

  public static debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }
}
