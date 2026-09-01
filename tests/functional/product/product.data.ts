export const TOTAL_PRODUCTS_COUNT = 22;

// Static, identical on every product detail page — not per-product data.
export const PRODUCT_DETAIL_FEATURES = [
  'Free packaging and handling',
  'Fast shipping available',
];

export interface ProductData {
  name: string;
  price: string;
  description: string;
  inStock: boolean;
}

export const fitnessTracker: ProductData = {
  name: 'Fitness Tracker',
  price: '$89.99',
  description: 'Water-resistant fitness tracker with sleep monitoring and smartphone notifications.',
  inStock: true,
};

export const laptopBackpack: ProductData = {
  name: 'Laptop Backpack',
  price: '$49.99',
  description: 'Durable laptop backpack with multiple compartments and USB charging port.',
  inStock: true,
};

export const snoopyOfficeMug: ProductData = {
  name: 'Snoopy Office Mug',
  price: '$10.00',
  description: 'Start your day with a smile with our charming Snoopy design office mug! Perfect for coffee, tea, or any beverage of your choice, this delightful mug features the beloved Peanuts character in playful poses that bring a touch of whimsy to your workspace. Made from high-quality ceramic, it’s both microwave and dishwasher safe, ensuring convenience for your busy schedule. Whether you\'re at home or in the office, let Snoopy inspire your creativity and brighten your day with every sip!',
  inStock: false,
};
