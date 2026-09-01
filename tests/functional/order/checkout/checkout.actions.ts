import { Page } from '@playwright/test';
import { CheckoutFormData } from './checkout.data';

export async function clickProceedToCheckoutButton(page: Page) {
  await page.getByTestId('proceed-to-checkout-button').click();
  await page.getByTestId('checkout-page').waitFor();
}

export async function fillShippingInformation(page: Page, shipping: CheckoutFormData['shippingInfo']) {
  await page.getByTestId('checkout-first-name').fill(shipping.firstName);
  await page.getByTestId('checkout-last-name').fill(shipping.lastName);
  await page.getByTestId('checkout-address').fill(shipping.address);
}

export async function fillPaymentInformation(page: Page, payment: CheckoutFormData['paymentInfo']) {
  await page.getByTestId('checkout-card-number').fill(payment.cardNumber);
  await page.getByTestId('checkout-expiry').fill(payment.expiry);
  await page.getByTestId('checkout-cvv').fill(payment.cvv);
  await page.getByTestId('checkout-cardholder-name').fill(payment.nameOnCard);
}

export async function clickPlaceOrderButton(page: Page) {
  await page.getByTestId('place-order-button').click();
  await page.getByTestId('order-confirmation-page').waitFor({ timeout: 15_000 });
}
