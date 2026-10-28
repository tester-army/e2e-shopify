import { createCheckout, getProduct } from "@/lib/shopify";

export async function POST(request: Request) {
  const product = await getProduct();
  if (!product) return Response.redirect(new URL("/", request.url), 303);

  // 303 so the browser follows with a GET; Next's redirect() is a 307 and would re-send the POST.
  return Response.redirect(await createCheckout(product.variantId), 303);
}
