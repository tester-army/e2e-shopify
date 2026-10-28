import "server-only";

// A product from the dev store's demo data.
export const PRODUCT_HANDLE = "the-inventory-not-tracked-snowboard";

const API_VERSION = "2026-10";

export type Money = { amount: string; currencyCode: string };

export type Product = {
  title: string;
  description: string;
  image: { url: string; altText: string | null; width: number; height: number } | null;
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
  product: {
    title: string;
    description: string;
    featuredImage: Product["image"];
    variants: { nodes: { id: string; price: Money }[] };
  } | null;
};

export async function getProduct(): Promise<Product | null> {
  const { product } = await storefront<ProductResponse>(
    `query Product($handle: String!) {
      product(handle: $handle) {
        title
        description
        featuredImage { url altText width height }
        variants(first: 1) { nodes { id price { amount currencyCode } } }
      }
    }`,
    { handle: PRODUCT_HANDLE },
  );
  const variant = product?.variants.nodes[0];
  if (!product || !variant) return null;

  return {
    title: product.title,
    description: product.description,
    image: product.featuredImage,
    variantId: variant.id,
    price: variant.price,
  };
}
