import { Page, expect } from '@playwright/test';
import { ProductData, PRODUCT_DETAIL_FEATURES } from './product.data';

export async function assertProductListPage(page: Page, totalCount: number) {
  // header
  await expect.soft(page.getByTestId('catalog-heading')).toHaveText('Product Catalog');
  // sub-header
  // KNOWN-FAILURE(#16): hardcoded TOTAL_PRODUCTS_COUNT (22) is stale vs live qademo catalog (21) — retriage if this changes
  await expect.soft(page.getByTestId('catalog-product-count')).toHaveText(`Browse our complete selection of ${totalCount} products`);
}

export async function assertProductInList(page: Page, product: ProductData) {
  const card = page.getByTestId(/^product-card-/).filter({ has: page.getByTestId(/^product-name-/).getByText(product.name, { exact: true }) });
  // name
  await expect.soft(card.getByTestId(/^product-name-/)).toHaveText(product.name);
  // description
  await expect.soft(card.getByTestId(/^product-description-/)).toHaveText(product.description);
  // price
  await expect.soft(card.getByTestId(/^product-price-/)).toHaveText(product.price);
  // out-of-stock badge + add to cart button (enabled only when in stock)
  const outOfStockBadge = card.getByTestId(/^product-out-of-stock-badge-/);
  const addToCartButton = card.getByTestId(/^product-add-to-cart-\d+$/);
  await expect.soft(addToCartButton).toBeVisible();
  if (product.inStock) {
    await expect.soft(outOfStockBadge).not.toBeVisible();
    await expect.soft(addToCartButton).toBeEnabled();
  } else {
    await expect.soft(outOfStockBadge).toBeVisible();
    await expect.soft(addToCartButton).toBeDisabled();
  }
}

export async function assertProductDetails(page: Page, product: ProductData) {
  // name
  await expect.soft(page.getByTestId('product-detail-name')).toHaveText(product.name);
  // price
  await expect.soft(page.getByTestId('product-detail-price')).toHaveText(product.price);
  // description
  await expect.soft(page.getByTestId('product-detail-description')).toHaveText(product.description);
  // in-stock / out-of-stock badge
  const productPage = page.getByTestId('product-page');
  const inStockBadge = productPage.getByText(/^\d+ in stock$/);
  const outOfStockBadge = productPage.getByText('Out of Stock', { exact: true });
  if (product.inStock) {
    await expect.soft(inStockBadge).toBeVisible();
    await expect.soft(outOfStockBadge).toHaveCount(0);
  } else {
    // "Out of Stock" renders twice — overlaid on the product image and beside the price.
    await expect.soft(outOfStockBadge).toHaveCount(2);
    await expect.soft(outOfStockBadge.first()).toBeVisible();
    await expect.soft(outOfStockBadge.last()).toBeVisible();
    await expect.soft(inStockBadge).toHaveCount(0);
  }
  // features
  const features = page.getByTestId('product-features');
  for (const feature of PRODUCT_DETAIL_FEATURES) {
    await expect.soft(features.getByText(feature, { exact: true })).toBeVisible();
  }
  // add to cart button — enabled only when the product is in stock
  const addToCartButton = page.getByTestId('product-add-to-cart-button');
  await expect.soft(addToCartButton).toBeVisible();
  if (product.inStock) {
    await expect.soft(addToCartButton).toBeEnabled();
  } else {
    await expect.soft(addToCartButton).toBeDisabled();
  }
}
