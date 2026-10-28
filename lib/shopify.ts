import "server-only";

const API_VERSION = "2026-10";

export type Money = { amount: string; currencyCode: string };

export type ProductImage = { url: string; altText: string | null; width: number; height: number };

export type Product = {
  title: string;
  description: string;
  images: ProductImage[];
  // The image starred in the Shopify admin, which checkout shows too.
  featuredImageUrl: string | null;
  variantId: string;
  price: Money;
};

export function isStoreConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN);
}

// Dev stores lock the Online Store channel, so tokenless requests fail; the Headless channel's public token works.
async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) throw new Error("Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN in .env.local.");

  const response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await response.json();
  if (!response.ok || errors) throw new Error(`Storefront API: ${errors?.[0]?.message ?? response.status}`);
  return data;
}

type ProductResponse = {
  products: {
    nodes: {
      title: string;
      description: string;
      featuredImage: { url: string } | null;
      images: { nodes: ProductImage[] };
      variants: { nodes: { id: string; availableForSale: boolean; price: Money }[] };
    }[];
  };
};

// Any store works: the app sells the store's newest product that's for sale.
export async function getProduct(): Promise<Product | null> {
  const { products } = await storefront<ProductResponse>(
    `query NewestProduct {
      products(first: 1, sortKey: CREATED_AT, reverse: true, query: "available_for_sale:true") {
        nodes {
          title
          description
          featuredImage { url }
          images(first: 250) { nodes { url altText width height } }
          variants(first: 100) { nodes { id availableForSale price { amount currencyCode } } }
        }
      }
    }`,
  );
  const product = products.nodes[0];
  // A product with sizes may have some sold out: take the first one for sale.
  const variant = product?.variants.nodes.find(({ availableForSale }) => availableForSale);
  if (!product || !variant) return null;

  return {
    title: product.title,
    description: product.description,
    images: product.images.nodes,
    featuredImageUrl: product.featuredImage?.url ?? null,
    variantId: variant.id,
    price: variant.price,
  };
}

type CartCreateResponse = {
  cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
};

// Returns the cart's checkoutUrl, a page on the store's own domain.
export async function createCheckout(variantId: string): Promise<string> {
  const { cartCreate } = await storefront<CartCreateResponse>(
    `mutation CartCreate($variantId: ID!) {
      cartCreate(input: { lines: [{ merchandiseId: $variantId, quantity: 1 }] }) {
        cart { checkoutUrl }
        userErrors { message }
      }
    }`,
    { variantId },
  );
  if (!cartCreate.cart) throw new Error(`Storefront API: ${cartCreate.userErrors[0]?.message ?? "no cart"}`);
  return cartCreate.cart.checkoutUrl;
}
