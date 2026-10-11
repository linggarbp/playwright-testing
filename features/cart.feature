Feature: Shopping cart
  The cart keeps the products a shopper added, and the badge mirrors its size.

  Background:
    Given I am signed in as the standard user
    And I add the first product to the cart

  @regression
  Scenario: An added product appears in the cart with its price
    When I open the shopping cart
    Then the cart should show the added product with its price

  @regression
  Scenario: Removing the product empties the cart badge
    When I open the shopping cart
    And I remove the added product from the cart
    Then the cart badge should disappear
