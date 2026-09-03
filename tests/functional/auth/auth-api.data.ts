import { credentials } from './auth.data';

export interface LoginRequestBody {
  username: string;
  password: string;
}

export const standardUserLoginBody: LoginRequestBody = {
  username: credentials.standardUser.username,
  password: credentials.standardUser.password,
};

export const adminUserLoginBody: LoginRequestBody = {
  username: credentials.adminUser.username,
  password: credentials.adminUser.password,
};

export const lockedUserLoginBody: LoginRequestBody = {
  username: credentials.lockedUser.username,
  password: credentials.lockedUser.password,
};

export interface LoginResponseBody {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: number;
      username: string;
      userType: string;
    };
  };
}

export type ExpectedLoginUser = LoginResponseBody['data']['user'];

export interface LogoutResponseBody {
  success: boolean;
  data: {
    message: string;
  };
}

export interface AuthErrorResponseBody {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

export interface ValidationErrorResponseBody {
  success: boolean;
  error: {
    issues: Array<{
      code: string;
      minimum: number;
      type: string;
      inclusive: boolean;
      exact: boolean;
      message: string;
      path: string[];
    }>;
    name: string;
  };
}
