const { test, expect } = require('@playwright/test');

test.describe('Vinyl Journey Application - Discogs Link', () => {
  test('should open Discogs page in a new tab', async ({ page, context }) => {
    await page.goto('http://app:3333/randomAlbum');

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