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
