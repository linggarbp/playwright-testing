Feature: Checkout
  A shopper checks out with valid information, and the form demands a first name.

  Background:
    Given I am signed in as the standard user
    And I add the first product to the cart

  @smoke
  Scenario: A shopper completes a purchase
    When I open the shopping cart
    And I proceed to checkout
    And I fill in the checkout information with first name "Jane", last name "Doe" and postal code "12345"
    Then the checkout overview should show the item total
    When I finish the order
    Then I should see the order confirmation "Thank you for your order!"

  @regression
  Scenario: Checkout requires a first name
    When I open the shopping cart
    And I proceed to checkout
    And I continue with an empty checkout form
    Then I should see the checkout error "Error: First Name is required"
