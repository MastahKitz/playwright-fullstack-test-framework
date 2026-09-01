import { Page } from '@playwright/test';
import { openHomePage } from '../auth/auth.actions';
import * as productActions from './product.actions';
import { ProductData } from './product.data';

export async function viewProductList(page: Page) {
  await openHomePage(page);
  await productActions.clickBrowseProductsButton(page);
}

export async function viewProductDetails(page: Page, product: ProductData) {
  await viewProductList(page);
  await productActions.clickProductCard(page, product.name);
}
