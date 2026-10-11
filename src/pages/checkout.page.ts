import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the three checkout steps: your information, overview, complete.
 */
export class CheckoutPage {
  readonly page: Page;
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly errorMessage: Locator;
  readonly itemTotal: Locator;
  readonly completeHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('.title');
    this.firstNameInput = page.locator('#first-name');
    this.lastNameInput = page.locator('#last-name');
    this.postalCodeInput = page.locator('#postal-code');
    this.continueButton = page.locator('#continue');
    this.finishButton = page.locator('#finish');
    this.errorMessage = page.locator('[data-test="error"]');
    this.itemTotal = page.locator('.summary_subtotal_label');
    this.completeHeader = page.locator('.complete-header');
  }

  async expectOnInformationStep(): Promise<void> {
    await expect(this.title).toHaveText('Checkout: Your Information', { timeout: 15_000 });
  }

  async fillInformation(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview(): Promise<void> {
    await this.continueButton.click();
  }

  async expectOnOverviewStep(): Promise<void> {
    await expect(this.title).toHaveText('Checkout: Overview', { timeout: 15_000 });
  }

  /** The "Item total: $x.yz" line as rendered. */
  async itemTotalText(): Promise<string> {
    await expect(this.itemTotal).toBeVisible({ timeout: 15_000 });
    return (await this.itemTotal.innerText()).trim();
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  async errorText(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    return ((await this.errorMessage.textContent()) ?? '').trim();
  }
}
