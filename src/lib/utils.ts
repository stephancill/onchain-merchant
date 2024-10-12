import { createPublicClient, fallback, http } from "viem";
import { mainnet } from "viem/chains";
import { withCache } from "./redis";

/**
 * Looks up the current price of ETH in USD via Chainlink's ETH/USDC price feed.
 * @returns The current price of ETH in USD.
 */
export const getEthUsdPrice = withCache(
  "eth:usd",
  async () => {
    const client = createPublicClient({
      transport: getTransportByChainId(mainnet.id),
      chain: mainnet,
    });

    const [, answer] = await client.readContract({
      abi: [
        {
          inputs: [],
          name: "latestRoundData",
          outputs: [
            { internalType: "uint80", name: "roundId", type: "uint80" },
            { internalType: "int256", name: "answer", type: "int256" },
            { internalType: "uint256", name: "startedAt", type: "uint256" },
            { internalType: "uint256", name: "updatedAt", type: "uint256" },
            { internalType: "uint80", name: "answeredInRound", type: "uint80" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "latestRoundData",
      // https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1&search=usdc#ethereum-mainnet
      address: "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4",
    });

    const ethPriceUsd = (1 / Number(answer)) * 1e18;

    return ethPriceUsd;
  },
  {
    ttl: 60,
  }
);

export function getTransportByChainId(chainId: number) {
  if (process.env[`EVM_RPC_URL_${chainId}`]) {
    console.log(
      `Using custom RPC URL for chain ${chainId}`,
      process.env[`EVM_RPC_URL_${chainId}`]
    );
    return fallback([http(process.env[`EVM_RPC_URL_${chainId}`]), http()]);
  } else {
    return http();
  }
}
