import { Address, Hex } from "viem";

export type Token = {
  symbol: string;
  address: `0x${string}`;
  chainId: number;
  decimals: number;
};

export type Quote = {
  id: string;
  /**
   * Token that the user must pay with to fulfill the quote
   */
  tokenQuote: Token & { amount: string };
  /**
   * Address that payment must be sent to
   */
  paymentDestination: Address;
  expiresAt: string;
  /**
   * Metadata passed by the user, will be passed to the product at the fulfillment stage
   */
  metadata: Record<string, string>;
  productId: string;
  /**
   * Quantity of the product that the user wants to buy
   */
  quantity: number;
  status: "PENDING" | "PAYMENT_RECEIVED" | "COMPLETED" | "FULFILLMENT_ERROR";
};

export type PaymentProof = {
  quoteId: string;
  /**
   * Transaction hash of the payment
   */
  transactionHash: Hex;
  /**
   * Signature of `${quoteId}${transactionHash}`
   */
  signature: Hex;
  /**
   * Address that made the payment
   */
  signer: Address;
};

export type TrustedUserType = {
  id: string;
  walletAddress: Address;
};

/**
 * Transaction flow
 * 1. User calls POST /api/quote with productId and quantity
 * - Token quote is calculated based on exchange rate and product price
 * 2. User calls POST /api/fulfill with paymentProof
 * - If the quote has not expired and the signature is valid, the transaction is fetched and transfer logs are checked for transfer from signer to merchant
 * - If the transaction is confirmed, the quote status is updated to PAYMENT_RECEIVED
 * - The merchant fulfils the order and the quote status is updated to COMPLETED
 */
