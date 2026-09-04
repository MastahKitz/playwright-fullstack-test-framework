import {
  fitnessTracker as fitnessTrackerUi,
  laptopBackpack as laptopBackpackUi,
  snoopyOfficeMug as snoopyOfficeMugUi,
} from './product.data';
import { parsePrice } from '../utils/data.utils';

export interface ProductListResponseBody {
  success: boolean;
  data: ProductData[];
  meta: {
    total: number;
  };
}

export interface ProductDetailsResponseBody {
  success: boolean;
  data: ProductData;
}

export interface ProductErrorResponseBody {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

export interface ProductCreateRequestBody {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageKey: string;
}

export interface ProductCreateResponseBody {
  success: boolean;
  data: {
    id: number;
    slug: string;
  };
}

export interface ProductDeleteResponseBody {
  success: boolean;
  data: {
    id: number;
    deleted: boolean;
  };
}

// parsed from product create response, chained into the get / delete calls
export interface CreatedProductRefs {
  id: number;
  slug: string;
}

export interface ProductData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  imageKey: string | null;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// removed dynamic fields and added inStock for asserting in-stock vs out-of-stock without relying on the exact stock count
export type ExpectedProduct = Omit<ProductData, 'stock' | 'createdAt' | 'updatedAt'> & {
  inStock: boolean;
};

export const fitnessTracker: ExpectedProduct = {
  id: 5,
  name: fitnessTrackerUi.name,
  slug: 'fitness-tracker',
  description: fitnessTrackerUi.description,
  price: parsePrice(fitnessTrackerUi.price),
  imageKey: 'products/fitness_tracker.jpg',
  imageUrl: '/api/images/products/fitness_tracker.jpg',
  isActive: true,
  inStock: fitnessTrackerUi.inStock,
};

export const laptopBackpack: ExpectedProduct = {
  id: 3,
  name: laptopBackpackUi.name,
  slug: 'laptop-backpack',
  description: laptopBackpackUi.description,
  price: parsePrice(laptopBackpackUi.price),
  imageKey: 'products/laptop_backpack.jpg',
  imageUrl: '/api/images/products/laptop_backpack.jpg',
  isActive: true,
  inStock: laptopBackpackUi.inStock,
};

export const snoopyOfficeMug: ExpectedProduct = {
  id: 22,
  name: snoopyOfficeMugUi.name,
  slug: 'snoopy-office-mug',
  description: snoopyOfficeMugUi.description,
  price: parsePrice(snoopyOfficeMugUi.price),
  imageKey: 'products/1787901873172-56e70ccf.jpg',
  imageUrl: '/api/images/products/1787901873172-56e70ccf.jpg',
  isActive: true,
  inStock: snoopyOfficeMugUi.inStock,
};

export function sampleProductCreateBody(): ProductCreateRequestBody {
  return {
    name: `Sample - ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: 'Automation -  Sample Desc',
    price: 19.99,
    stock: 150,
    imageKey: 'products/fitness_tracker.jpg',
  };
}

// How the create endpoint derives a product slug from its name: lowercased, every
// run of non-alphanumeric characters collapsed to one hyphen, ends trimmed.
export function expectedSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function expectedProduct(
  body: ProductCreateRequestBody,
  refs: CreatedProductRefs,
): ExpectedProduct {
  return {
    id: refs.id,
    name: body.name,
    slug: refs.slug,
    description: body.description,
    price: body.price,
    imageKey: body.imageKey,
    imageUrl: `/api/images/${body.imageKey}`,
    isActive: true,
    inStock: body.stock > 0,
  };
}
