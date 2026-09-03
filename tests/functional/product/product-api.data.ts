import {
  fitnessTracker as fitnessTrackerUi,
  laptopBackpack as laptopBackpackUi,
  snoopyOfficeMug as snoopyOfficeMugUi,
} from './product.data';

export interface ProductListResponseBody {
  success: boolean;
  data: ProductData[];
  meta: {
    total: number;
  };
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

// removed dynamic fields
export type ExpectedProduct = Omit<ProductData, 'stock' | 'createdAt' | 'updatedAt'>;

export const fitnessTracker: ExpectedProduct = {
  id: 5,
  name: fitnessTrackerUi.name,
  slug: 'fitness-tracker',
  description: fitnessTrackerUi.description,
  price: 89.99,
  imageKey: 'products/fitness_tracker.jpg',
  imageUrl: '/api/images/products/fitness_tracker.jpg',
  isActive: true,
};

export const laptopBackpack: ExpectedProduct = {
  id: 3,
  name: laptopBackpackUi.name,
  slug: 'laptop-backpack',
  description: laptopBackpackUi.description,
  price: 49.99,
  imageKey: 'products/laptop_backpack.jpg',
  imageUrl: '/api/images/products/laptop_backpack.jpg',
  isActive: true,
};

export const snoopyOfficeMug: ExpectedProduct = {
  id: 22,
  name: snoopyOfficeMugUi.name,
  slug: 'snoopy-office-mug',
  description: snoopyOfficeMugUi.description,
  price: 10,
  imageKey: 'products/1787901873172-56e70ccf.jpg',
  imageUrl: '/api/images/products/1787901873172-56e70ccf.jpg',
  isActive: true,
};
