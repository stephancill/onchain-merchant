import { Token } from "../types";

export const USDC_TOKEN: Token = {
  symbol: "USDC",
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chainId: 8453,
  decimals: 6,
} as const;

export const ZARP_TOKEN: Token = {
  symbol: "ZARP",
  address: "0xb755506531786C8aC63B756BaB1ac387bACB0C04",
  chainId: 8453,
  decimals: 18,
} as const;

export const ALL_TOKENS = [USDC_TOKEN, ZARP_TOKEN];
