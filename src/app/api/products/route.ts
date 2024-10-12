import { getProducts } from "@/lib/saythanks";

export async function GET() {
  const sayThanksProducts = await getProducts();

  return Response.json({ products: sayThanksProducts });
}
