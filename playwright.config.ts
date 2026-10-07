import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit-playwright.xml' }],
    ['allure-playwright', { outputFolder: 'allure-results' }]
  ],
  use: {
    extraHTTPHeaders: {
      'Accept': 'application/json'
    },
    ignoreHTTPSErrors: true
  }
});
