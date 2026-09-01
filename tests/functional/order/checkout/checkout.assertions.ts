import { Page, expect } from '@playwright/test';
import { CartData } from '../cart/cart.data';
import { CheckoutFormData } from './checkout.data';

export async function assertOrderConfirmation(page: Page, cart: CartData, form: CheckoutFormData) {
  const confirmation = page.getByTestId('order-confirmation-page');
  const { shippingInfo, paymentInfo } = form;

  // header
  await expect.soft(page.getByTestId('order-confirmation-heading')).toHaveText('Order Confirmed!');
  await expect.soft(page.getByTestId('order-success-header').getByText("Thank you for your order. We'll send you updates soon.", { exact: true })).toBeVisible();
  await expect.soft(page.getByTestId('order-confirmation-number')).toHaveText(/^Order #\d+$/);

  // order status
  await expect.soft(confirmation.getByText('Order Status', { exact: true })).toBeVisible();
  await expect.soft(page.getByTestId('order-confirmation-date')).toHaveText(todayLongDate());
  await expect.soft(confirmation.getByText('Pending', { exact: true })).toBeVisible();

  // shipping info
  await expect.soft(page.getByTestId('order-shipping-name')).toHaveText(`${shippingInfo.firstName} ${shippingInfo.lastName}`);
  await expect.soft(page.getByTestId('order-shipping-address')).toHaveText(shippingInfo.address);

  // order items
  for (const { product, quantity } of cart.items) {
    const row = confirmation.getByText(product.name, { exact: true }).locator('xpath=../..');
    await expect.soft(row.getByText(`${product.price} × ${quantity}`, { exact: true })).toBeVisible();
    await expect.soft(row.getByText(formatPrice(parsePrice(product.price) * quantity), { exact: true })).toBeVisible();
  }

  // total + payment
  const expectedTotal = formatPrice(
    cart.items.reduce((sum, item) => sum + parsePrice(item.product.price) * item.quantity, 0),
  );
  await expect.soft(confirmation.getByText(expectedTotal, { exact: true })).toBeVisible();
  const lastFour = paymentInfo.cardNumber.replace(/\D/g, '').slice(-4);
  await expect.soft(confirmation.getByText(`Paid with card ending in ${lastFour}`, { exact: true })).toBeVisible();
}

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ''));
}

function formatPrice(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function todayLongDate(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

