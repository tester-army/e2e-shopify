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

const REQUIRED = ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_STORE_PASSWORD", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"];
const missing = REQUIRED.filter((name) => !process.env[name]);
// The AI Gateway takes an API key, or the OIDC token of a linked Vercel project.
if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) missing.push("AI_GATEWAY_API_KEY");
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
    // Shopify's order search can briefly miss an order it just returned, so remember every one found.
    const found = new Map<string, Order>();

    await use({
      track: (checkoutUrl) => {
        const cartToken = cartTokenFromCheckoutUrl(checkoutUrl);
        cartTokens.add(cartToken);
        return cartToken;
      },
      find: async (cartToken) => {
        const order = await orderByCartToken(shopify, cartToken);
        if (order) found.set(cartToken, order);
        return order;
      },
    });

    for (const cartToken of cartTokens) {
      const order = found.get(cartToken) ?? (await orderByCartToken(shopify, cartToken));
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
