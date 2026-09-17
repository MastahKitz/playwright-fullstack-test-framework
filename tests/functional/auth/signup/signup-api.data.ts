import { SignupFormData } from './signup.data';

export type SignupRequestBody = SignupFormData;

export function sampleSignupRequestBody(): SignupRequestBody {
  return {
    email: `sample-signup-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    phone: '+15555550100',
    password: 'SampleQA123!',
    confirmPassword: 'SampleQA123!',
  };
}

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

export type ExpectedSignupUser = Pick<SignupResponseBody['data']['user'], 'email' | 'phone'> &
  Partial<Pick<SignupResponseBody['data']['user'], 'username'>>;

export interface SignupErrorResponseBody {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

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
