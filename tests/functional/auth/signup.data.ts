export interface SignupFormData {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

export function sampleSignupFormData(): SignupFormData {
  const suffix = Math.random().toString(36).slice(2, 8);
  const password = 'SecurePass123!';
  return {
    email: `qa-test-gen-signup-${Date.now()}-${suffix}@example.com`,
    phone: `+1555${String(Date.now()).slice(-7)}`,
    username: `qagensignup${suffix}`,
    password,
    confirmPassword: password,
  };
}
