import { Quote } from "../types";
import { ZARP_TOKEN } from "./addresses";
import { QUOTE_TTL_SECONDS } from "./constants";
import { redis } from "./redis";

export async function createQuote({
  paymentTokenAmount,
  metadata,
  quantity,
  productId,
}: {
  paymentTokenAmount: string;
  metadata: Record<string, string>;
  quantity: number;
  productId: string;
}): Promise<Quote> {
  const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000);

  const quote: Quote = {
    id: crypto.randomUUID(),
    expiresAt: expiresAt.toISOString(),
    metadata,
    paymentDestination: process.env.MERCHANT_ADDRESS,
    productId,
    quantity,
    status: "PENDING",
    tokenQuote: {
      ...ZARP_TOKEN,
      amount: paymentTokenAmount,
    },
  };

  await redis.set(`quote:${quote.id}`, JSON.stringify(quote));

  return quote;
}

export async function getQuote(id: string): Promise<Quote | null> {
  const quote = await redis.get(`quote:${id}`);
  return quote ? JSON.parse(quote) : null;
}

export async function updateQuoteStatus(id: string, status: Quote["status"]) {
  const quote = await getQuote(id);

  if (!quote) {
    throw new Error("Quote not found");
  }

  quote.status = status;

  await redis.set(`quote:${id}`, JSON.stringify(quote));

  return quote;
}
