import { Page } from '@playwright/test';
import * as authActions from '../auth.actions';
import * as signupActions from './signup.actions';
import { SignupFormData, RegisteredUser } from './signup.data';

async function fillSignupForm(page: Page, data: SignupFormData) {
  await signupActions.enterEmail(page, data.email);
  await signupActions.enterPhone(page, data.phone);
  if (data.username) {
    await signupActions.enterUsername(page, data.username);
  }
  await signupActions.enterPassword(page, data.password);
  await signupActions.enterConfirmPassword(page, data.confirmPassword);
}

// For registrations expected to succeed — waits for the signup response so the
// server-assigned (possibly auto-generated) username is known before returning.
export async function register(page: Page, data: SignupFormData): Promise<RegisteredUser> {
  await authActions.openHomePage(page);
  await signupActions.clickSignUpLink(page);
  await fillSignupForm(page, data);
  const registered = signupActions.waitForRegistration(page);
  await signupActions.clickCreateAccountButton(page);
  const response = await registered;
  return signupActions.captureRegisteredUser(response);
}

// For registrations expected to fail validation — no successful response to wait for.
export async function attemptRegistration(page: Page, data: SignupFormData) {
  await authActions.openHomePage(page);
  await signupActions.clickSignUpLink(page);
  await fillSignupForm(page, data);
  await signupActions.clickCreateAccountButton(page);
}
