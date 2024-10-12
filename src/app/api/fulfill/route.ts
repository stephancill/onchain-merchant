import { chains } from "@/lib/chains";
import { paymentProofDomain, paymentProofTypes } from "@/lib/constants";
import { fulfillOrder } from "@/lib/fulfillment";
import { isTransactionHashSpent, spendTransactionHash } from "@/lib/payments";
import { getQuote, updateQuoteStatus } from "@/lib/quote";
import { getTransportByChainId } from "@/lib/utils";
import { PaymentProof, TrustedUserType } from "@/types";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import {
  createPublicClient,
  decodeEventLog,
  erc20Abi,
  getAddress,
  Hex,
} from "viem";
import { z } from "zod";

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const HexStringSchema = z.string().regex(/^0x[a-fA-F0-9]+$/);

const PaymentProofSchema = z.object({
  quoteId: z.string(),
  transactionHash: HexStringSchema,
  signature: HexStringSchema,
  signer: AddressSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parseResult = PaymentProofSchema.safeParse(body);

  if (!parseResult.success) {
    return Response.json({ error: parseResult.error }, { status: 400 });
  }

  const paymentProof = parseResult.data as PaymentProof;
  const { quoteId, transactionHash, signature, signer } = paymentProof;

  try {
    const trustedUserDataToken = req.headers.get("x-trusted-user-data");
    let trustedUser: TrustedUserType | null = null;

    if (trustedUserDataToken) {
      try {
        trustedUser = jwt.verify(
          trustedUserDataToken,
          process.env.TRUSTED_CLIENT_JWT_SECRET
        ) as TrustedUserType;
      } catch (error) {
        throw new Error("Invalid trusted user data token");
      }
    }

    const quote = await getQuote(quoteId);

    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.status !== "PENDING") {
      // If fulfillment has failed, ask to contact support
      if (quote.status === "FULFILLMENT_ERROR") {
        throw new Error("Fulfillment failed");
      }
      throw new Error("Quote is not in PENDING state");
    }

    if (new Date(quote.expiresAt) < new Date()) {
      throw new Error("Quote has expired");
    }

    if (await isTransactionHashSpent(transactionHash)) {
      throw new Error("Transaction hash already spent");
    }

    const chain = chains.find((c) => c.id === quote.tokenQuote.chainId);

    if (!chain) {
      throw new Error("Chain not found");
    }

    const client = createPublicClient({
      transport: getTransportByChainId(chain.id),
      chain: chain,
    });

    if (!trustedUser) {
      const isSignatureValid = await client.verifyTypedData({
        types: paymentProofTypes,
        domain: paymentProofDomain,
        primaryType: "PaymentProof",
        address: signer,
        message: {
          quoteId,
          transactionHash,
        },
        signature,
      });

      if (!isSignatureValid) {
        throw new Error("Invalid signature");
      }
    }

    const receipt = await client.getTransactionReceipt({
      hash: transactionHash as Hex,
    });

    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    // Find transfer log
    const transferLog = receipt.logs.find((log) => {
      try {
        const event = decodeEventLog({
          abi: erc20Abi,
          data: log.data,
          topics: log.topics,
        });

        return (
          getAddress(log.address) === getAddress(quote.tokenQuote.address) &&
          event.eventName === "Transfer" &&
          getAddress(event.args.to) === getAddress(quote.paymentDestination) &&
          getAddress(event.args.from) ===
            getAddress(trustedUser?.walletAddress ?? signer) &&
          event.args.value >= BigInt(quote.tokenQuote.amount)
        );
      } catch (error) {
        return false;
      }
    });

    if (!transferLog) {
      throw new Error("Transfer log not found");
    }

    // Update the quote status
    await updateQuoteStatus(quoteId, "PAYMENT_RECEIVED");
    await spendTransactionHash(transactionHash, paymentProof);

    try {
      await fulfillOrder(quoteId);
      const updatedQuote = await updateQuoteStatus(quoteId, "COMPLETED");
      return Response.json({ quote: updatedQuote }, { status: 200 });
    } catch (error) {
      console.error(error);
      const updatedQuote = await updateQuoteStatus(
        quoteId,
        "FULFILLMENT_ERROR"
      );
      return Response.json({ quote: updatedQuote }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}
