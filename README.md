# Onchain Merchant

This project allows a merchant to accept payments onchain for goods and services that are fulfilled offchain.

## Order Flow

1. Customer gets a list of products from the merchant
2. Customer selects a product and requests a quote
3. Customer pays for the quote
4. Customer creates a proof of payment and sends it to the merchant
5. Merchant fulfills the order


## API

### Products

```
GET /api/products
```

Returns a list of products

### Quote
```
POST /api/quote
```

Creates a quote for a product and returns it

```
GET /api/quote?id=:id
```

Returns a quote by ID

### Fulfillment

```
POST /api/fulfill
```

Creates a fulfillment for a proof of payment

## Architecture

### Quotes

The merchant can determine which token they would like to accept for payments via the `PAYMENT_TOKEN_` environment variables (see `.env.sample`). This will generate a quote in the currency of the selected token.

Sample quote object:
```
{
  "quote": {
    "id": "3c11b0fc-a0f8-412f-95f9-cd1c6188b184",
    "expiresAt": "2024-10-12T02:27:30.899Z",
    "metadata": {},
    "paymentDestination": "0x8d25687829D6b85d9e0020B8c89e3Ca24dE20a89",
    "productId": "saythanks:99",
    "quantity": 1,
    "status": "PENDING",
    "tokenQuote": {
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "amount": "580000",
      "chainId": 8453,
      "decimals": 6
    }
  }
}
```

### Order Fulfillment

A proof of payment is a typed data signature from the customer over the quote ID and the transaction hash.

The verification process is as follows:

1. Verify the signature of the payment proof (if not from a trusted user)
2. Retrieve the quote using the provided quote ID
3. Check if the quote is in a PENDING state and not expired
4. Ensure the transaction hash hasn't been used before
5. Fetch the transaction receipt from the blockchain
6. Find and verify the transfer log in the receipt
   - Confirm the token address matches the quote
   - Check that it's a Transfer event
   - Verify the recipient is the merchant's address
   - Confirm the sender is either the trusted user or the signer
   - Ensure the transferred amount is at least the quoted amount
7. Update the quote status to PAYMENT_RECEIVED
8. Mark the transaction hash as spent
9. Attempt to fulfill the order
10. Update the quote status to either COMPLETED or FULFILLMENT_ERROR

If any step fails, the process is halted and an appropriate error is returned. If all checks are successful, the order is fulfilled.

The fulfillment process has an option that bypasses the signature verification step. This is useful for partner apps to be able to attest to the sender of the payment without prompting them for another signature.


## Future Work

- Add a webhook system that can look for incoming payments and automatically fulfill them. This would require a signature from the merchant over the quote ID
- Persist the quotes/orders in a database so that it can be queried later
- Add a storefront that allows users to connect a wallet to buy products
- Add an admin dashboard for the merchant to view and manage orders

## Development


Copy the `.env.sample` file to `.env.local` and fill in the missing values.

```
cp .env.sample .env.local
```

Run the docker services (PostgreSQL, Redis)

```
docker compose up -d
```

Install dependencies and run the Next.js app

```
pnpm install
pnpm run dev
```