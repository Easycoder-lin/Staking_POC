# Mock Staking Provider

Route B adds a demo-only staking provider that simulates the Ethereum validator lifecycle without a real Figment, Kiln, or Blockdaemon API key and without creating a real validator.

The mock provider returns local test data, including a mock unsigned deposit payload, fake validator public key, fake deposit hash, and fake exit hash. It does not send ETH, create Beacon Chain deposit data, register a validator, operate validator clients, or perform real withdrawals.

## Run The Demo

```sh
npm install
npm run dev
```

Open the local Next.js URL and choose `Mock Provider Mode`.

Optional `.env.local` settings:

```sh
MOCK_STAKING_ENABLED=true
DEFAULT_STAKING_PROVIDER=mock
DEFAULT_STAKING_NETWORK=hoodi
MOCK_STAKING_STORE_PATH=.mock-staking/validators.json
```

The provider persists demo validators to `.mock-staking/validators.json` by default.

## Demo Flow

1. Connect a wallet or enter a wallet address.
2. Select Mock Provider.
3. Enter an amount, withdrawal address, and network.
4. Click `Stake with Mock Provider`.
5. Review the returned mock transaction payload.
6. Click `Confirm Mock Transaction`.
7. Use `Advance Status` until the validator becomes `Active`.
8. Click `Request Exit`.
9. Use `Advance Status` until `Withdrawable`.
10. Click `Mark Withdrawn`.

## Slashing Simulation

Use `Simulate Slashing` from development controls to move the validator to `slashed` and record a slash reason.

This is a mock slashing event for demo purposes. In real Ethereum staking, slashing can occur when a validator violates consensus rules, such as double signing or surround voting.

## API Routes

`GET /api/staking/providers`

Returns available providers. `mock` is enabled when `MOCK_STAKING_ENABLED` is not `false`; `figment` and `kiln` are placeholders.

`POST /api/staking/providers/mock/stake`

Creates a mock stake request.

Input:

```json
{
  "walletAddress": "0x...",
  "amountEth": "32",
  "withdrawalAddress": "0x...",
  "network": "hoodi"
}
```

Output includes `stakeRequestId`, `validatorId`, `status`, `validator`, and `mockUnsignedTx`.

`GET /api/staking/validators/:validatorId`

Returns persisted mock validator status and metadata.

`POST /api/staking/validators/:validatorId/confirm`

Confirms the mock deposit transaction and moves the validator to `deposit_submitted`.

`POST /api/staking/validators/:validatorId/advance`

Development/debug route that advances to the next lifecycle state.

`POST /api/staking/validators/:validatorId/exit`

Requests exit. This is valid only when the validator is `active`.

`POST /api/staking/validators/:validatorId/slash`

Development/debug route that records a mock slashing event.

`POST /api/staking/validators/:validatorId/withdraw`

Marks a `withdrawable` validator as `withdrawn`.

## Replacement Path

The provider interface is in `src/lib/staking-provider.ts`:

- `createStakeRequest`
- `getValidatorStatus`
- `requestExit`
- `getProviderInfo`

`src/lib/mock-staking-provider.ts` implements the interface with local JSON persistence. Future real providers can implement the same interface for Figment, Kiln, Blockdaemon, or another API, replacing mock transaction payload generation with real unsigned transaction/deposit data and provider status lookups.
