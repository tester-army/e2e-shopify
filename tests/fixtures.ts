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

const REQUIRED = [
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_STOREFRONT_TOKEN",
  "SHOPIFY_STORE_PASSWORD",
  "SHOPIFY_CLIENT_ID",
  "SHOPIFY_CLIENT_SECRET",
  "AI_GATEWAY_API_KEY",
];
const missing = REQUIRED.filter((name) => !process.env[name]);
export const skip = missing.length > 0 ? `set ${missing.join(", ")} to run the Shopify tests` : false;

const withShopify = base.extend<{ shopify: Admin }>({
  shopify: async ({}, use) => {
    const admin = await createAdmin(process.env.SHOPIFY_CLIENT_ID ?? "", process.env.SHOPIFY_CLIENT_SECRET ?? "");
    await assertDevelopmentStore(admin);
    await use(admin);
  },
});

export type Orders = {
  // Remembers the checkout's cart token, so its order is deleted after the test.
  track(checkoutUrl: string): string;
  find(cartToken: string): Promise<Order | null>;
};

type Discounts = { create(): Promise<string> };

export const DISCOUNT = 5;

// Orders a test places and codes it creates are deleted after it, after a failure too.
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
