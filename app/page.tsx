import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { ProductGallery } from "@/components/product-gallery";
import { Button } from "@/components/ui/button";
import { getProduct, isStoreConfigured, type Money } from "@/lib/shopify";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center py-e2e-8">
      <div className="mx-auto grid w-full max-w-312 items-center gap-e2e-8 px-e2e-3 md:px-e2e-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-e2e-10">
        <div>
          <p className="type-caption text-e2e-mint">Shopify example</p>
          <h1 className="mt-e2e-2 type-h1 text-e2e-off-white">
            Shopify checkout,
            <br />
            tested end to end
          </h1>
          <p className="mt-e2e-3 max-w-120 type-body-l text-e2e-neutral-400">
            a real Shopify checkout on a dev store, tested with e2e: in the browser, and against the order Shopify
            recorded.
          </p>
          <p className="mt-e2e-4 type-caption text-e2e-neutral-500">test card 1, any future expiry, any cvc.</p>
        </div>

        <Suspense fallback={<Notice title="loading…" detail="asking Shopify for the product." />}>
          <ProductCard />
        </Suspense>
      </div>
    </main>
  );
}

async function ProductCard() {
  // Per request, not at build time, when the store may not be set up yet.
  await connection();
  if (!isStoreConfigured()) {
    return (
      <Notice
        title="connect your dev store"
        detail={
          <>
            set <code className="type-code-s text-e2e-off-white">SHOPIFY_STORE_DOMAIN</code> and{" "}
            <code className="type-code-s text-e2e-off-white">SHOPIFY_STOREFRONT_TOKEN</code> in{" "}
            <code className="type-code-s text-e2e-off-white">.env.local</code>, then reload.
          </>
        }
      />
    );
  }

  const product = await getProduct();
  if (!product) {
    return <Notice title="nothing for sale" detail="the store's Headless channel has no product for sale yet." />;
  }

  return (
    <Card>
      {product.images.length > 0 && <ProductGallery images={product.images} />}
      <div className="flex items-baseline justify-between gap-e2e-2">
        <h2 id="product-heading" data-testid="product-title" className="type-h4 text-e2e-off-white">
          {product.title}
        </h2>
        <p data-testid="product-price" className="shrink-0 type-body-m text-e2e-off-white">
          {formatMoney(product.price)}
        </p>
      </div>
      {product.description && (
        <p className="-mt-e2e-1 line-clamp-3 type-body-m text-e2e-neutral-300">{product.description}</p>
      )}
      <form action="/checkout" method="post">
        <Button type="submit" className="w-full">
          buy now
        </Button>
      </form>
      <p className="type-body-s text-e2e-neutral-500">
        you pay on Shopify&apos;s checkout, on the store&apos;s own domain.
      </p>
    </Card>
  );
}

function Notice({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <Card>
      <div className="flex flex-col gap-e2e-1">
        <h2 id="product-heading" className="type-h4 text-e2e-off-white">
          {title}
        </h2>
        <p className="type-body-m text-e2e-neutral-300">{detail}</p>
      </div>
      <Button disabled className="w-full">
        buy now
      </Button>
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="product-heading"
      className="flex flex-col gap-e2e-3 border border-e2e-neutral-800 bg-e2e-neutral-800/40 p-e2e-3"
    >
      {children}
    </section>
  );
}

function formatMoney({ amount, currencyCode }: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(Number(amount));
}
