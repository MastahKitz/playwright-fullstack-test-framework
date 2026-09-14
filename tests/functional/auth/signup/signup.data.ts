export interface SignupFormData {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

// Fresh email per call — the server persists every registered account permanently
// with no delete endpoint, so a shared fixture would collide across runs/retries.
export function sampleSignupFormData(): SignupFormData {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `sample-qa-signup-${suffix}@example.com`,
    phone: '+15551234567',
    password: 'SampleP@ssw0rd1',
    confirmPassword: 'SampleP@ssw0rd1',
  };
}
