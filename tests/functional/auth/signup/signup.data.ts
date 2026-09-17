export interface SignupFormData {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

export function sampleSignupFormData(): SignupFormData {
  return {
    email: `sample-signup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    phone: '+15555550100',
    password: 'SampleQA123!',
    confirmPassword: 'SampleQA123!',
  };
}
