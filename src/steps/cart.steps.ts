/**
 * Step definitions for features/cart.feature.
 */

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CartPage } from '../pages/cart.page';
import { InventoryPage } from '../pages/inventory.page';
import { ShoppingWorld } from '../support/world';

When('I open the shopping cart', async function (this: ShoppingWorld) {
  await new CartPage(this.page).open();
});

Then('the cart should show the added product with its price', async function (this: ShoppingWorld) {
  const product = this.addedProduct;
  expect(product, 'the scenario must add a product before it can be checked in the cart').toBeDefined();

  const cart = new CartPage(this.page);
  const name = await cart.firstItemName();
  const price = await cart.firstItemPrice();
  this.attachJson('Cart contents', { name, price });

  expect(name, 'cart product name').toBe(product!.name);
  expect(price, 'cart product price').toBe(product!.price);
});

When('I remove the added product from the cart', async function (this: ShoppingWorld) {
  await new CartPage(this.page).removeFirstItem();
});

Then('the cart badge should disappear', async function (this: ShoppingWorld) {
  await expect(new InventoryPage(this.page).cartBadge).toHaveCount(0, { timeout: 10_000 });
});
