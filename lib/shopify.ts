import "server-only";

const API_VERSION = "2026-10";

export type Money = { amount: string; currencyCode: string };

export type ProductImage = { url: string; altText: string | null; width: number; height: number };

export type Product = {
  title: string;
  description: string;
  images: ProductImage[];
  variantId: string;
  price: Money;
};

export function isStoreConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN);
}

// Dev stores lock the Online Store channel, so the Storefront API needs the Headless channel's token.
async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await response.json();
  if (!response.ok || errors) throw new Error(`Storefront API: ${errors?.[0]?.message ?? response.status}`);
  return data;
}

type ProductsResponse = {
  products: {
    nodes: {
      title: string;
      description: string;
      images: { nodes: ProductImage[] };
      variants: { nodes: { id: string; availableForSale: boolean; price: Money }[] };
    }[];
  };
};

// The store's newest product for sale, so any store works. Shopify lists the starred image first.
export async function getProduct(): Promise<Product | null> {
  const { products } = await storefront<ProductsResponse>(
    `{
      products(first: 1, sortKey: CREATED_AT, reverse: true, query: "available_for_sale:true") {
        nodes {
          title
          description
          images(first: 250) { nodes { url altText width height } }
          variants(first: 100) { nodes { id availableForSale price { amount currencyCode } } }
        }
      }
    }`,
  );
  const product = products.nodes[0];
  const variant = product?.variants.nodes.find(({ availableForSale }) => availableForSale);
  if (!product || !variant) return null;

  return {
    title: product.title,
    description: product.description,
    images: product.images.nodes,
    variantId: variant.id,
    price: variant.price,
  };
}

type CartCreateResponse = {
  cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
};

export async function createCheckout(variantId: string): Promise<string> {
  const { cartCreate } = await storefront<CartCreateResponse>(
    `mutation ($variantId: ID!) {
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
