const { test, expect } = require('@playwright/test');

test.describe('Vinyl Journey Application - Style Checks', () => {
  const pages = [
    { url: 'http://app:3333', name: 'Homepage' },
    { url: 'http://app:3333/randomAlbum', name: 'Random Album' },
    { url: 'http://app:3333/albumNotes/1', name: 'Album Notes' }, // Example album ID
    { url: 'http://app:3333/importCollection', name: 'Import Collection' }
  ];

  pages.forEach(({ url, name }) => {
    test(`should load styles correctly on ${name}`, async ({ page }) => {
      await page.goto(url);

      // Check if the stylesheet link is present
      const stylesheet = await page.$('link[rel="stylesheet"]');
      expect(stylesheet).not.toBeNull();

      // Check if a specific style is applied (e.g., background color of the body)
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Ensure it's not the default transparent
    });
  });
});
