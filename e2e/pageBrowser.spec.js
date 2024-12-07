const { test, expect } = require('@playwright/test');

test.describe('Vinyl Journey Application', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('http://app:3333');
    await expect(page).toHaveTitle(/Vinyl Journey/);
  });

  test('should display a random album', async ({ page }) => {
    await page.goto('http://app:3333/randomAlbum');
    const albumTitle = await page.locator('.random-album-card h3').textContent();
    expect(albumTitle).not.toBeNull();
  });

  test('should navigate to album notes', async ({ page }) => {
    await page.goto('http://app:3333/randomAlbum');
    await page.click('.action-button');
    await expect(page).toHaveURL(/\/albumNotes\/\d+/);
  });

  test('should navigate to import collection', async ({ page }) => {
    await page.goto('http://app:3333/importCollection');
    await expect(page).toHaveTitle(/Import Collection/);
  });
});
