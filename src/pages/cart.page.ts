import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the shopping cart.
 */
export class CartPage {
  readonly page: Page;
  readonly title: Locator;
  readonly cartItems: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly cartBadge: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('.title');
    this.cartItems = page.locator('.cart_item');
    this.itemNames = page.locator('.cart_item .inventory_item_name');
    this.itemPrices = page.locator('.cart_item .inventory_item_price');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/cart.html');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toHaveText('Your Cart', { timeout: 15_000 });
  }

  async firstItemName(): Promise<string> {
    return (await this.itemNames.first().innerText()).trim();
  }

  async firstItemPrice(): Promise<string> {
    return (await this.itemPrices.first().innerText()).trim();
  }

  async removeFirstItem(): Promise<void> {
    await this.cartItems.first().getByRole('button', { name: /remove/i }).click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
