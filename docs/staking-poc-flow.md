# Staking POC Flow

## 1. Purpose

This POC demonstrates the main Ethereum validator staking lifecycle for an engineering demo. It shows how a user can create a staking request, inspect validator metadata, move a validator through lifecycle states, request exit, withdraw, and simulate slashing.

The current app has three modes:

- Mock Provider Mode: API-backed local simulation. This is the main provider-abstraction flow. It uses a mock provider and local JSON storage. It does not create a real Ethereum validator.
- Simulator Mode: local smart contract simulation using wagmi and viem. It sends real wallet transactions to the configured demo contract address, but the contract itself is a simplified simulator, not real Ethereum consensus staking.
- Figment Direct Mode: backend-only Figment API preview flow. It can request validator/deposit preview data from Figment when configured, but Phase B1 does not send the 32 ETH deposit transaction from the app.

Wallet connection is real through RainbowKit and wagmi. Mock Provider Mode uses the connected wallet address only as an input/default value; it does not ask the wallet to sign the returned mock transaction.

## 2. High-Level Architecture

The frontend is a Next.js App Router React app. The backend is implemented as Next.js route handlers under `src/app/api`. The provider abstraction lives in `src/lib/staking-provider.ts`; the current full implementation is the mock provider in `src/lib/mock-staking-provider.ts`.

```text
Browser / React UI
  |
  | wagmi + RainbowKit wallet state
  | fetch()
  v
Next.js API routes
  |
  +-- MockStakingProvider
  |     |
  |     +-- .mock-staking/validators.json
  |
  +-- Figment client helpers
  |     |
  |     +-- Figment API, backend only
  |
  +-- Simulator Mode frontend contract calls
        |
        +-- wagmi / viem
        +-- MockEthereumStaking demo contract
```

Architecture pieces:

- Frontend: `src/app/page.tsx` chooses between Mock Provider Mode, Simulator Mode, and Figment Direct Mode.
- Main mock UI: `src/components/MockProviderDemo.tsx`.
- Backend routes: `src/app/api/staking/**` and `src/app/api/figment/**`.
- Provider layer: `src/lib/staking-provider.ts`.
- Mock provider: `src/lib/mock-staking-provider.ts`.
- Wallet / Ethereum SDK: RainbowKit, wagmi, and viem.
- Storage layer: local JSON file from `MOCK_STAKING_STORE_PATH`, default `.mock-staking/validators.json`.
- Smart contract simulator: `src/MockEthereumStaking.sol` plus ABI helpers in `src/lib/contract.ts`.
- External provider integration: Figment helpers in `src/lib/figment.ts`; Kiln and Figment are placeholders in the generic provider list.

## 3. Main User Flow

1. Connect wallet or enter wallet address
   - Frontend: `WalletStatus()` in `src/components/WalletStatus.tsx` uses RainbowKit `ConnectButton`.
   - Frontend: `MockProviderDemo()` reads `useAccount()` and pre-fills wallet and withdrawal address fields.
   - Backend: no API call is required for wallet connection.
   - Provider: no provider call yet.

2. Select staking provider
   - Frontend: `MockProviderDemo()` calls `GET /api/staking/providers` on mount.
   - Backend route: `GET()` in `src/app/api/staking/providers/route.ts`.
   - Service/provider: `getAvailableStakingProviders()` returns mock, Figment, and Kiln provider metadata.
   - Current result: mock is the only enabled provider unless `MOCK_STAKING_ENABLED=false`.

3. Enter stake amount and withdrawal address
   - Frontend: `MockProviderDemo()` stores `walletAddress`, `withdrawalAddress`, `amountEth`, and `network` in React state.
   - Validation: frontend checks wallet and withdrawal addresses with viem `isAddress()`.
   - Backend validation also happens when the stake request is created.

4. Create staking request
   - Frontend function: `createStake()` in `src/components/MockProviderDemo.tsx`.
   - API call: `POST /api/staking/providers/mock/stake`.
   - Backend route: `POST()` in `src/app/api/staking/providers/mock/stake/route.ts`.
   - Provider function: `MockStakingProvider.createStakeRequest()`.
   - Output: `stakeRequestId`, `validatorId`, `mockUnsignedTx`, and a `validator` record in `pending_deposit`.

5. Sign or confirm transaction
   - Mock Provider Mode: there is no real wallet signature. The user clicks `Confirm Mock Transaction`.
   - Frontend function: `runValidatorAction("confirm")`.
   - API call: `POST /api/staking/validators/:validatorId/confirm`.
   - Backend function: `confirmMockStake()`.
   - State transition: `pending_deposit` to `deposit_submitted`.
   - Simulator Mode: `stake()` calls `writeContractAsync()` and waits for a real transaction receipt on the configured demo contract.

6. Create validator record
   - Mock Provider Mode creates and persists the validator during `createStakeRequest()`.
   - File storage: `saveValidator()` writes to the configured JSON store.
   - Mock fields include `mockValidatorPubkey`, `publicKey`, `stakeRequestId`, timestamps, provider, network, wallet address, and withdrawal address.

7. Track validator lifecycle
   - Frontend function: `loadValidator()` calls `GET /api/staking/validators/:validatorId`.
   - Frontend function: `runValidatorAction("advance")` calls `POST /api/staking/validators/:validatorId/advance`.
   - Backend functions: `MockStakingProvider.getValidatorStatus()` and `advanceMockValidator()`.
   - State transition: `deposit_submitted` to `activation_pending` to `active`, then later exit states.

8. Request exit
   - Frontend function: `runValidatorAction("exit")`.
   - API call: `POST /api/staking/validators/:validatorId/exit`.
   - Backend route: `POST()` in `src/app/api/staking/validators/[validatorId]/exit/route.ts`.
   - Provider function: `MockStakingProvider.requestExit()`.
   - Validation: validator must be `active`.
   - State transition: `active` to `exit_requested`.

9. Withdraw / mark withdrawn
   - Frontend function: `runValidatorAction("withdraw")`.
   - API call: `POST /api/staking/validators/:validatorId/withdraw`.
   - Backend function: `markMockWithdrawn()`.
   - Validation: validator must be `withdrawable`.
   - State transition: `withdrawable` to `withdrawn`.

10. Simulate slashing
    - Frontend function: `runValidatorAction("slash")`.
    - API call: `POST /api/staking/validators/:validatorId/slash`.
    - Backend function: `slashMockValidator()`.
    - Validation: withdrawn validators cannot be slashed.
    - State transition: any non-withdrawn mock validator to `slashed`.

## 4. Important Frontend Function Calls

### `Home()`

- File: `src/app/page.tsx`
- Purpose: Main dashboard component. Selects app mode and owns shared wallet, simulator, and Figment state.
- Inputs: none directly; reads wallet state and environment-derived contract config.
- Output: renders Mock Provider Mode, Simulator Mode, or Figment Direct Mode.
- Used when: the app page loads.

### `MockProviderDemo()`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Main API-backed mock staking UI.
- Inputs: connected wallet address from `useAccount()`.
- Output: renders provider cards, stake form, validator lookup, lifecycle timeline, transaction payload, and demo controls.
- Used when: user selects Mock Provider Mode.

### `createStake()`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Creates a mock staking request from the UI.
- Inputs: `walletAddress`, `withdrawalAddress`, `amountEth`, `network`.
- Calls: `POST /api/staking/providers/mock/stake`.
- Output: updates `validator`, `validatorIdInput`, and `mockUnsignedTx`.
- Used when: user clicks `Stake with Mock Provider`.

### `loadValidator()`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Loads a persisted mock validator by ID.
- Inputs: validator ID string.
- Calls: `GET /api/staking/validators/:validatorId`.
- Output: updates current `validator` state.
- Used when: user clicks `Load`.

### `runValidatorAction(action)`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Sends lifecycle actions for the current mock validator.
- Inputs: action name: `confirm`, `advance`, `exit`, `slash`, or `withdraw`.
- Calls: `POST /api/staking/validators/:validatorId/:action`.
- Output: updates current validator, success/error state, and optionally `mockExitTx`.
- Used when: user clicks demo lifecycle controls.

### `WalletStatus()`

- File: `src/components/WalletStatus.tsx`
- Purpose: Displays wallet connection, chain ID, and configured simulator contract address.
- Inputs: wagmi `useAccount()`, `useChainId()`, and `MOCK_STAKING_ADDRESS`.
- Output: wallet status UI and RainbowKit connect button.
- Used when: dashboard renders in any mode.

### `stake()`

- File: `src/app/page.tsx`
- Purpose: Sends a real wallet transaction to the local `MockEthereumStaking` simulator contract.
- Inputs: connected wallet, `withdrawalAddress`.
- Calls: wagmi `writeContractAsync()` with function `stake` and `REQUIRED_STAKE`.
- Output: waits for receipt, decodes `ValidatorStaked`, stores selected validator ID.
- Used when: user clicks stake in Simulator Mode.

### `executeAction(action)`

- File: `src/app/page.tsx`
- Purpose: Sends simulator contract lifecycle transactions.
- Inputs: action from `ActionPanel`, selected validator ID, slash reason.
- Calls: wagmi `writeContractAsync()` for `advanceEpoch`, `activateValidator`, `simulateReward`, `simulatePenalty`, `requestExit`, `slashValidator`, `markWithdrawable`, or `withdraw`.
- Output: transaction receipt, refreshed validator state, timeline entry.
- Used when: user clicks simulator action buttons.

### `requestFigmentValidator()`

- File: `src/app/page.tsx`
- Purpose: Requests Figment validator/deposit preview data through the backend.
- Inputs: `withdrawalAddress`, `numberOfValidators`.
- Calls: `POST /api/figment/validators/request`.
- Output: stores Figment result and deposit preview.
- Used when: user clicks request in Figment Direct Mode.

### `checkFigmentStatus()`

- File: `src/app/page.tsx`
- Purpose: Loads Figment validator status through the backend.
- Inputs: `validatorIdentifier`.
- Calls: `GET /api/figment/validators/status?validatorIdentifier=...`.
- Output: stores Figment status response.
- Used when: user checks status in Figment Direct Mode.

## 5. Important Backend Function Calls

### `GET /api/staking/providers`

- File: `src/app/api/staking/providers/route.ts`
- Function: `GET()`
- Purpose: Lists configured staking provider options.
- Input: none.
- Output: `ok`, `defaultProvider`, `defaultNetwork`, `providers`.
- Validation rules: none.
- Related state transition: none.

### `POST /api/staking/providers/mock/stake`

- File: `src/app/api/staking/providers/mock/stake/route.ts`
- Function: `POST()`
- Purpose: Creates a mock stake request and validator record.
- Input body: `walletAddress`, `amountEth`, `withdrawalAddress`, `network`.
- Output: `stakeRequestId`, `validatorId`, `provider`, `network`, `status`, `mockUnsignedTx`, `validator`.
- Validation rules: mock provider must be enabled; wallet and withdrawal addresses must be valid; amount must be greater than 0; network must be `hoodi`, `holesky`, or `local`.
- Related state transition: new validator starts at `pending_deposit`.

### `GET /api/staking/validators/:validatorId`

- File: `src/app/api/staking/validators/[validatorId]/route.ts`
- Function: `GET()`
- Purpose: Reads a persisted mock validator.
- Params: `validatorId`.
- Output: `ok`, `validator`.
- Validation rules: validator must exist.
- Related state transition: none.

### `POST /api/staking/validators/:validatorId/confirm`

- File: `src/app/api/staking/validators/[validatorId]/confirm/route.ts`
- Function: `POST()`
- Purpose: Confirms the mock deposit.
- Params: `validatorId`.
- Output: `ok`, `validator`.
- Validation rules: current status must be `pending_deposit`.
- Related state transition: `pending_deposit` to `deposit_submitted`.

### `POST /api/staking/validators/:validatorId/advance`

- File: `src/app/api/staking/validators/[validatorId]/advance/route.ts`
- Function: `POST()`
- Purpose: Moves a mock validator to the next lifecycle state for demo control.
- Params: `validatorId`.
- Output: `ok`, `validator`.
- Validation rules: validator must have a next state; `slashed` and `withdrawn` cannot advance.
- Related state transition: follows `mockLifecycle`.

### `POST /api/staking/validators/:validatorId/exit`

- File: `src/app/api/staking/validators/[validatorId]/exit/route.ts`
- Function: `POST()`
- Purpose: Requests mock validator exit.
- Params: `validatorId`.
- Output: `ok`, `validator`, `mockExitTx`.
- Validation rules: current status must be `active`.
- Related state transition: `active` to `exit_requested`.

### `POST /api/staking/validators/:validatorId/withdraw`

- File: `src/app/api/staking/validators/[validatorId]/withdraw/route.ts`
- Function: `POST()`
- Purpose: Marks a mock validator withdrawn.
- Params: `validatorId`.
- Output: `ok`, `validator`.
- Validation rules: current status must be `withdrawable`.
- Related state transition: `withdrawable` to `withdrawn`.

### `POST /api/staking/validators/:validatorId/slash`

- File: `src/app/api/staking/validators/[validatorId]/slash/route.ts`
- Function: `POST()`
- Purpose: Records a mock slashing event.
- Params: `validatorId`.
- Input body: optional `slashReason`.
- Output: `ok`, `validator`.
- Validation rules: current status must not be `withdrawn`.
- Related state transition: non-withdrawn state to `slashed`.

### `MockStakingProvider.createStakeRequest(input)`

- File: `src/lib/mock-staking-provider.ts`
- Purpose: Validates input, creates IDs, creates fake public key data, persists the validator, and returns a mock unsigned deposit transaction.
- Input: `CreateStakeInput`.
- Output: `CreateStakeResult`.
- Validation rules: address, amount, network, mock enabled.
- Related state transition: creates `pending_deposit`.

### `confirmMockStake(validatorId)`

- File: `src/lib/mock-staking-provider.ts`
- Purpose: Adds a fake deposit transaction hash and marks deposit submitted.
- Input: `validatorId`.
- Output: updated validator.
- Validation rules: status must be `pending_deposit`.
- Related state transition: `pending_deposit` to `deposit_submitted`.

### `advanceMockValidator(validatorId)`

- File: `src/lib/mock-staking-provider.ts`
- Purpose: Advances status using `nextMockLifecycleStatus()`.
- Input: `validatorId`.
- Output: updated validator.
- Validation rules: next state must exist.
- Related state transition: next status in `mockLifecycle`.

### `MockStakingProvider.requestExit(validatorId)`

- File: `src/lib/mock-staking-provider.ts`
- Purpose: Marks exit requested and returns a mock exit transaction payload.
- Input: `validatorId`.
- Output: updated validator and `mockExitTx`.
- Validation rules: status must be `active`.
- Related state transition: `active` to `exit_requested`.

### `requestFigmentValidators(input)`

- File: `src/lib/figment.ts`
- HTTP route: `POST /api/figment/validators/request`.
- Purpose: Calls Figment API from the backend and normalizes validator/deposit preview data.
- Input body: `withdrawalAddress`, `numberOfValidators`, optional `fundingAddress`.
- Output: `network`, optional `validatorIdentifier`, `depositData`, `unsignedTransaction`, `depositPreview`, `raw`.
- Validation rules: Hoodi only; valid withdrawal/funding address; positive validator count; Figment env vars required.
- Related state transition: none in local mock lifecycle.

## 6. SDK / Library Usage

### wagmi

- Imported in: `src/app/page.tsx`, `src/components/MockProviderDemo.tsx`, `src/components/WalletStatus.tsx`, `src/lib/wagmi.ts`, `src/app/providers.tsx`.
- Why: wallet account state, chain ID, public client reads, and contract writes.
- Key functions: `useAccount()`, `useChainId()`, `usePublicClient()`, `useWriteContract()`, `WagmiProvider`, `getDefaultConfig()`.
- Usage type: real wallet connection and real simulator contract transactions in Simulator Mode; wallet address display/default input in Mock Provider Mode.

### viem

- Imported in: `src/app/page.tsx`, `src/lib/contract.ts`, `src/lib/mock-staking-provider.ts`, `src/lib/staking-provider.ts`, `src/lib/types.ts`, `src/lib/figment.ts`, `src/components/MockProviderDemo.tsx`.
- Why: Ethereum address/hash types, address validation, ETH parsing/formatting, event decoding, and fake hash generation.
- Key functions: `isAddress()`, `parseEther()`, `formatEther()`, `decodeEventLog()`, `keccak256()`, `toBytes()`.
- Usage type: validation and formatting across all modes; real contract event decoding in Simulator Mode; mock hash generation in Mock Provider Mode.

### RainbowKit

- Imported in: `src/lib/wagmi.ts`, `src/app/providers.tsx`, `src/components/WalletStatus.tsx`.
- Why: wallet connection UI and default wallet configuration.
- Key functions/components: `getDefaultConfig()`, `RainbowKitProvider`, `ConnectButton`.
- Usage type: real wallet connection UI.

### React Query

- Imported in: `src/app/providers.tsx`.
- Why: required provider setup for wagmi/RainbowKit data flows.
- Key functions: `QueryClient`, `QueryClientProvider`.
- Usage type: frontend state/data support, not staking-specific business logic.

### Next.js route handlers

- Imported/used in: `src/app/api/**/route.ts`.
- Why: backend API layer for mock provider and Figment integration.
- Key functions: exported `GET()` and `POST()` handlers, `Response.json()`.
- Usage type: backend-only API calls and local provider operations.

### Figment HTTP API

- Imported/used in: `src/lib/figment.ts`.
- Why: external provider preview/status integration.
- Key functions: `figmentHealth()`, `requestFigmentValidators()`, `getFigmentValidatorStatus()`.
- Usage type: real external provider API calls from backend only when configured.

### Solidity / Foundry

- Files: `src/MockEthereumStaking.sol`, `test/MockEthereumStaking.t.sol`, `foundry.toml`.
- Why: local smart contract simulator and tests.
- Key contract functions: `stake`, `activateValidator`, `simulateReward`, `simulatePenalty`, `requestExit`, `slashValidator`, `markWithdrawable`, `withdraw`, `advanceEpoch`, `getValidator`.
- Usage type: local simulation contract, not real Ethereum validator deposit infrastructure.

## 7. Validator Lifecycle

Mock Provider Mode lifecycle:

| From | Action | To | Trigger |
|---|---|---|---|
| none | create stake request | pending_deposit | user clicks `Stake with Mock Provider` |
| pending_deposit | confirm mock tx | deposit_submitted | user clicks `Confirm Mock Transaction` |
| deposit_submitted | advance | activation_pending | demo transition |
| activation_pending | advance | active | demo transition |
| active | request exit | exit_requested | user clicks `Request Exit` |
| exit_requested | advance | exiting | demo transition |
| exiting | advance | withdrawable | demo transition |
| withdrawable | mark withdrawn | withdrawn | user clicks `Mark Withdrawn` |
| any non-withdrawn state | simulate slashing | slashed | user clicks `Simulate Slashing` |

The mock lifecycle array is defined in `src/lib/staking-provider.ts`:

```text
draft -> pending_deposit -> deposit_submitted -> activation_pending -> active -> exit_requested -> exiting -> withdrawable -> withdrawn
```

In practice, new mock validators are created directly as `pending_deposit`; `draft` exists as a type/lifecycle concept but is not persisted by `createStakeRequest()`.

Simulator Mode lifecycle:

| From | Action | To | Trigger |
|---|---|---|---|
| None | `stake` | PendingActivation | wallet transaction to `stake()` |
| PendingActivation | `activateValidator` | Active | current epoch reaches activation epoch |
| Active | `requestExit` | Exiting | validator owner requests exit |
| Active | `slashValidator` | Slashed | simulator slashing action |
| Exiting or Slashed | `markWithdrawable` | Withdrawable | current epoch reaches withdrawable epoch |
| Withdrawable | `withdraw` | Withdrawn | withdrawal address calls `withdraw()` |

## 8. API Reference

### `GET /api/staking/providers`

Request body: none.

Response body:

```json
{
  "ok": true,
  "defaultProvider": "mock",
  "defaultNetwork": "hoodi",
  "providers": [
    {
      "id": "mock",
      "name": "Mock Provider",
      "enabled": true,
      "realProvider": false,
      "description": "Demo-only provider that simulates validator lifecycle data locally."
    }
  ]
}
```

Example:

```sh
curl http://localhost:3000/api/staking/providers
```

### `POST /api/staking/providers/mock/stake`

Request body:

```json
{
  "walletAddress": "0x1111111111111111111111111111111111111111",
  "withdrawalAddress": "0x2222222222222222222222222222222222222222",
  "amountEth": "32",
  "network": "hoodi"
}
```

Response body:

```json
{
  "ok": true,
  "stakeRequestId": "mock-stake-example",
  "validatorId": "mock-val-example",
  "provider": "mock",
  "network": "hoodi",
  "status": "pending_deposit",
  "mockUnsignedTx": {
    "kind": "mock_deposit",
    "from": "0x1111111111111111111111111111111111111111",
    "to": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    "valueEth": "32",
    "data": "0xabc123...",
    "chainHint": "hoodi",
    "disclaimer": "Demo/test data only. This mock transaction does not create or exit a real Ethereum validator."
  },
  "validator": {
    "id": "mock-val-example",
    "status": "pending_deposit",
    "demoOnly": true
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/staking/providers/mock/stake \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"0x1111111111111111111111111111111111111111","withdrawalAddress":"0x2222222222222222222222222222222222222222","amountEth":"32","network":"hoodi"}'
```

### `GET /api/staking/validators/:validatorId`

Request body: none.

Response body:

```json
{
  "ok": true,
  "validator": {
    "id": "mock-val-example",
    "provider": "mock",
    "network": "hoodi",
    "walletAddress": "0x1111111111111111111111111111111111111111",
    "withdrawalAddress": "0x2222222222222222222222222222222222222222",
    "amountEth": "32",
    "status": "deposit_submitted",
    "demoOnly": true
  }
}
```

Example:

```sh
curl http://localhost:3000/api/staking/validators/mock-val-example
```

### `POST /api/staking/validators/:validatorId/confirm`

Request body: none.

Response body:

```json
{
  "ok": true,
  "validator": {
    "id": "mock-val-example",
    "status": "deposit_submitted",
    "depositTxHash": "0xabc123...",
    "demoOnly": true
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/confirm
```

### `POST /api/staking/validators/:validatorId/advance`

Request body: none.

Response body:

```json
{
  "ok": true,
  "validator": {
    "id": "mock-val-example",
    "status": "activation_pending",
    "demoOnly": true
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/advance
```

### `POST /api/staking/validators/:validatorId/exit`

Request body: none.

Response body:

```json
{
  "ok": true,
  "validator": {
    "id": "mock-val-example",
    "status": "exit_requested",
    "exitTxHash": "0xabc123...",
    "demoOnly": true
  },
  "mockExitTx": {
    "kind": "mock_exit",
    "valueEth": "0",
    "chainHint": "hoodi"
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/exit
```

### `POST /api/staking/validators/:validatorId/withdraw`

Request body: none.

Response body:

```json
{
  "ok": true,
  "validator": {
    "id": "mock-val-example",
    "status": "withdrawn",
    "withdrawnAt": "2026-01-01T00:00:00.000Z",
    "demoOnly": true
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/withdraw
```

### `POST /api/staking/validators/:validatorId/slash`

Request body:

```json
{
  "slashReason": "Mock double signing event"
}
```

Response body:

```json
{
  "ok": true,
  "validator": {
    "id": "mock-val-example",
    "status": "slashed",
    "slashReason": "Mock double signing event",
    "demoOnly": true
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/slash \
  -H 'Content-Type: application/json' \
  -d '{"slashReason":"Mock double signing event"}'
```

### `GET /api/figment/health`

Request body: none.

Response body:

```json
{
  "ok": true,
  "mode": "live",
  "network": "hoodi",
  "baseUrl": "https://api.figment.io"
}
```

Example:

```sh
curl http://localhost:3000/api/figment/health
```

### `POST /api/figment/validators/request`

Request body:

```json
{
  "withdrawalAddress": "0x2222222222222222222222222222222222222222",
  "numberOfValidators": 1
}
```

Response body:

```json
{
  "ok": true,
  "network": "hoodi",
  "validatorIdentifier": "example-validator",
  "depositPreview": {
    "valueEth": "32",
    "depositContractAddress": "0x0000000000000000000000000000000000000000"
  }
}
```

Example:

```sh
curl -X POST http://localhost:3000/api/figment/validators/request \
  -H 'Content-Type: application/json' \
  -d '{"withdrawalAddress":"0x2222222222222222222222222222222222222222","numberOfValidators":1}'
```

### `GET /api/figment/validators/status`

Request body: none. Use either `validatorIdentifier` or `withdrawalAddress` query param.

Response body:

```json
{
  "ok": true,
  "network": "hoodi",
  "status": {}
}
```

Example:

```sh
curl 'http://localhost:3000/api/figment/validators/status?validatorIdentifier=example-validator'
```

## 9. Environment Variables

Variables currently present in `.env.example`:

```env
NEXT_PUBLIC_MOCK_STAKING_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo
FIGMENT_MODE=live
FIGMENT_API_BASE_URL=https://api.figment.io
FIGMENT_API_KEY=
FIGMENT_ETH_NETWORK=hoodi
NEXT_PUBLIC_ETH_NETWORK=hoodi
NEXT_PUBLIC_ETH_DEPOSIT_CONTRACT_ADDRESS=
NEXT_PUBLIC_ENABLE_REAL_STAKING=false
MOCK_STAKING_ENABLED=true
DEFAULT_STAKING_PROVIDER=mock
DEFAULT_STAKING_NETWORK=hoodi
MOCK_STAKING_STORE_PATH=.mock-staking/validators.json
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_api_key
```

How they are used:

- `NEXT_PUBLIC_MOCK_STAKING_ADDRESS`: frontend simulator contract address. If it is the zero address, Simulator Mode disables contract actions.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: RainbowKit/wagmi wallet connector project ID.
- `FIGMENT_MODE`: returned in Figment health response; defaults to `live`.
- `FIGMENT_API_BASE_URL`: backend Figment API base URL.
- `FIGMENT_API_KEY`: backend-only Figment API key. Never expose this in frontend code.
- `FIGMENT_ETH_NETWORK`: Figment network; current code only supports `hoodi` and rejects mainnet.
- `NEXT_PUBLIC_ETH_NETWORK`: public network label/config value from env example. It is not currently read by the staking code.
- `NEXT_PUBLIC_ETH_DEPOSIT_CONTRACT_ADDRESS`: optional frontend-visible deposit contract address used in Figment deposit preview fallback.
- `NEXT_PUBLIC_ENABLE_REAL_STAKING`: public feature flag in env example. It is not currently enforced by the staking code.
- `MOCK_STAKING_ENABLED`: enables/disables the mock provider. Any value other than `false` enables it.
- `DEFAULT_STAKING_PROVIDER`: returned by `GET /api/staking/providers`; defaults to `mock`.
- `DEFAULT_STAKING_NETWORK`: returned by provider list and used as mock default network; defaults to `hoodi`.
- `MOCK_STAKING_STORE_PATH`: local JSON storage path for mock validators.
- `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `ETHERSCAN_API_KEY`: deployment/verification-related values for Foundry or external tooling, not used by the Next.js staking API routes.

Recommended but not currently required:

```env
REAL_STAKING_PROVIDER=figment
KILN_API_KEY=
BLOCKDAEMON_API_KEY=
PROVIDER_WEBHOOK_SECRET=
```

These should stay backend-only if real provider integrations are added.

## 10. Mock vs Real Staking

Mock Provider Mode currently simulates validator creation and lifecycle transitions through `MockStakingProvider`. It returns fake validator public keys, fake transaction hashes, and mock unsigned transaction payloads. It does not send ETH, call the Ethereum deposit contract, create Beacon Chain deposit data, operate validator clients, or perform real withdrawals.

Simulator Mode sends real wallet transactions, but only to `MockEthereumStaking`, a simplified local/deployed demo contract. It is useful for showing contract state transitions, but it is not real Ethereum staking.

Figment Direct Mode is the closest path to a real provider integration. It calls Figment from backend route handlers and can return validator/deposit preview data. In the current implementation, the frontend displays the preview and status, but it does not submit the real deposit transaction.

The mock provider is useful for product demos, UI review, and explaining lifecycle concepts. It should not be treated as staking infrastructure.

## 11. Future Real Provider Integration

The replacement point is the provider interface in `src/lib/staking-provider.ts`:

- `createStakeRequest(input)`
- `getValidatorStatus(validatorId)`
- `requestExit(validatorId)`
- `getProviderInfo()`

A real Kiln, Figment, Blockdaemon, or other provider client should be implemented as a backend-only class or module beside `src/lib/mock-staking-provider.ts`. It should return the same high-level shape where practical, but with real provider request IDs, real validator/deposit data, and real status fields.

Recommended integration rules:

- Store provider API keys only in backend environment variables such as `FIGMENT_API_KEY`, `KILN_API_KEY`, or `BLOCKDAEMON_API_KEY`.
- Never use `NEXT_PUBLIC_` for provider secrets.
- Route all provider API calls through Next.js backend route handlers.
- Keep frontend calls pointed at local API routes, not third-party provider APIs.
- Add provider-specific validation and error mapping in the backend.
- Decide explicitly whether the provider returns unsigned transactions for wallet signing or whether the backend only creates provider-side requests.
- Add webhook handling only with signature verification and a backend-only `PROVIDER_WEBHOOK_SECRET`.
- Keep Mock Provider Mode available for demos so real provider failures do not block UI walkthroughs.
