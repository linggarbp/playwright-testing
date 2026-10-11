Feature: Product inventory
  The products page lists the catalogue and lets a shopper sort it.

  Background:
    Given I am signed in as the standard user

  @smoke
  Scenario: The products page lists all six products
    Then the products page should list 6 products

  @regression
  Scenario: Sorting by name from Z to A reorders the products
    When I sort the products by name in descending order
    Then the product names should be in descending alphabetical order

  @regression
  Scenario: Sorting by price from low to high reorders the products
    When I sort the products by price in ascending order
    Then the product prices should be in ascending numeric order

  @regression
  Scenario: Adding the first product updates the cart badge
    When I add the first product to the cart
    Then the cart badge should show 1
