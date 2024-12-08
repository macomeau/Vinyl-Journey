const { test, expect } = require('@playwright/test');
require('dotenv').config();

const appUrl = process.env.APP_URL || 'http://localhost:3333';

test.describe('Vinyl Journey Application - Discogs Link', () => {
  test('should open Discogs page in a new tab', async ({ page, context }) => {
    await page.goto(`${appUrl}/randomAlbum`);

    const [newPage] = await Promise.all([
      context.waitForEvent('page'), // Wait for the new page to open
      page.click('.discogs-button')  // Click the Discogs link
    ]);

    // Check if the new page's URL matches the expected Discogs URL pattern
    await newPage.waitForLoadState();
    const url = newPage.url();
    expect(url).toMatch(/discogs\.com/);

  });
}); 