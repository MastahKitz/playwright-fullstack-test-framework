import { ProductData } from '../../product/product.data';

export interface CartItemData {
  product: ProductData;
  quantity: number;
}

export interface CartData {
  items: CartItemData[];
}
