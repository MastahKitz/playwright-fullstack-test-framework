import { Page } from '@playwright/test';
import { openHomePage } from '../auth.actions';
import * as signupActions from './signup.actions';
import { SignupFormData } from './signup.data';

export async function signUp(page: Page, formData: SignupFormData) {
  await openHomePage(page);
  await signupActions.clickSignUpLink(page);
  await signupActions.enterEmail(page, formData.email);
  await signupActions.enterPhone(page, formData.phone);
  if (formData.username) {
    await signupActions.enterSignupUsername(page, formData.username);
  }
  await signupActions.enterSignupPassword(page, formData.password);
  await signupActions.enterConfirmPassword(page, formData.confirmPassword);
  await signupActions.clickCreateAccountButton(page);
}
