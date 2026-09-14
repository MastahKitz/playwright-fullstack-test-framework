export interface SignupRequestBody {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

// unique per call — a duplicate email/username is rejected by the API, so every
// test that registers a new account needs its own fresh value.
export function sampleSignupRequestBody(): SignupRequestBody {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `sample-signup-${unique}@example.com`,
    phone: '+15555550200',
    password: 'ValidPass123!',
    confirmPassword: 'ValidPass123!',
  };
}

export interface ExpectedSignupUser {
  id: number;
  username: string;
  userType: string;
  email: string;
  phone: string;
}

export interface SignupResponseBody {
  success: boolean;
  data: {
    accessToken: string;
    user: ExpectedSignupUser;
  };
}

export interface SignupErrorResponseBody {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

export interface SignupValidationErrorResponseBody {
  success: boolean;
  error: {
    // shape of each issue varies by rule (too_small carries minimum/type/inclusive/exact,
    // invalid_string carries validation) — the exact expected issues are pinned per
    // scenario in signup-api.assertions.ts.
    issues: Array<Record<string, unknown>>;
    name: string;
  };
}
