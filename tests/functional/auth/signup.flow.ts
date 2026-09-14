import { Page } from '@playwright/test';
import * as signupActions from './signup.actions';
import { SignupFormData } from './signup.data';

export async function register(page: Page, form: SignupFormData) {
  await signupActions.openSignupPage(page);
  await signupActions.enterEmail(page, form.email);
  await signupActions.enterPhone(page, form.phone);
  if (form.username) {
    await signupActions.enterUsername(page, form.username);
  }
  await signupActions.enterPassword(page, form.password);
  await signupActions.enterConfirmPassword(page, form.confirmPassword);
  await signupActions.clickCreateAccountButton(page);
}
