import { ResponseMappingConfig } from '../types';
import { Logger } from '../utils/Logger';

export class RecordExtractor {
  /**
   * Extract list of record ID strings from a response payload using the given mapping config.
   */
  public static extractRecordIds(
    responseBody: any,
    mapping: ResponseMappingConfig
  ): string[] {
    if (responseBody === null || responseBody === undefined) {
      return [];
    }

    const recordsArray = this.getValueByPath(responseBody, mapping.recordPath);

    if (!recordsArray) {
      Logger.debug(`No records array found at path '${mapping.recordPath}'`);
      return [];
    }

    // If recordsArray is a single object, wrap it in array
    const list = Array.isArray(recordsArray) ? recordsArray : [recordsArray];

    const extractedIds: string[] = [];

    for (const item of list) {
      if (item && typeof item === 'object') {
        const idValue = this.getValueByPath(item, mapping.recordIdField);
        if (idValue !== undefined && idValue !== null) {
          extractedIds.push(String(idValue));
        }
      } else if (item !== undefined && item !== null) {
        // Primitive element in array
        extractedIds.push(String(item));
      }
    }

    return extractedIds;
  }

  /**
   * Traverses an object using a dot-separated path (e.g. "data.items" or "data").
   */
  public static getValueByPath(obj: any, pathStr: string): any {
    if (!obj || !pathStr || pathStr === '' || pathStr === '$') {
      return obj;
    }

    const keys = pathStr.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}
