export interface SignupRequestBody {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
}

// email/phone are unique per call so re-running (or retrying in CI) never collides
// with an account created by a previous run; username is left unset so the default
// fixture doubles as the "no username provided" case.
export function sampleSignupRequestBody(): SignupRequestBody {
  const unique = uniqueSuffix();
  return {
    email: `sample.signup.${unique}@example.com`,
    // last 10 chars (not first) so two calls within the same millisecond-ish window
    // don't share a phone number — Date.now()'s leading digits barely move minute to minute.
    phone: `+1${unique.slice(-10)}`,
    password: 'SampleSignup#1',
    confirmPassword: 'SampleSignup#1',
  };
}

export interface RegisteredApiUser {
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
    user: RegisteredApiUser;
  };
}

export interface ZodIssueTooSmall {
  code: 'too_small';
  minimum: number;
  type: string;
  inclusive: boolean;
  exact: boolean;
  message: string;
  path: string[];
}

export interface ZodIssueInvalidString {
  code: 'invalid_string';
  validation: string;
  message: string;
  path: string[];
}

export interface SignupValidationErrorResponseBody {
  success: boolean;
  error: {
    issues: Array<ZodIssueTooSmall | ZodIssueInvalidString>;
    name: string;
  };
}
