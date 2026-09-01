import { test } from '@playwright/test';
import { clickViewCartButton } from '../cart/cart.actions';
import { addProductToCart } from '../cart/cart.flow';
import { fitnessTracker, laptopBackpack } from '../../product/product.data';
import { checkout } from './checkout.flow';
import { standardCheckoutForm } from './checkout.data';
import { assertOrderConfirmation } from './checkout.assertions';
import { openHomePage } from '../../auth/auth.actions';

test.describe('checkout', { tag: '@checkout' }, () => {

  test('validate user can checkout products from the cart', async ({ page }) => {
    await openHomePage(page);
    await addProductToCart(page, fitnessTracker);
    await addProductToCart(page, laptopBackpack);
    await clickViewCartButton(page);
    await checkout(page, standardCheckoutForm);
    await assertOrderConfirmation(page, { items: [{ product: fitnessTracker, quantity: 1 },{ product: laptopBackpack, quantity: 1 }] }, standardCheckoutForm);
  });

});
