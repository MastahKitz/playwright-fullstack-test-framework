export interface SignupRequestBody {
  email: string;
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

export function sampleSignupRequestBody(): SignupRequestBody {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    email: `qa-signup-api-${unique}@example.com`,
    phone: `+1555${unique.slice(-7).padStart(7, '0')}`,
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
  };
}

export function sampleUsername(): string {
  return `qaSignupApi${Date.now()}${Math.floor(Math.random() * 1000)}`;
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

export type ExpectedSignupUser = SignupResponseBody['data']['user'];

export interface SignupDuplicateErrorResponseBody {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

export interface ValidationIssue {
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
    issues: ValidationIssue[];
    name: string;
  };
}
