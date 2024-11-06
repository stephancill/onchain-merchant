import { Address } from "viem";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REDIS_URL: string;
      SAYTHANKS_EMAIL: string;
      SAYTHANKS_PASSWORD: string;
      SAYTHANKS_CAMPAIGN_ID: string;
      MERCHANT_ADDRESS: Address;
      /**
       * If a client provides this secret, we will ignore the signature check
       */
      TRUSTED_CLIENT_JWT_SECRET: string;
    }
  }
}

export {};
