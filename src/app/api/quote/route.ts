import { ZARP_TOKEN } from "@/lib/addresses";
import { paymentProofDomain, paymentProofTypes } from "@/lib/constants";
import { createQuote, getQuote } from "@/lib/quote";
import { getProducts, Product } from "@/lib/saythanks";
import { NextRequest } from "next/server";
import { parseUnits } from "viem";

export async function POST(req: NextRequest) {
  const { productId, quantity = 1, metadata = {} } = await req.json();

  const products = await getProducts();

  const product = products.find((p) => p.id == productId);

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const paymentTokenAmount = await calculateTokenQuote(product, quantity);

  const quote = await createQuote({
    paymentTokenAmount,
    product,
    metadata,
    quantity,
  });

  return Response.json({
    quote,
    signatureParameters: {
      messagePartial: {
        quoteId: quote.id,
      },
      types: paymentProofTypes,
      domain: paymentProofDomain,
    },
    product,
  });
}

async function calculateTokenQuote(product: Product, quantity: number) {
  const priceZarCents = product.price_min * quantity;

  const paymentTokenAmount = parseUnits(
    priceZarCents.toString(),
    ZARP_TOKEN.decimals - 2 // Remove two decimals to account for the fact that the price is in cents
  ).toString();

  return paymentTokenAmount;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Quote ID is required" }, { status: 400 });
  }

  const quote = await getQuote(id);

  return Response.json({ quote });
}
