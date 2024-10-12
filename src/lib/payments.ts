import { Hex } from "viem";
import { redis } from "./redis";
import { PaymentProof } from "../types";

export async function spendTransactionHash(
  transactionHash: Hex,
  paymentProof: PaymentProof
) {
  await redis.set(
    `spent:${transactionHash.toLowerCase()}`,
    JSON.stringify(paymentProof)
  );
}

export async function isTransactionHashSpent(transactionHash: Hex) {
  const spent = await redis.get(`spent:${transactionHash.toLowerCase()}`);
  return spent === "true";
}
