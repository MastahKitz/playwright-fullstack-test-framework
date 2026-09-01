import { Page, Locator, expect } from '@playwright/test';

async function mutateCart(
  page: Page,
  method: 'POST' | 'PATCH' | 'DELETE',
  click: () => Promise<void>,
  confirm: () => Promise<void>,
) {
  const response = page.waitForResponse(
    (res) =>
      /\/api\/cart\/items(\/\d+)?$/.test(new URL(res.url()).pathname) &&
      res.request().method() === method &&
      res.ok(),
    { timeout: 15_000 },
  );
  await click();
  await response;
  await confirm();
}

export async function clickAddToCartButton(page: Page) {
  await mutateCart(
    page,
    'POST',
    () => page.getByTestId('product-add-to-cart-button').click(),
    () => page.getByTestId('product-view-cart-button').waitFor({ timeout: 15000 }),
  );
}

export async function clickViewCartButton(page: Page) {
  await page.getByTestId('product-view-cart-button').click();
  await waitForCartPage(page);
}

export async function clickNavbarCartLink(page: Page) {
  await page.getByTestId('navbar-cart-link').click();
  await waitForCartPage(page);
}

async function waitForCartPage(page: Page) {
  await page.getByTestId('cart-page').waitFor();
}

function cartItem(page: Page, productName: string): Locator {
  return page
    .getByTestId('cart-items-list')
    .getByTestId(/^cart-item-\d+$/)
    .filter({ has: page.getByTestId(/^cart-item-name-\d+$/).getByText(productName, { exact: true }) });
}

export async function clickIncreaseQuantityButton(page: Page, productName: string) {
  const item = cartItem(page, productName);
  const quantity = item.getByTestId(/^cart-item-quantity-\d+$/);
  const beforeQuantity = await quantity.innerText();
  await mutateCart(
    page,
    'PATCH',
    () => item.getByTestId(/^cart-item-increase-\d+$/).click(),
    () => expect(quantity).not.toHaveText(beforeQuantity, { timeout: 15000 }),
  );
}

export async function clickDecreaseQuantityButton(page: Page, productName: string) {
  const item = cartItem(page, productName);
  const quantity = item.getByTestId(/^cart-item-quantity-\d+$/);
  const beforeQuantity = await quantity.innerText();
  await mutateCart(
    page,
    'PATCH',
    () => item.getByTestId(/^cart-item-decrease-\d+$/).click(),
    () => expect(quantity).not.toHaveText(beforeQuantity, { timeout: 15000 }),
  );
}

export async function clickRemoveItemButton(page: Page, productName: string) {
  const item = cartItem(page, productName);
  await mutateCart(
    page,
    'DELETE',
    () => item.getByTestId(/^cart-item-remove-\d+$/).click(),
    () => item.waitFor({ state: 'detached', timeout: 15000 }),
  );
}
