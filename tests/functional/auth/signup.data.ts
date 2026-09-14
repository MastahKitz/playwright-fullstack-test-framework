export interface SignupFormData {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

// unique per call — a duplicate email/username is rejected by the API, so every
// test that registers a new account needs its own fresh value.
export function sampleSignupFormData(): SignupFormData {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `sample-signup-${unique}@example.com`,
    phone: '+15555550100',
    password: 'ValidPass123!',
    confirmPassword: 'ValidPass123!',
  };
}
