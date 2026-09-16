import { SignupFormData, sampleSignupFormData } from './signup.data';

// The UI form and the signup request body are the same shape (email, phone, optional
// username, password, confirmPassword) — no reshaping needed, unlike product's UI
// string price vs. API numeric price.
export type SignupRequestBody = SignupFormData;
export const sampleSignupRequestBody = sampleSignupFormData;

export interface SignupResponseBody {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: number;
      username: string;
      userType: string;
      email: string;
      phone: string;
    };
  };
}

export type ExpectedSignupUser = SignupResponseBody['data']['user'];

// Covers every shape the signup endpoint's Zod issues take: a `too_small` issue (min
// length) never carries `validation`, an `invalid_string` issue (email/regex format)
// never carries `minimum`/`inclusive`/`exact` — auth-api.data.ts's ValidationErrorResponseBody
// only models the former.
export interface SignupValidationIssue {
  code: string;
  message: string;
  path: string[];
  validation?: string;
  minimum?: number;
  type?: string;
  inclusive?: boolean;
  exact?: boolean;
}

export interface SignupValidationErrorResponseBody {
  success: boolean;
  error: {
    issues: SignupValidationIssue[];
    name: string;
  };
}
