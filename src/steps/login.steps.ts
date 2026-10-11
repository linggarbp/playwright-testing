/**
 * Step definitions for features/login.feature.
 *
 * Steps stay thin: they call a page object and assert with Playwright's web-first assertions.
 */

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';
import { config } from '../support/config';
import { ShoppingWorld } from '../support/world';

Given('I am on the login page', async function (this: ShoppingWorld) {
  await new LoginPage(this.page).goto();
  this.attachJson('Login page', { url: this.page.url() });
});

When('I sign in as the standard user', async function (this: ShoppingWorld) {
  await new LoginPage(this.page).login(config.standardUser, config.password);
});

When('I sign in as the locked-out user', async function (this: ShoppingWorld) {
  await new LoginPage(this.page).login(config.lockedOutUser, config.password);
});

When('I try to sign in with a wrong password', async function (this: ShoppingWorld) {
  // Derived from the configured password so the attempt is guaranteed to mismatch.
  await new LoginPage(this.page).login(config.standardUser, `${config.password}-invalid`);
});

Then('I should land on the products page', async function (this: ShoppingWorld) {
  await expect(this.page).toHaveURL(/inventory\.html/, { timeout: config.navigationTimeout });
  await new InventoryPage(this.page).expectLoaded();
  this.attachJson('Products page', { url: this.page.url() });
});

Then('I should see the login error {string}', async function (this: ShoppingWorld, message: string) {
  const login = new LoginPage(this.page);
  await expect(login.errorMessage).toContainText(message, { timeout: 10_000 });
  this.attachText('Login error', await login.errorText());
});
