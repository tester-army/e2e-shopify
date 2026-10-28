import { LightButton } from "@/components/ui/light-button";

// Until the card reads the product from Shopify.
const PRODUCT = { title: "e2e Field guide", description: "A short guide to end-to-end testing.", price: "$20.00" };

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

        <ProductCard {...PRODUCT} />
      </div>
    </main>
  );
}

function ProductCard({ title, description, price }: { title: string; description: string; price: string }) {
  return (
    <section
      aria-labelledby="product-heading"
      className="flex flex-col gap-5 border border-e2e-hairline-strong bg-e2e-panel p-5"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="product-heading" className="type-h3-display text-e2e-text-bright">
            {title}
          </h2>
          <p data-testid="product-price" className="type-body-s font-medium text-e2e-text-bright">
            {price}
          </p>
        </div>
        <p className="type-body-s text-e2e-text-soft">{description}</p>
      </div>
      <form action="/checkout" method="post">
        <LightButton type="submit">Buy now</LightButton>
      </form>
      <p className="type-caption text-e2e-text-faint">
        You pay on Shopify&apos;s checkout, on the store&apos;s own domain.
      </p>
    </section>
  );
}
