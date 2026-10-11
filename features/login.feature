Feature: Login
  The storefront admits valid accounts, refuses locked-out ones and rejects wrong passwords.

  Background:
    Given I am on the login page

  @smoke
  Scenario: A standard user signs in successfully
    When I sign in as the standard user
    Then I should land on the products page

  @regression
  Scenario: A locked-out user is refused with an explanation
    When I sign in as the locked-out user
    Then I should see the login error "Sorry, this user has been locked out."

  @regression
  Scenario: A wrong password is refused
    When I try to sign in with a wrong password
    Then I should see the login error "Username and password do not match"
