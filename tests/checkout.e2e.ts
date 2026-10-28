import { describe, type Browser } from "@e2e-dev/web";
import { expect, unique, type TestFixtures } from "e2e";

import { formatMoney } from "../lib/money";
import { BUYER, CARDS, DISCOUNT, skip, test, type Orders } from "./fixtures";
import { fillCard, SHOPIFY_CHECKOUT } from "./shopify";

const FILL_CONTACT_AND_ADDRESS =
  "fill in the contact and address fields with email {email}, first name {firstName}, last name {lastName}, address {address}, city {city}, state {state}, and ZIP code {zip}";

type CheckoutFixtures = Pick<TestFixtures, "screen" | "agent"> & { browser: Browser; orders: Orders };

// From our Buy now button to Shopify's checkout, filled in and ready to pay. Returns the cart token.
async function fillCheckout({ screen, agent, browser, orders }: CheckoutFixtures, card: string): Promise<string> {
  await screen.getByRole("button", "Buy now").click();
  await expect(browser).toHaveURL(SHOPIFY_CHECKOUT, { timeout: 30_000 });
  const cartToken = orders.track(await browser.url());

  await agent.act(FILL_CONTACT_AND_ADDRESS, { params: BUYER });
  // The address is for delivery, or for billing when the product doesn't ship.
  await agent.assert("the email and the address are filled in");
  await fillCard(browser, card);
  return cartToken;
}

const AMOUNT = /[\d,]+\.\d{2}/;

function amountOf(price: string): number {
  return Number(price.match(AMOUNT)?.[0].replaceAll(",", ""));
}

// An amount in the card's own format: "$60.00" and 5 give "$5.00".
function asOnCard(price: string, amount: number): string {
  return price.replace(AMOUNT, amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

const FAILED_PAYMENT_CONTEXT =
  "The card is a Shopify test card that always fails, so a payment error after Pay now is the expected outcome, not a failure.";

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
    const cartToken = await fillCheckout({ screen, agent, browser, orders }, CARDS.approved);

    await agent.act("click Pay now");
    await expect(browser).toHaveURL(/\/thank-you/, { timeout: 60_000 });
    await agent.assert("the page thanks Ada and says the order is confirmed");

    // Shopify finishes the order a moment after the thank-you page.
    await expect.poll(() => orders.find(cartToken), { timeout: 30_000 }).not.toBeNull();
    const order = await orders.find(cartToken);
    expect(order).toMatchObject({ test: true, financialStatus: "PAID", lineItems: [{ title, quantity: 1 }] });
    // Shipping depends on the store's rates, so the subtotal is what must match the card.
    expect(formatMoney(order!.subtotal)).toBe(price);
  });

  // Shopify shows the same message for a declined card and a gateway failure.
  for (const [title, card] of [
    ["card 2 is declined, and Shopify records no order", CARDS.declined],
    ["card 3 fails at the gateway, and Shopify records no order", CARDS.gatewayFailure],
  ]) {
    test(title, { agentContext: FAILED_PAYMENT_CONTEXT }, async ({ app, screen, agent, browser, orders }) => {
      await app.open("/");
      const cartToken = await fillCheckout({ screen, agent, browser, orders }, card);

      await agent.act("click Pay now");
      await agent.waitFor("the checkout says there was an issue processing the payment");
      await expect(browser).not.toHaveURL(/\/thank-you/);
      expect(await orders.find(cartToken)).toBeNull();
    });
  }

  test("a discount code lowers the total, and Shopify records it", async ({
    app,
    screen,
    agent,
    browser,
    orders,
    discounts,
  }) => {
    const code = await discounts.create();
    await app.open("/");
    const price = (await screen.getByTestId("product-price").textContent()) ?? "";
    const discount = asOnCard(price, Number(DISCOUNT));
    const subtotal = asOnCard(price, amountOf(price) - Number(DISCOUNT));
    const cartToken = await fillCheckout({ screen, agent, browser, orders }, CARDS.approved);

    // The code is new every run, so unique() keeps the replay cache working.
    await agent.act("apply the discount code {code}", { params: { code: unique(code) } });
    await agent.assert(`the order summary shows the discount code ${code} taking ${discount} off`);

    await agent.act("click Pay now");
    await expect(browser).toHaveURL(/\/thank-you/, { timeout: 60_000 });

    await expect.poll(() => orders.find(cartToken), { timeout: 30_000 }).not.toBeNull();
    const order = await orders.find(cartToken);
    expect(order).toMatchObject({ test: true, financialStatus: "PAID", discountCodes: [code] });
    expect(Number(order!.totalDiscounts)).toBe(Number(DISCOUNT));
    expect(formatMoney(order!.subtotal)).toBe(subtotal);
  });
});
