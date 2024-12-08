const { test, expect } = require('@playwright/test');
require('dotenv').config();

const appUrl = process.env.APP_URL || 'http://localhost:3333';

test('Discogs import functionality with custom alert', async ({ page }) => {
  // Navigate to the import page
  await page.goto(`${appUrl}/importCollection`);


  // Fill in the Discogs user ID and API token from environment variables
  await page.fill('input[name="userId"]', process.env.DISCOGS_USER_ID);
  await page.fill('input[name="apiToken"]', process.env.DISCOGS_API_TOKEN);


  // Click the import button
  await page.click('button[name="importButton"]');

  // Wait for 2 seconds to ensure we navigate to the correct page
  await page.waitForTimeout(2000);

  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  expect(pageTitle).toBe('Vinyl Journey');


});
