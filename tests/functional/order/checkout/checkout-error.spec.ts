import { test, Page } from '@playwright/test';
import { openHomePage } from '../../auth/auth.actions';
import { clickNavbarCartLink } from '../cart/cart.actions';
import { addProductToCart } from '../cart/cart.flow';
import { fitnessTracker } from '../../product/product.data';
import { checkout } from './checkout.flow';
import { standardCheckoutForm } from './checkout.data';
import {
  assertFirstNameRequiredError,
  assertLastNameRequiredError,
  assertAddressRequiredError,
  assertCardNumberRequiredError,
  assertExpiryRequiredError,
  assertCvvRequiredError,
  assertNameOnCardRequiredError,
} from './checkout.assertions';

test.describe.configure({ mode: 'serial' });

test.describe('checkout - errors', { tag: '@checkout' }, () => {
  // same page used across all tests to maintain cart state
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await openHomePage(page);
    await addProductToCart(page, fitnessTracker);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('validate user cannot checkout with a blank first name', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, shippingInfo: { ...standardCheckoutForm.shippingInfo, firstName: '' } });
    await assertFirstNameRequiredError(page);
  });

  test('validate user cannot checkout with a blank last name', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, shippingInfo: { ...standardCheckoutForm.shippingInfo, lastName: '' } });
    await assertLastNameRequiredError(page);
  });

  test('validate user cannot checkout with a blank shipping address', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, shippingInfo: { ...standardCheckoutForm.shippingInfo, address: '' } });
    await assertAddressRequiredError(page);
  });

  test('validate user cannot checkout with a blank card number', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, paymentInfo: { ...standardCheckoutForm.paymentInfo, cardNumber: '' } });
    await assertCardNumberRequiredError(page);
  });

  test('validate user cannot checkout with a blank card expiry', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, paymentInfo: { ...standardCheckoutForm.paymentInfo, expiry: '' } });
    await assertExpiryRequiredError(page);
  });

  test('validate user cannot checkout with a blank card CVV', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, paymentInfo: { ...standardCheckoutForm.paymentInfo, cvv: '' } });
    await assertCvvRequiredError(page);
  });

  test('validate user cannot checkout with a blank name on card', async () => {
    await clickNavbarCartLink(page);
    await checkout(page, { ...standardCheckoutForm, paymentInfo: { ...standardCheckoutForm.paymentInfo, nameOnCard: '' } });
    await assertNameOnCardRequiredError(page);
  });
});
