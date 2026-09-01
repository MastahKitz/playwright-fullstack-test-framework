export interface CheckoutFormData {
  shippingInfo: {
    firstName: string;
    lastName: string;
    address: string;
  };
  paymentInfo: {
    cardNumber: string;
    expiry: string;
    cvv: string;
    nameOnCard: string;
  };
}

export const standardCheckoutForm: CheckoutFormData = {
  shippingInfo: {
    firstName: 'Test',
    lastName: 'Buyer',
    address: '123 QA Street, Test City, 12345',
  },
  paymentInfo: {
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/30',
    cvv: '123',
    nameOnCard: 'Test Buyer',
  },
};
