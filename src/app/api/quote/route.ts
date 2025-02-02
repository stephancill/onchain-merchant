import { ZARP_TOKEN } from "@/lib/addresses";
import { paymentProofDomain, paymentProofTypes } from "@/lib/constants";
import { createQuote, getQuote } from "@/lib/quote";
import { getProducts } from "@/lib/saythanks";
import { NextRequest } from "next/server";
import { parseUnits } from "viem";

export async function POST(req: NextRequest) {
  const { productId, quantity = 1, metadata = {} } = await req.json();

  const products = await getProducts();

  const product = products.find((p) => p.id === productId);

  if (!product) {
    console.error(`Product not found: ${productId}`);
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const paymentTokenAmount = await calculateTokenQuote(product.price, quantity);

  const quote = await createQuote({
    paymentTokenAmount,
    metadata,
    quantity,
    productId,
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
    product: product,
  });
}

async function calculateTokenQuote(
  unitPriceZarCents: number,
  quantity: number
) {
  const priceZarCents = unitPriceZarCents * quantity;

  const paymentTokenAmount = parseUnits(
    priceZarCents.toString(),
    ZARP_TOKEN.decimals - 2
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
