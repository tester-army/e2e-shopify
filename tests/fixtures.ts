import { randomBytes } from "node:crypto";

import { test as base } from "@e2e-dev/web";

import {
  assertDevelopmentStore,
  cartTokenFromCheckoutUrl,
  createAdmin,
  createDiscountCode,
  deleteDiscountCode,
  deleteOrder,
  orderByCartToken,
  type Admin,
  type Order,
} from "./shopify";

const env = process.env;

export const skip =
  !env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_STOREFRONT_TOKEN
    ? "set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN to run the Shopify tests"
    : !env.SHOPIFY_STORE_PASSWORD
      ? "set SHOPIFY_STORE_PASSWORD to get past the dev store's password page"
      : !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET
        ? "set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET to check orders through the Admin API"
        : !env.AI_GATEWAY_API_KEY
          ? "set AI_GATEWAY_API_KEY to run the agent tests"
          : false;

const withShopify = base.extend<{ shopify: Admin }>({
  shopify: async ({}, use) => {
    const admin = await createAdmin(env.SHOPIFY_CLIENT_ID ?? "", env.SHOPIFY_CLIENT_SECRET ?? "");
    await assertDevelopmentStore(admin);
    await use(admin);
  },
});

export type Orders = {
  // Remembers the checkout's cart token, so the order is deleted after the test.
  track(checkoutUrl: string): string;
  find(cartToken: string): Promise<Order | null>;
};

export const DISCOUNT = "5.00";

type Discounts = {
  // A fresh code for this test only, DISCOUNT off the order, usable once.
  create(): Promise<string>;
};

// Orders a test places and discount codes it creates are deleted after it, after a failure too.
export const test = withShopify.extend<{ orders: Orders; discounts: Discounts }>({
  orders: async ({ shopify }, use) => {
    const cartTokens = new Set<string>();

    await use({
      track: (checkoutUrl) => {
        const cartToken = cartTokenFromCheckoutUrl(checkoutUrl);
        cartTokens.add(cartToken);
        return cartToken;
      },
      find: (cartToken) => orderByCartToken(shopify, cartToken),
    });

    for (const cartToken of cartTokens) {
      const order = await orderByCartToken(shopify, cartToken);
      if (order?.test) await deleteOrder(shopify, order.id);
    }
  },

  discounts: async ({ shopify }, use) => {
    const ids: string[] = [];

    await use({
      create: async () => {
        const code = `E2E-${randomBytes(3).toString("hex").toUpperCase()}`;
        ids.push(await createDiscountCode(shopify, code, DISCOUNT));
        return code;
      },
    });

    for (const id of ids) await deleteDiscountCode(shopify, id);
  },
});

export const BUYER = {
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  address: "350 5th Ave",
  city: "New York",
  state: "New York",
  zip: "10118",
};

// Shopify's Test payment gateway decides the outcome by the card number.
export const CARDS = { approved: "1", declined: "2", gatewayFailure: "3" };
