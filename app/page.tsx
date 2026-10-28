import type { ReactNode } from "react";
import { Suspense } from "react";

import { ProductGallery } from "@/components/product-gallery";
import { LightButton } from "@/components/ui/light-button";
import { formatMoney } from "@/lib/money";
import { getProduct, isStoreConfigured } from "@/lib/shopify";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
      <div className="mx-auto grid w-full max-w-300 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
        <div>
          <h1 className="type-h1 text-e2e-text-primary">
            Shopify checkout,
            <br />
            tested end to end
          </h1>
          <p className="mt-4 max-w-120 type-body text-e2e-text-secondary">
            A real Shopify checkout on a dev store, tested with e2e: in the browser, and against the order Shopify
            recorded.
          </p>
          <p className="mt-8 type-code-s text-e2e-text-faint">Test card 1, any future expiry, any CVC.</p>
        </div>

        <Suspense fallback={<Notice title="Loading…" detail="Asking Shopify for the product." />}>
          <ProductCard />
        </Suspense>
      </div>
    </main>
  );
}

async function ProductCard() {
  if (!isStoreConfigured()) {
    return (
      <Notice
        title="Connect your dev store"
        detail="Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN in .env.local, then reload."
      />
    );
  }

  const product = await getProduct();
  if (!product) {
    return <Notice title="Nothing for sale" detail="The store's Headless channel has no product for sale yet." />;
  }

  return (
    <Card>
      {product.images.length > 0 && (
        <ProductGallery images={product.images} featuredImageUrl={product.featuredImageUrl} />
      )}
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="product-heading" data-testid="product-title" className="type-h3-display text-e2e-text-bright">
          {product.title}
        </h2>
        <p data-testid="product-price" className="shrink-0 type-body-s font-medium text-e2e-text-bright">
          {formatMoney(product.price)}
        </p>
      </div>
      {product.description && (
        <p className="-mt-2 line-clamp-3 type-body-s text-e2e-text-soft">{product.description}</p>
      )}
      <form action="/checkout" method="post">
        <LightButton type="submit">Buy now</LightButton>
      </form>
      <p className="type-caption text-e2e-text-faint">
        You pay on Shopify&apos;s checkout, on the store&apos;s own domain.
      </p>
    </Card>
  );
}

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 id="product-heading" className="type-h3-display text-e2e-text-bright">
          {title}
        </h2>
        <p className="type-body-s text-e2e-text-soft">{detail}</p>
      </div>
      <LightButton disabled>Buy now</LightButton>
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="product-heading"
      className="flex flex-col gap-5 border border-e2e-hairline-strong bg-e2e-panel p-5"
    >
      {children}
    </section>
  );
}
