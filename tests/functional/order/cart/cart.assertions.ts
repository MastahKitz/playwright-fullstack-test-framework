import { Page, expect } from '@playwright/test';
import { CartData, CartItemData } from './cart.data';

export async function assertCartDetails(page: Page, cart: CartData) {
  // header
  await expect.soft(page.getByTestId('cart-heading')).toHaveText('Shopping Cart');
  // sub-header
  await expect.soft(page.getByTestId('cart-item-count')).toHaveText(`${cart.items.length} items in your cart`);
  // cart items
  for (const item of cart.items) {
    await assertCartItem(page, item);
  }
  // order summary
  const expectedTotal = formatPrice(
    cart.items.reduce((sum, item) => sum + parsePrice(item.product.price) * item.quantity, 0),
  );
  await expect.soft(page.getByTestId('order-subtotal')).toHaveText(expectedTotal);
  await expect.soft(page.getByTestId('order-shipping')).toHaveText('Free');
  await expect.soft(page.getByTestId('order-total')).toHaveText(expectedTotal);
}

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ''));
}

function formatPrice(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

async function assertCartItem(page: Page, item: CartItemData) {
  const { product, quantity } = item;
  const cartItem = page.getByTestId('cart-items-list').getByTestId(/^cart-item-\d+$/)
    .filter({ has: page.getByTestId(/^cart-item-name-\d+$/).getByText(product.name, { exact: true }) });
  // name
  await expect.soft(cartItem.getByTestId(/^cart-item-name-\d+$/)).toHaveText(product.name);
  // description
  await expect.soft(cartItem.getByTestId(/^cart-item-description-\d+$/)).toHaveText(product.description);
  // unit price
  await expect.soft(cartItem.getByTestId(/^cart-item-price-\d+$/)).toHaveText(product.price);
  // quantity
  await expect.soft(cartItem.getByTestId(/^cart-item-quantity-\d+$/)).toHaveText(String(quantity));
  // subtotal price
  await expect.soft(cartItem.getByTestId(/^cart-item-subtotal-\d+$/)).toHaveText(formatPrice(parsePrice(product.price) * quantity));
}

export async function assertCartIsEmpty(page: Page) {
  await expect.soft(page.getByTestId('cart-empty-heading')).toHaveText('Your cart is empty');
  await expect.soft(page.getByTestId('cart-empty-state').getByText('Add some products to get started.', { exact: true })).toBeVisible();
  await expect.soft(page.getByTestId('continue-shopping-button')).toBeVisible();
}
