# e2e-shopify

A Next.js storefront that sells one product through Shopify's checkout on a free dev store, used as an example of end-to-end testing a checkout you don't own with [e2e](https://www.npmjs.com/package/e2e).

![Product card with photos, a price, and a Buy now button](docs/screenshot.png)

## How it works

The shopper pays on Shopify's own checkout, the one every Shopify store uses:

- **Home** (`app/page.tsx`) shows the store's newest product that's for sale, read through the Storefront API: its photos, title, price, and a Buy now button.
- **`POST /checkout`** (`app/checkout/route.ts`) creates a cart with that product and redirects to the cart's checkout on the store's own domain.
- **Shopify's checkout** takes the address and the card, and ends on Shopify's thank-you page. Nothing sends the shopper back, so the tests confirm each order through the Admin API.

There is no database: Shopify holds the product, the cart, and the order. Any store works, since the app picks its product by a rule, not by name.

### Test cards

Shopify's Test payment gateway decides the outcome by the card number:

| Card number | Result          |
| ----------- | --------------- |
| `1`         | Paid            |
| `2`         | Declined        |
| `3`         | Gateway failure |

Use any future expiry date, any 3-digit security code, and any name. Shopify shows the same error for `2` and `3`.

## Getting started

You need a Shopify store with one product for sale. A free dev store works, and the steps below set one up in about 15 minutes. Then:

```bash
npm install
cp .env.example .env.local   # fill it in with the values from the steps below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The card shows your product, and Buy now opens Shopify's checkout.

## Connect your Shopify store

Everything here is free: dev stores cost nothing and take unlimited test orders. Each step ends with the value it gives you for `.env.local`.

### 1. Create a dev store

1. Sign in to the [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/) with a Shopify account. The store and the app in step 5 must belong to the same organization.
2. Create the store with Shopify's CLI, which lets you pick the country. The dashboard uses your organization's country instead, and the tests' buyer has a New York address, so the store has to be in the US:

   ```bash
   npx @shopify/cli@latest store create dev --country US
   ```

   It asks for a name, which becomes `<name>.myshopify.com` and can't change later, a plan, and whether to add demo data. Any plan works, and demo data is optional.

3. In the store's admin, check **Settings → Payments**: **Test payment gateway** shows as **Active**. Leave Shopify Payments alone.

→ `SHOPIFY_STORE_DOMAIN`: the store's domain, such as `e2e-shopify.myshopify.com`.

### 2. Add a product

The app sells the store's **newest product that's for sale**, so the product you add last is the one on the card. In the admin, go to **Products → Add product**:

- **Title, description, price:** anything, with a price over $5.00 so the discount test has something to take off.
- **Media:** one or more photos. The starred one opens the gallery and is the thumbnail at checkout. Give each an alt text: it names the photo's thumbnail button.
- **Inventory:** turn off the toggle next to **Inventory**, so the tests never run out of stock.
- **Status:** **Active**.
- **Sales channels:** leave **Online Store** on. You'll add **Headless** in the next step.

### 3. Get a Storefront API token

The app reads the product and creates the cart through the Storefront API. A dev store's password locks its Online Store channel, so the API needs a token from Shopify's free Headless channel:

1. Install [Headless](https://apps.shopify.com/headless) on your store.
2. In the admin, go to **Sales channels → Headless** and add a storefront (**Add storefront** or **Create storefront**).
3. On the storefront's page, in **Storefront API tokens**, copy the **Public access token**. A public token can only read products and create carts, and is meant to be seen.
4. Make your product visible to it: **Products**, select the product, then **⋯ → Include in sales channels → Headless**.

→ `SHOPIFY_STOREFRONT_TOKEN`: the public access token.

### 4. Copy the store password

Dev stores are always password protected, and the password page also stands in front of checkout. The tests type the password once. Find it under **Online Store → Preferences → Password protection**.

→ `SHOPIFY_STORE_PASSWORD`: the password, in single quotes if it contains `#` or `$`.

### 5. Create an app for the Admin API

Only the tests need this: they check each order through the Admin API and delete it afterwards.

1. In the [Dev Dashboard](https://dev.shopify.com/dashboard/), go to **Apps → Create app → Start from Dev Dashboard** and name it, such as `e2e-shopify tests`.
2. On the **Versions** page, set:
   - **App URL:** `https://shopify.dev/apps/default-app-home`, with **Embed app in Shopify admin** off. The app has no screens.
   - **Scopes:** `read_orders,write_orders,read_discounts,write_discounts`.
3. Click **Release**, then **Install app** and pick your store.
4. Under **Distribution**, choose **Custom distribution** and enter your store's domain. Without it, Shopify answers "This app is not approved to access the Order object". Shopify then shows an install link; the app is installed already, so you don't need it.
5. On **Settings**, copy the **Client ID** and the **Client secret**. The tests trade them for a token that lasts 24 hours, so there's no token to copy.

→ `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`.

### 6. Fill in `.env.local`

| Variable                   | From   | Used by                      |
| -------------------------- | ------ | ---------------------------- |
| `SHOPIFY_STORE_DOMAIN`     | Step 1 | The app and the tests        |
| `SHOPIFY_STOREFRONT_TOKEN` | Step 3 | The app                      |
| `SHOPIFY_STORE_PASSWORD`   | Step 4 | The tests                    |
| `SHOPIFY_CLIENT_ID`        | Step 5 | The tests                    |
| `SHOPIFY_CLIENT_SECRET`    | Step 5 | The tests                    |
| `AI_GATEWAY_API_KEY`       | Vercel | The tests' agent (see below) |

Restart `npm run dev`. If the card says **Connect your dev store**, a variable is missing; if it says **Nothing for sale**, check that the product is active and included in the Headless channel.

## End-to-end tests

The tests buy the product on Shopify's real checkout. A dev store's password page also stands in front of checkout, so `tests/store.setup.e2e.ts` clicks Buy now, lands on that page, and has the agent type the password once. The password is a `secrets` handle: e2e types it, and the model sees `<secret:store-password>`. The setup saves the session, and every checkout test starts past the password.

`tests/checkout.e2e.ts` covers card `1` paying, card `2` declined, card `3` failing at the gateway, and a discount code. Our page is checked with exact locators, and Shopify's checkout with `agent.act` and `agent.assert`. Shopify's card fields are iframes from another site, which the agent's view of the page leaves out, so the test fills them with `browser.frameLocator`. Afterwards, each test asks the Admin API what Shopify recorded:

- **Paid:** a test order, paid, for the product on our card at its price.
- **Declined or failed:** no order.
- **Discount:** the test creates a fresh code through the Admin API first, then the order lists it with $5.00 off.

Orders and codes the tests create are deleted afterwards, after a failure too, and the tests only run against a development store. Shopify's checkout isn't ours, so a failed test there runs up to two more times. A run takes about 2.5 minutes and $0.02 of model calls.

Set `AI_GATEWAY_API_KEY` for the agent's model through the Vercel AI Gateway (or link a Vercel project). Then, with the dev server running:

```bash
npm run test:e2e
```

To test a different URL, set `APP_URL`. Configuration lives in `e2e.config.ts`.

## Scripts

| Command            | Description          |
| ------------------ | -------------------- |
| `npm run dev`      | Start the dev server |
| `npm run build`    | Build for production |
| `npm run lint`     | Run ESLint           |
| `npm run format`   | Format with Prettier |
| `npm run test:e2e` | Run the e2e tests    |
