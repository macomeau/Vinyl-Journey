const { test, expect } = require('@playwright/test');
require('dotenv').config();

const appUrl = process.env.APP_URL || 'http://localhost:3333';

console.log('App URL:', appUrl);

test.describe('Vinyl Journey Application', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto(`${appUrl}`);
    await expect(page).toHaveTitle(/Vinyl Journey/);
  });

  test('should display a random album', async ({ page }) => {
    await page.goto(`${appUrl}/randomAlbum`);
    const albumTitle = await page.locator('.random-album-card h3').textContent();
    expect(albumTitle).not.toBeNull();
  });

  test('should navigate to album notes', async ({ page }) => {
    await page.goto(`${appUrl}/randomAlbum`);
    await page.click('.action-button');
    await expect(page).toHaveURL(/\/albumNotes\/\d+/);
  });

  test('should navigate to import collection', async ({ page }) => {
    await page.goto(`${appUrl}/importCollection`);
    await expect(page).toHaveTitle(/Import Collection/);
  });
});
