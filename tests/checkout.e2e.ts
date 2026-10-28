import { describe } from "@e2e-dev/web";
import { expect } from "e2e";

import { formatMoney } from "../lib/money";
import { BUYER, CARDS, skip, test } from "./fixtures";
import { fillCard, SHOPIFY_CHECKOUT } from "./shopify";

const FILL_CONTACT_AND_DELIVERY =
  "fill in the contact and delivery form with email {email}, first name {firstName}, last name {lastName}, address {address}, city {city}, state {state}, and ZIP code {zip}";

// Every test starts past the password page. The setup typed a secret, so the agent gets no screenshots here.
// Shopify's checkout isn't ours, so these tests retry.
describe("Shopify checkout", { session: "shopper", skip, retries: 2, timeout: 180_000 }, () => {
  test("card 1 pays on Shopify's checkout and Shopify records the order", async ({
    app,
    screen,
    agent,
    browser,
    orders,
  }) => {
    await app.open("/");
    const title = (await screen.getByTestId("product-title").textContent()) ?? "";
    const price = (await screen.getByTestId("product-price").textContent()) ?? "";
    await screen.getByRole("button", "Buy now").click();
    await expect(browser).toHaveURL(SHOPIFY_CHECKOUT, { timeout: 30_000 });
    const cartToken = orders.track(await browser.url());

    await agent.act(FILL_CONTACT_AND_DELIVERY, { params: BUYER });
    await agent.assert("a shipping method is selected");
    await fillCard(browser, CARDS.approved);

    await agent.act("click Pay now");
    await expect(browser).toHaveURL(/\/thank-you/, { timeout: 60_000 });
    await agent.assert("the page thanks Ada and says the order is confirmed");

    // Shopify finishes the order a moment after the thank-you page.
    await expect.poll(() => orders.find(cartToken), { timeout: 30_000 }).not.toBeNull();
    const order = await orders.find(cartToken);
    expect(order).toMatchObject({ test: true, financialStatus: "PAID", lineItems: [{ title, quantity: 1 }] });
    expect(formatMoney(order!.total)).toBe(price);
  });
});
