import { createCheckout, getProduct } from "@/lib/shopify";

export async function POST(request: Request) {
  const product = await getProduct();
  // The home page says why there's nothing to buy.
  if (!product) return Response.redirect(new URL("/", request.url), 303);

  const checkoutUrl = await createCheckout(product.variantId);

  // 303 so the browser follows with a GET; Next's redirect() is a 307 and would re-send the POST.
  return Response.redirect(checkoutUrl, 303);
}
