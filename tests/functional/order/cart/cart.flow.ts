import { Page } from '@playwright/test';
import { viewProductDetails } from '../../product/product.flow';
import { ProductData } from '../../product/product.data';
import * as cartActions from './cart.actions';

export async function addProductToCart(page: Page, product: ProductData) {
  await viewProductDetails(page, product);
  await cartActions.clickAddToCartButton(page);
}

export async function viewCartAndIncreaseProductQuantity(page: Page, productName: string) {
  await cartActions.clickNavbarCartLink(page);
  await cartActions.clickIncreaseQuantityButton(page, productName);
}

export async function viewCartAndDecreaseProductQuantity(page: Page, productName: string) {
  await cartActions.clickNavbarCartLink(page);
  await cartActions.clickDecreaseQuantityButton(page, productName);
}

export async function viewCartAndRemoveProduct(page: Page, productName: string) {
  await cartActions.clickNavbarCartLink(page);
  await cartActions.clickRemoveItemButton(page, productName);
}
