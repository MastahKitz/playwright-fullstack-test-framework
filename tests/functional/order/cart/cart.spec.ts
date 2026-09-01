import { test, Page } from '@playwright/test';
import { openHomePage } from '../../auth/auth.actions';
import { clickViewCartButton } from './cart.actions';
import { fitnessTracker, laptopBackpack } from '../../product/product.data';
import {
  addProductToCart,
  viewCartAndIncreaseProductQuantity,
  viewCartAndDecreaseProductQuantity,
  viewCartAndRemoveProduct,
} from './cart.flow';
import { assertCartDetails, assertCartIsEmpty } from './cart.assertions';

test.describe.configure({ mode: 'serial' });

test.describe('cart', { tag: '@cart' }, () => {
  // same page used across all tests to maintain cart state
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('validate user can add a product to the cart', async () => {
    await openHomePage(page);
    await addProductToCart(page, fitnessTracker);
    await clickViewCartButton(page);
    await assertCartDetails(page, { items: [{ product: fitnessTracker, quantity: 1 }] });
  });

  test('validate user can add another product to the cart', async () => {
    await openHomePage(page);
    await addProductToCart(page, laptopBackpack);
    await clickViewCartButton(page);
    await assertCartDetails(page, { items: [{ product: fitnessTracker, quantity: 1 },{ product: laptopBackpack, quantity: 1 }] });
  });

  test('validate user can increase product quantity in the cart', async () => {
    await openHomePage(page);
    await viewCartAndIncreaseProductQuantity(page, fitnessTracker.name);
    await assertCartDetails(page, { items: [{ product: fitnessTracker, quantity: 2 },{ product: laptopBackpack, quantity: 1 }] });
  });

  test('validate user can decrease product quantity in the cart', async () => {
    await openHomePage(page);
    await viewCartAndDecreaseProductQuantity(page, fitnessTracker.name);
    await assertCartDetails(page, { items: [{ product: fitnessTracker, quantity: 1 },{ product: laptopBackpack, quantity: 1 }] });
  });

  test('validate user can remove a product from the cart', async () => {
    await openHomePage(page);
    await viewCartAndRemoveProduct(page, fitnessTracker.name);
    await assertCartDetails(page, { items: [{ product: laptopBackpack, quantity: 1 }] });
  });

  test('validate user can remove another product from the cart', async () => {
    await openHomePage(page);
    await viewCartAndRemoveProduct(page, laptopBackpack.name);
    await assertCartIsEmpty(page);
  });
});
