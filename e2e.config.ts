import { existsSync } from "node:fs";
import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";
import { gateway } from "ai";

// e2e loads no .env file itself.
const envFile = new URL(".env.local", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Secrets are hidden in reports and output; the client secret is registered only for that.
// A secret under 6 characters fails config load, so only set ones are registered.
const secrets: Record<string, string> = {};
if (process.env.SHOPIFY_STORE_PASSWORD) secrets["store-password"] = process.env.SHOPIFY_STORE_PASSWORD;
if (process.env.SHOPIFY_CLIENT_SECRET) secrets["shopify-client-secret"] = process.env.SHOPIFY_CLIENT_SECRET;

export default {
  // The Vercel AI Gateway serves the model id and reads AI_GATEWAY_API_KEY, or the OIDC token of a linked Vercel project.
  agents: {
    default: {
      model: gateway("openai/gpt-6-luna-fast"),
      system: "You are a thorough QA agent. Verify every outcome.",
      context:
        "Checkout happens on Shopify's own checkout page on the store's myshopify.com domain. The store is a development store with Shopify's Test payment gateway, so nothing is charged. The card fields sit in iframes that the test fills itself; leave them alone.",
    },
  },
  secrets,
  targets: [
    {
      engine: web(),
      app: {
        url: process.env.APP_URL ?? "http://localhost:3000",
        // Or let the runner start the dev server (and reuse one already running on that URL):
        // command: { executable: "npm", args: ["run", "dev"], reuseExisting: true, log: ".e2e/logs/app.log" },
      },
    },
  ],
} satisfies E2EConfig;
