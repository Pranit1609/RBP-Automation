import { ResponseMappingConfig } from '../types';
import { RecordExtractor } from './RecordExtractor';

export interface ParsedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  recordIds: string[];
  rawText: string;
}

export class ResponseParser {
  /**
   * Parse HTTP response into standardized structure and extract record IDs.
   */
  public static parse(
    statusCode: number,
    headers: Record<string, string>,
    rawText: string,
    mapping: ResponseMappingConfig
  ): ParsedResponse {
    let body: any = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = rawText;
    }

    const recordIds = RecordExtractor.extractRecordIds(body, mapping);

    return {
      statusCode,
      headers,
      body,
      recordIds,
      rawText
    };
  }
}
