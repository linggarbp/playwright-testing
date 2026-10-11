import { expect, Locator, Page } from '@playwright/test';

/** The values `<select class="product_sort_container">` accepts on the products page. */
export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export interface ProductSnapshot {
  name: string;
  price: string;
}

/**
 * Page object for the products page.
 */
export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly sortSelect: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('.title');
    this.items = page.locator('.inventory_item');
    this.itemNames = page.locator('.inventory_item_name');
    this.itemPrices = page.locator('.inventory_item_price');
    this.sortSelect = page.locator('.product_sort_container');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.cartLink = page.locator('.shopping_cart_link');
  }

  /** Navigate straight to the catalogue (the Cucumber context supplies `baseURL`). */
  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toHaveText('Products', { timeout: 15_000 });
  }

  /** The rendered product names, in DOM order. */
  async productNames(): Promise<string[]> {
    return (await this.itemNames.allTextContents()).map((name) => name.trim());
  }

  /** The rendered prices as numbers, in DOM order. */
  async productPrices(): Promise<number[]> {
    const raw = await this.itemPrices.allTextContents();
    return raw.map((price) => Number(price.replace(/[^0-9.]/g, '')));
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sortSelect.selectOption(option);
  }

  /** Add the first catalogue entry to the cart and return what was added. */
  async addFirstProductToCart(): Promise<ProductSnapshot> {
    const first = this.items.first();
    const name = (await first.locator('.inventory_item_name').innerText()).trim();
    const price = (await first.locator('.inventory_item_price').innerText()).trim();
    await first.getByRole('button', { name: /add to cart/i }).click();
    return { name, price };
  }
}
