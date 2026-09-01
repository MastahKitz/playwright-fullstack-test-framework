import { Page } from '@playwright/test';

export async function clickBrowseProductsButton(page: Page) {
  await page.getByTestId('browse-products-button').click();
  await page.waitForLoadState('networkidle');
}

export async function clickProductCard(page: Page, name: string) {
  const card = page.getByTestId(/^product-card-/).filter({ has: page.getByRole('heading', { name, level: 3, exact: true }) });
  await card.getByRole('link').click();
  await page.waitForLoadState('networkidle');
}
