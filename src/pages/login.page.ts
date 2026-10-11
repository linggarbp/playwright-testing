import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the Sauce Demo login form.
 *
 * Locator getters + action methods only; assertions about error copy belong to the steps/specs.
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#user-name');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  /** Open the storefront root (the login form) and wait for it to be usable. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.usernameInput).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async errorText(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    return ((await this.errorMessage.textContent()) ?? '').trim();
  }
}
