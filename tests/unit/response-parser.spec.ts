import { test, expect } from '@playwright/test';
import { RecordExtractor } from '../../src/response/RecordExtractor';
import { ResponseParser } from '../../src/response/ResponseParser';

test.describe('Unit Test: RecordExtractor & ResponseParser', () => {
  test('extracts record IDs from data array (Example 1)', () => {
    const payload = { data: [{ id: '101' }, { id: '102' }] };
    const mapping = { recordPath: 'data', recordIdField: 'id' };

    const recordIds = RecordExtractor.extractRecordIds(payload, mapping);
    expect(recordIds).toEqual(['101', '102']);
  });

  test('extracts record IDs from employees array (Example 2)', () => {
    const payload = { employees: [{ employeeId: 201 }, { employeeId: 202 }] };
    const mapping = { recordPath: 'employees', recordIdField: 'employeeId' };

    const recordIds = RecordExtractor.extractRecordIds(payload, mapping);
    expect(recordIds).toEqual(['201', '202']);
  });

  test('extracts record IDs from nested dot notation path', () => {
    const payload = { response: { items: [{ recordNumber: '301' }] } };
    const mapping = { recordPath: 'response.items', recordIdField: 'recordNumber' };

    const recordIds = RecordExtractor.extractRecordIds(payload, mapping);
    expect(recordIds).toEqual(['301']);
  });

  test('ResponseParser handles raw text JSON parsing and mapping', () => {
    const rawJson = JSON.stringify({ data: [{ id: '101' }] });
    const mapping = { recordPath: 'data', recordIdField: 'id' };

    const parsed = ResponseParser.parse(200, { 'content-type': 'application/json' }, rawJson, mapping);

    expect(parsed.statusCode).toBe(200);
    expect(parsed.recordIds).toEqual(['101']);
  });
});
