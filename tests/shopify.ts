import type { Browser } from "@e2e-dev/web";

const API_VERSION = "2026-10";

export const STORE = `https://${process.env.SHOPIFY_STORE_DOMAIN}`;

// <store>/checkouts/cn/<cart token>/…
export const SHOPIFY_CHECKOUT = /\.myshopify\.com\/checkouts\/cn\/[^/?]+/;

export type Admin = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

// Dev Dashboard apps have no static token: the client credentials grant gives one that lasts 24 hours.
export async function createAdmin(clientId: string, clientSecret: string): Promise<Admin> {
  const response = await fetch(`${STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  if (!response.ok) throw new Error(`Shopify refused the Admin API token request: ${response.status}`);
  const { access_token: token } = await response.json();

  return async (query, variables = {}) => {
    const response = await fetch(`${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    const { data, errors } = await response.json();
    if (!response.ok || errors) throw new Error(`Admin API: ${errors?.[0]?.message ?? response.status}`);
    return data;
  };
}

// The tests create and delete orders, so they refuse any store that isn't a development store.
export async function assertDevelopmentStore(admin: Admin): Promise<void> {
  const { shop } = await admin<{ shop: { plan: { partnerDevelopment: boolean } } }>(
    `{ shop { plan { partnerDevelopment } } }`,
  );
  if (!shop.plan.partnerDevelopment) throw new Error("The e2e tests only run against a Shopify development store.");
}

export function cartTokenFromCheckoutUrl(url: string): string {
  const token = url.match(/\/checkouts\/cn\/([^/?]+)/)?.[1];
  if (!token) throw new Error(`No cart token in ${url}`);
  return token;
}

type Amount = { shopMoney: { amount: string } };

export type Order = {
  id: string;
  test: boolean;
  displayFinancialStatus: string;
  // The line items after discounts, before shipping and tax.
  subtotalPriceSet: Amount;
  totalDiscountsSet: Amount;
  discountCodes: string[];
  lineItems: { nodes: { title: string; quantity: number }[] };
};

// The cart token in our checkout URL is the order's cart_token.
export async function orderByCartToken(admin: Admin, cartToken: string): Promise<Order | null> {
  const { orders } = await admin<{ orders: { nodes: Order[] } }>(
    `query ($query: String!) {
      orders(first: 1, query: $query) {
        nodes {
          id
          test
          displayFinancialStatus
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          discountCodes
          lineItems(first: 5) { nodes { title quantity } }
        }
      }
    }`,
    { query: `cart_token:${cartToken}` },
  );
  return orders.nodes[0] ?? null;
}

// Test orders can be deleted without archiving them first.
export async function deleteOrder(admin: Admin, id: string): Promise<void> {
  await admin(`mutation ($id: ID!) { orderDelete(orderId: $id) { deletedId } }`, { id });
}

type DiscountCreateResponse = {
  discountCodeBasicCreate: { codeDiscountNode: { id: string } | null; userErrors: { message: string }[] };
};

// A code anyone can use once, for a fixed amount off the order.
export async function createDiscountCode(admin: Admin, code: string, amount: number): Promise<string> {
  const { discountCodeBasicCreate: result } = await admin<DiscountCreateResponse>(
    `mutation ($discount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $discount) {
        codeDiscountNode { id }
        userErrors { message }
      }
    }`,
    {
      discount: {
        title: `e2e test ${code}`,
        code,
        // A minute early, in case this machine's clock runs ahead of Shopify's.
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        context: { all: "ALL" },
        customerGets: {
          value: { discountAmount: { amount: amount.toFixed(2), appliesOnEachItem: false } },
          items: { all: true },
        },
        usageLimit: 1,
      },
    },
  );
  if (!result.codeDiscountNode) throw new Error(`Admin API: ${result.userErrors[0]?.message ?? "no discount"}`);
  return result.codeDiscountNode.id;
}

export async function deleteDiscountCode(admin: Admin, id: string): Promise<void> {
  await admin(`mutation ($id: ID!) { discountCodeDelete(id: $id) { deletedCodeDiscountId } }`, { id });
}

// Shopify's card fields are iframes from another site, which the agent can't see. Each frame also holds hidden
// decoy inputs, so the visible one is found by role.
export async function fillCard(browser: Browser, number: string): Promise<void> {
  const field = (name: string) => browser.frameLocator(`iframe[title="${name}"]`).getByRole("textbox", name);
  await field("Card number").fill(number);
  await field("Expiration date (MM / YY)").fill("12 / 34");
  await field("Security code").fill("111");
  await field("Name on card").fill("Ada Lovelace");
}
