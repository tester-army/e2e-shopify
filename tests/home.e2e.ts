import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("the home page shows the product card and the Buy now button", async ({ app, screen }) => {
  await app.open("/");

  await expect(screen.getByRole("heading", "Shopify checkout, tested end to end")).toBeVisible();
  await expect(screen.getByRole("button", "Buy now")).toBeVisible();
});
