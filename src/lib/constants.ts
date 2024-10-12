export const QUOTE_TTL_SECONDS = 60 * 15; // 15 minutes

export const paymentProofDomain = {
  name: "Payment Proof",
  version: "1",
} as const;

export const paymentProofTypes = {
  PaymentProof: [
    { name: "quoteId", type: "string" },
    { name: "transactionHash", type: "string" },
  ],
} as const;
