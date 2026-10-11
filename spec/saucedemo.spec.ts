/**
 * Code-first runner — the same flows the Gherkin features cover, driven by Playwright Test.
 *
 * Every step is a `test.step()` so the HTML report reads like the feature files, and the page
 * objects under `src/pages/` are shared with the Cucumber runner.
 *
 *   npx playwright test                 # every spec
 *   npx playwright test --grep @smoke   # the tagged subset
 */

import { CartPage } from '../src/pages/cart.page';
import { CheckoutPage } from '../src/pages/checkout.page';
import { InventoryPage } from '../src/pages/inventory.page';
import { LoginPage } from '../src/pages/login.page';
import { config } from '../src/support/config';
import { attachRunContext, expect, test } from './fixtures';

test.describe('Sauce Demo purchase flow', () => {
  test('@smoke a standard user signs in and sees the products page', async (
    { page, consoleErrors, failedRequests, attachEvidence },
    testInfo,
  ) => {
    await test.step('open the login page', async () => {
      const login = new LoginPage(page);
      await login.goto();
      await expect(login.usernameInput).toBeVisible();
      await attachEvidence('login page', { url: page.url() });
    });

    await test.step('sign in as the standard user', async () => {
      await new LoginPage(page).login(config.standardUser, config.password);
    });

    await test.step('the products page lists the six demo products', async () => {
      await expect(page).toHaveURL(/inventory\.html/, { timeout: config.navigationTimeout });
      const inventory = new InventoryPage(page);
      await inventory.expectLoaded();
      await expect(inventory.items).toHaveCount(6);
      await attachRunContext(
        testInfo,
        { consoleErrors, failedRequests, baseUrl: config.baseUrl },
        page.url(),
      );
      expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    });
  });

  test('sorting by price orders the catalogue from cheapest to most expensive', async (
    { signedInPage, attachEvidence },
  ) => {
    const inventory = new InventoryPage(signedInPage);

    await test.step('sort the catalogue by price ascending', async () => {
      await inventory.sortBy('lohi');
      await attachEvidence('sort order', { sort: 'lohi' });
    });

    await test.step('the rendered prices are in ascending order', async () => {
      const prices = await inventory.productPrices();
      await attachEvidence('rendered prices', prices);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });
  });

  test('adding a product updates the badge and shows it in the cart', async (
    { signedInPage, attachEvidence },
  ) => {
    const inventory = new InventoryPage(signedInPage);
    let added: { name: string; price: string } | undefined;

    await test.step('add the first product to the cart', async () => {
      added = await inventory.addFirstProductToCart();
      await attachEvidence('added product', added);
    });

    await test.step('the badge shows one item', async () => {
      await expect(inventory.cartBadge).toHaveText('1');
    });

    await test.step('the cart lists the product with its price', async () => {
      const cart = new CartPage(signedInPage);
      await cart.open();
      const name = await cart.firstItemName();
      const price = await cart.firstItemPrice();
      await attachEvidence('cart contents', { name, price });
      expect(name).toBe(added!.name);
      expect(price).toBe(added!.price);
    });
  });

  test('@smoke a shopper completes checkout and sees the confirmation', async (
    { signedInPage, attachEvidence },
  ) => {
    const inventory = new InventoryPage(signedInPage);
    const cart = new CartPage(signedInPage);
    const checkout = new CheckoutPage(signedInPage);
    let added: { name: string; price: string } | undefined;

    await test.step('add a product and open the cart', async () => {
      added = await inventory.addFirstProductToCart();
      await cart.open();
      expect(await cart.firstItemName()).toBe(added.name);
    });

    await test.step('fill in the checkout information', async () => {
      await cart.proceedToCheckout();
      await checkout.expectOnInformationStep();
      await checkout.fillInformation('Jane', 'Doe', '12345');
      await checkout.continueToOverview();
    });

    await test.step('the overview shows the item total', async () => {
      await checkout.expectOnOverviewStep();
      const total = await checkout.itemTotalText();
      await attachEvidence('item total', { total });
      expect(total.replace(/[^0-9.]/g, '')).toBe(added!.price.replace(/[^0-9.]/g, ''));
    });

    await test.step('finishing the order shows the confirmation', async () => {
      await checkout.finish();
      await expect(checkout.completeHeader).toHaveText('Thank you for your order!', { timeout: 15_000 });
    });
  });
});
