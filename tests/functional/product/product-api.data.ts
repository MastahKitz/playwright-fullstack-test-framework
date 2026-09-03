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
