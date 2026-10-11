/**
 * Step definitions for features/inventory.feature (and the shared sign-in setup the cart and
 * checkout features reuse from their Backgrounds).
 */

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';
import { config } from '../support/config';
import { ShoppingWorld } from '../support/world';

Given('I am signed in as the standard user', async function (this: ShoppingWorld) {
  const login = new LoginPage(this.page);
  await login.goto();
  await login.login(config.standardUser, config.password);
  await expect(this.page).toHaveURL(/inventory\.html/, { timeout: config.navigationTimeout });
  await new InventoryPage(this.page).expectLoaded();
});

Then('the products page should list {int} products', async function (this: ShoppingWorld, expected: number) {
  const names = await new InventoryPage(this.page).productNames();
  this.attachJson('Listed products', names);
  expect(names, `expected ${expected} products, got: ${names.join(', ')}`).toHaveLength(expected);
});

When('I sort the products by name in descending order', async function (this: ShoppingWorld) {
  await new InventoryPage(this.page).sortBy('za');
});

Then('the product names should be in descending alphabetical order', async function (this: ShoppingWorld) {
  const names = await new InventoryPage(this.page).productNames();
  const expected = [...names].sort((a, b) => b.localeCompare(a));
  this.attachJson('Rendered product names', names);
  expect(names, `names were not sorted Z to A: ${names.join(', ')}`).toEqual(expected);
});

When('I sort the products by price in ascending order', async function (this: ShoppingWorld) {
  await new InventoryPage(this.page).sortBy('lohi');
});

Then('the product prices should be in ascending numeric order', async function (this: ShoppingWorld) {
  const prices = await new InventoryPage(this.page).productPrices();
  const expected = [...prices].sort((a, b) => a - b);
  this.attachJson('Rendered product prices', prices);
  expect(prices, `prices were not sorted low to high: ${prices.join(', ')}`).toEqual(expected);
});

When('I add the first product to the cart', async function (this: ShoppingWorld) {
  this.addedProduct = await new InventoryPage(this.page).addFirstProductToCart();
  this.attachJson('Added product', this.addedProduct);
});

Then('the cart badge should show {int}', async function (this: ShoppingWorld, count: number) {
  await expect(new InventoryPage(this.page).cartBadge).toHaveText(String(count), { timeout: 10_000 });
});
