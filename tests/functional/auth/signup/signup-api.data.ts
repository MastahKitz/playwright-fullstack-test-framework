import { SignupFormData } from './signup.data';

export type SignupRequestBody = SignupFormData;

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

export interface SignupErrorResponseBody {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

// Zod's issue shape varies by validation kind — `too_small` issues carry
// minimum/type/inclusive/exact, `invalid_string` issues carry `validation`
// instead. Both can appear in the same `issues` array (e.g. an invalid phone
// fails both the length and the format check), so every field is optional.
export interface SignupValidationIssue {
  code: string;
  message: string;
  path: string[];
  minimum?: number;
  type?: string;
  inclusive?: boolean;
  exact?: boolean;
  validation?: string;
}

export interface SignupValidationErrorResponseBody {
  success: boolean;
  error: {
    issues: SignupValidationIssue[];
    name: string;
  };
}
