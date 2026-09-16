export interface SignupFormData {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

export function sampleSignupFormData(): SignupFormData {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    email: `qa-signup-${unique}@example.com`,
    phone: `+1555${unique.slice(-7).padStart(7, '0')}`,
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
  };
}

export function sampleUsername(): string {
  return `qaSignup${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
