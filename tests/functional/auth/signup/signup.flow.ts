import { Page } from '@playwright/test';
import { openHomePage } from '../auth.actions';
import { logout } from '../auth.flow';
import * as signupActions from './signup.actions';
import { SignupFormData } from './signup.data';

export async function registerNewAccount(page: Page, formData: SignupFormData) {
  await openHomePage(page);
  await signupActions.clickSignUpLink(page);
  await signupActions.enterEmail(page, formData.email);
  await signupActions.enterPhone(page, formData.phone);
  if (formData.username) {
    await signupActions.enterUsername(page, formData.username);
  }
  await signupActions.enterPassword(page, formData.password);
  await signupActions.enterConfirmPassword(page, formData.confirmPassword);
  await signupActions.clickCreateAccountButton(page);
}

// Registering while already authenticated redirects away from /signup, so a test that
// registers twice in one page (e.g. to produce a duplicate email) must log out in between.
export async function registerNewAccountWhileLoggedIn(page: Page, formData: SignupFormData) {
  await logout(page);
  await registerNewAccount(page, formData);
}
