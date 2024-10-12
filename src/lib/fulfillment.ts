import { getQuote } from "./quote";
import {
  getProducts,
  handleFulfillment as handleSayThanksFulfillment,
} from "./saythanks";

export async function fulfillOrder(quoteId: string) {
  const quote = await getQuote(quoteId);

  if (!quote) {
    throw new Error("Quote not found");
  }

  const products = await getProducts();

  const product = products.find((p) => p.id === quote.productId);

  if (!product) {
    throw new Error("Product not found");
  }

  try {
    if (quote.productId.startsWith("saythanks:")) {
      await handleSayThanksFulfillment({
        metadata: quote.metadata,
        product,
      });

      return;
    }
  } catch (error) {
    // TODO: Notify the customer
    throw error;
  }

  throw new Error("Fulfillment method not found");
}
