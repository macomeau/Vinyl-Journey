const { test, expect } = require('@playwright/test');

test.describe('Vinyl Journey Application', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('http://localhost:3333');
    await expect(page).toHaveTitle(/Vinyl Journey/);
  });

  test('should display a random album', async ({ page }) => {
    await page.goto('http://localhost:3333/randomAlbum');
    const albumTitle = await page.locator('.random-album-card h3').textContent();
    expect(albumTitle).not.toBeNull();
  });

  test('should navigate to album notes', async ({ page }) => {
    await page.goto('http://localhost:3333/randomAlbum');
    await page.click('.action-button');
    await expect(page).toHaveURL(/\/albumNotes\/\d+/);
  });

  test('should load styles correctly', async ({ page }) => {
    await page.goto('http://localhost:3333/randomAlbum');
    const style = await page.evaluate(() => {
      const element = document.querySelector('link[rel="stylesheet"]');
      return window.getComputedStyle(element);
    });
    expect(style).not.toBeNull();
  });
});
