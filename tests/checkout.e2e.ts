import { describe, type Browser } from "@e2e-dev/web";
import { expect, unique, type TestFixtures } from "e2e";

import { DISCOUNT, skip, test, type Orders } from "./fixtures";
import { SHOPIFY_CHECKOUT, type Order } from "./shopify";

const BUYER = {
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  address: "350 5th Ave",
  city: "New York",
  state: "New York",
  zip: "10118",
};

// Shopify's Test payment gateway decides the outcome by the card number.
const CARDS = { approved: "1", declined: "2", gatewayFailure: "3" };

const FILL_CONTACT_AND_ADDRESS =
  "fill in the contact and address fields with email {email}, first name {firstName}, last name {lastName}, address {address}, city {city}, state {state}, and ZIP code {zip}";

const FAILED_PAYMENT_CONTEXT =
  "The card is a Shopify test card that always fails, so a payment error after Pay now is the expected outcome, not a failure.";

type CheckoutFixtures = Pick<TestFixtures, "screen" | "agent"> & { browser: Browser; orders: Orders };

// Shopify's card fields are iframes from another site, which the agent can't see. Each frame also holds hidden
// decoy inputs, so the visible one is found by role.
async function fillCard(browser: Browser, number: string): Promise<void> {
  const field = (name: string) => browser.frameLocator(`iframe[title="${name}"]`).getByRole("textbox", name);
  await field("Card number").fill(number);
  await field("Expiration date (MM / YY)").fill("12 / 34");
  await field("Security code").fill("111");
  await field("Name on card").fill(`${BUYER.firstName} ${BUYER.lastName}`);
}

// From our Buy now button to Shopify's checkout, ready to pay. Returns the cart token.
async function fillCheckout({ screen, agent, browser, orders }: CheckoutFixtures, card: string): Promise<string> {
  await screen.getByRole("button", "Buy now").click();
  await expect(browser).toHaveURL(SHOPIFY_CHECKOUT, { timeout: 30_000 });
  const cartToken = orders.track(await browser.url());

  await agent.act(FILL_CONTACT_AND_ADDRESS, { params: BUYER });
  await agent.assert("the email and the address are filled in");
  await fillCard(browser, card);
  return cartToken;
}

// Shopify finishes the order a moment after the thank-you page.
async function placedOrder(orders: Orders, cartToken: string): Promise<Order> {
  let order = null as Order | null;
  await expect.poll(async () => (order = await orders.find(cartToken)), { timeout: 30_000 }).not.toBeNull();
  return order!;
}

const amount = (text: string) => Number(text.replace(/[^\d.]/g, ""));

// Every test starts past the password page, with no screenshots for the agent: the setup typed a secret.
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

    const order = await placedOrder(orders, cartToken);
    expect(order).toMatchObject({
      test: true,
      displayFinancialStatus: "PAID",
      lineItems: { nodes: [{ title, quantity: 1 }] },
    });
    // The subtotal leaves out shipping, which depends on the store's rates.
    expect(amount(order.subtotalPriceSet.shopMoney.amount)).toBeCloseTo(amount(price));
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
    const cartToken = await fillCheckout({ screen, agent, browser, orders }, CARDS.approved);

    // The code is new every run, so unique() keeps the replay cache working.
    await agent.act("apply the discount code {code}", { params: { code: unique(code) } });
    await agent.assert(`the order summary shows the discount code ${code}`);

    await agent.act("click Pay now");
    await expect(browser).toHaveURL(/\/thank-you/, { timeout: 60_000 });

    const order = await placedOrder(orders, cartToken);
    expect(order).toMatchObject({ test: true, displayFinancialStatus: "PAID", discountCodes: [code] });
    expect(amount(order.totalDiscountsSet.shopMoney.amount)).toBeCloseTo(DISCOUNT);
    expect(amount(order.subtotalPriceSet.shopMoney.amount)).toBeCloseTo(amount(price) - DISCOUNT);
  });
});
