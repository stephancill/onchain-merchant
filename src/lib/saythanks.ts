import { withCache } from "./redis";

const BASE_URL = "https://app.saythanks.app";

const SAYTHANKS_AUTH_TOKEN_CACHE_KEY = "saythanks:auth_token";
const SAYTHANKS_PRODUCTS_CACHE_KEY = `saythanks:variants:${process.env.SAYTHANKS_CAMPAIGN_ID}`;

type TokenResponseType = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: number;
};

type STProduct = {
  id: string;
  model_name: string;
  partner_id: number;
  enabled: boolean;
  name: string;
  description: string;
  price_currency_code: string;
  price_min: number;
  price_max: number;
  return_type: string;
  image: string;
  redemption_instructions: string | null;
  terms_and_conditions: string;
  created_at: string;
  updated_at: string;
  product_variants: {
    data: {
      id: number;
      model_name: string;
      product_id: number;
      enabled: boolean;
      name: string | null;
      type: string;
      price: number;
      created_at: string;
      updated_at: string;
    }[];
  };
  partner: {
    id: number;
    model_name: string;
    name: string;
    image: string;
  };
};

export type STProductVariant = {
  provider: string;
  id: string;
  variantId: number;
  variantName: string | null;
  price: number;
};

export const getSayThanksAuthToken = withCache(
  SAYTHANKS_AUTH_TOKEN_CACHE_KEY,
  async () => {
    const response = await fetch(`${BASE_URL}/api/v2/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": "",
      },
      body: JSON.stringify({
        email: process.env.SAYTHANKS_EMAIL,
        password: process.env.SAYTHANKS_PASSWORD,
      }),
    });

    const data = (await response.json()) as TokenResponseType;

    return data.access_token;
  },
  {
    ttl: 3600,
  }
);

export const getProducts = withCache(
  SAYTHANKS_PRODUCTS_CACHE_KEY,
  async () => {
    const authToken = await getSayThanksAuthToken();

    const response = await fetch(
      `${BASE_URL}/api/v2/ongoing-campaign/${process.env.SAYTHANKS_CAMPAIGN_ID}?include=products`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      try {
        console.error(await response.json());
      } catch (error) {}
      throw new Error("Failed to fetch products");
    }

    const result = (await response.json()) as {
      products: { data: STProduct[] };
    };

    const variants: STProductVariant[] = result.products.data.flatMap(
      (product) =>
        product.product_variants.data.map((variant) => ({
          provider: "saythanks",
          id: `saythanks:${product.id}:${variant.id}`,
          variantId: variant.id,
          variantName: variant.name,
          price: variant.price,
        }))
    );

    return variants;
  },
  {
    ttl: 60 * 60 * 24,
  }
);

export async function handleFulfillment({
  metadata,
  variantId,
  value,
}: {
  metadata: Record<string, string>;
  variantId: number;
  value: number;
}) {
  console.log(
    "handleFulfillment",
    `${BASE_URL}/api/v2/ongoing-campaign/${process.env.SAYTHANKS_CAMPAIGN_ID}/create-voucher`,
    // metadata,
    // product,
    {
      customer_msisdn: metadata.phoneNumber,
      product_variant_id: variantId,
      send: true,
      value,
    }
  );

  const authToken = await getSayThanksAuthToken();

  const response = await fetch(
    `${BASE_URL}/api/v2/ongoing-campaign/${process.env.SAYTHANKS_CAMPAIGN_ID}/create-voucher`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        customer_msisdn: metadata.phoneNumber,
        customer_name: "-",
        product_variant_id: variantId,
        send: true,
        value,
      }),
    }
  );

  if (!response.ok) {
    try {
      const errorData = await response.json();
      console.error(errorData);
    } catch (error) {}
    throw new Error("Failed to create voucher");
  }

  return response.json();
}
