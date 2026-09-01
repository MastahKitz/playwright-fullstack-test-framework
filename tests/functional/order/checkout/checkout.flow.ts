import { Page } from '@playwright/test';
import * as checkoutActions from './checkout.actions';
import { CheckoutFormData } from './checkout.data';

export async function checkout(page: Page, form: CheckoutFormData) {
  await checkoutActions.clickProceedToCheckoutButton(page);
  await checkoutActions.fillShippingInformation(page, form.shippingInfo);
  await checkoutActions.fillPaymentInformation(page, form.paymentInfo);
  await checkoutActions.clickPlaceOrderButton(page);
}
