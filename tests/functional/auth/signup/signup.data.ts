export interface SignupFormData {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

// Email and username must both be unique per account, so a factory generates a fresh
// value every call instead of a shared fixture — same rationale as product-api.data.ts's
// sampleProductCreateBody. "sample-signup-" / "sample_signup_" stand in for the suite's
// usual "Sample - " leaked-row prefix (rule 16): email and username syntax don't allow
// the space/dash combination the catalog fixtures use.
export function sampleSignupFormData(): SignupFormData {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `sample-signup-${unique}@example.com`,
    phone: `+1555${unique.slice(-7).padStart(7, '0')}`,
    username: `sample_signup_${unique}`,
    password: 'SampleSignup123!',
    confirmPassword: 'SampleSignup123!',
  };
}
