import { test } from "@e2e-dev/web";
import { expect, secrets } from "e2e";

import { STORE } from "./shopify";

// Dev stores are always password protected, and the password page stands in front of checkout too.
test.setup(
  "enters the dev store's password",
  { sessions: ["shopper"], retries: 2, timeout: 120_000 },
  async ({ app, screen, agent, browser, session }) => {
    await app.open("/");
    await screen.getByRole("button", "Buy now").click();
    await expect(browser).toHaveURL(`${STORE}/password`, { timeout: 30_000 });

    await agent.act("enter the store password {password} and enter the store", {
      params: { password: secrets.get("store-password") },
    });
    await expect(browser).toHaveURL(`${STORE}/`, { timeout: 15_000 });

    await session.save("shopper");
  },
);
