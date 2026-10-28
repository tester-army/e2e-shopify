import type { Browser } from "@e2e-dev/web";

import type { Money } from "../lib/shopify";

const API_VERSION = "2026-10";

export const STORE = `https://${process.env.SHOPIFY_STORE_DOMAIN}`;

// <store>/checkouts/cn/<cart token>/en-us
export const SHOPIFY_CHECKOUT = /\.myshopify\.com\/checkouts\/cn\/[^/?]+/;

export type Admin = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

// The client credentials grant: Dev Dashboard apps get no static token. The token lasts 24 hours.
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

// The tests create and delete orders, so they refuse a store that isn't a development store.
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

export type Order = {
  id: string;
  test: boolean;
  financialStatus: string;
  total: Money;
  lineItems: { title: string; quantity: number }[];
};

type OrdersResponse = {
  orders: {
    nodes: {
      id: string;
      test: boolean;
      displayFinancialStatus: string;
      totalPriceSet: { shopMoney: Money };
      lineItems: { nodes: { title: string; quantity: number }[] };
    }[];
  };
};

// The cart token from our checkoutUrl is the order's cart_token.
export async function orderByCartToken(admin: Admin, cartToken: string): Promise<Order | null> {
  const { orders } = await admin<OrdersResponse>(
    `query Order($query: String!) {
      orders(first: 1, query: $query) {
        nodes {
          id
          test
          displayFinancialStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 5) { nodes { title quantity } }
        }
      }
    }`,
    { query: `cart_token:${cartToken}` },
  );
  const order = orders.nodes[0];
  if (!order) return null;

  return {
    id: order.id,
    test: order.test,
    financialStatus: order.displayFinancialStatus,
    total: order.totalPriceSet.shopMoney,
    lineItems: order.lineItems.nodes,
  };
}

// A test order can be deleted at once, without archiving it first.
export async function deleteOrder(admin: Admin, id: string): Promise<void> {
  await admin(`mutation OrderDelete($id: ID!) { orderDelete(orderId: $id) { deletedId } }`, { id });
}

export const CARD = { expiry: "12 / 34", securityCode: "111", name: "Ada Lovelace" };

// Shopify's card fields are iframes from another site, which the agent's tree leaves out. Each frame also holds
// hidden decoy inputs for the other fields, so the visible one is found by role.
export async function fillCard(browser: Browser, number: string): Promise<void> {
  const field = (name: string) => browser.frameLocator(`iframe[title="${name}"]`).getByRole("textbox", name);
  await field("Card number").fill(number);
  await field("Expiration date (MM / YY)").fill(CARD.expiry);
  await field("Security code").fill(CARD.securityCode);
  await field("Name on card").fill(CARD.name);
}
