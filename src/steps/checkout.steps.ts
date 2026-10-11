/**
 * Step definitions for features/checkout.feature.
 */

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { ShoppingWorld } from '../support/world';

When('I proceed to checkout', async function (this: ShoppingWorld) {
  await new CartPage(this.page).proceedToCheckout();
  await new CheckoutPage(this.page).expectOnInformationStep();
});

When(
  'I fill in the checkout information with first name {string}, last name {string} and postal code {string}',
  async function (this: ShoppingWorld, firstName: string, lastName: string, postalCode: string) {
    const checkout = new CheckoutPage(this.page);
    await checkout.fillInformation(firstName, lastName, postalCode);
    await checkout.continueToOverview();
  },
);

When('I continue with an empty checkout form', async function (this: ShoppingWorld) {
  await new CheckoutPage(this.page).continueToOverview();
});

Then('the checkout overview should show the item total', async function (this: ShoppingWorld) {
  const checkout = new CheckoutPage(this.page);
  await checkout.expectOnOverviewStep();

  const total = await checkout.itemTotalText();
  const product = this.addedProduct;
  expect(product, 'the scenario must add a product before checkout can total it').toBeDefined();
  this.attachJson('Checkout overview', { itemTotal: total, addedProduct: product });

  // One product was added, so the rendered item total has to equal its price.
  const totalAmount = Number(total.replace(/[^0-9.]/g, ''));
  const productPrice = Number(product!.price.replace(/[^0-9.]/g, ''));
  expect(totalAmount, `item total "${total}" must equal the added product price "${product!.price}"`)
    .toBeCloseTo(productPrice, 2);
});

When('I finish the order', async function (this: ShoppingWorld) {
  await new CheckoutPage(this.page).finish();
});

Then('I should see the order confirmation {string}', async function (this: ShoppingWorld, message: string) {
  await expect(new CheckoutPage(this.page).completeHeader).toHaveText(message, { timeout: 15_000 });
});

Then('I should see the checkout error {string}', async function (this: ShoppingWorld, message: string) {
  const checkout = new CheckoutPage(this.page);
  await expect(checkout.errorMessage).toContainText(message, { timeout: 10_000 });
  this.attachText('Checkout error', await checkout.errorText());
});
