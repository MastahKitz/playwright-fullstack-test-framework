import { Page } from '@playwright/test';
import * as authActions from '../auth.actions';
import * as signupActions from './signup.actions';
import { SignupFormData } from './signup.data';

export async function submitSignupForm(page: Page, data: SignupFormData) {
  await authActions.openHomePage(page);
  await signupActions.clickSignUpLink(page);
  await signupActions.enterEmail(page, data.email);
  await signupActions.enterPhone(page, data.phone);
  if (data.username) {
    await signupActions.enterUsername(page, data.username);
  }
  await signupActions.enterPassword(page, data.password);
  await signupActions.enterConfirmPassword(page, data.confirmPassword);
  await signupActions.clickCreateAccountButton(page);
}
