# Staking POC Presentation Material

## 1. Presentation Goal

The goal of this presentation is to introduce the Ethereum staking lifecycle POC to engineers and project members.

- Introduce the current staking POC and the three app modes: Mock Provider Mode, Simulator Mode, and Figment Direct Mode.
- Explain why Mock Provider Mode is useful for demos: it avoids real ETH, provider approvals, long validator timing, and hard-to-trigger lifecycle events.
- Show how the staking lifecycle is demonstrated from stake request through deposit confirmation, activation, exit, withdrawal, and slashing.
- Clarify what is mock versus real:
  - Mock Provider Mode is demo/test data only.
  - Simulator Mode can send transactions to the local/deployed `MockEthereumStaking` contract when configured.
  - Figment Direct Mode calls backend Figment API routes but does not send deposits in Phase B1.
- Explain how a future Kiln, Figment, Blockdaemon, or other provider client can replace the mock provider through the provider interface.

## 2. Target Audience

- Backend engineers who need to understand API route responsibilities and provider boundaries.
- Frontend engineers who need to understand the UI flow and important client-side function calls.
- Blockchain engineers who need to understand the mock lifecycle versus real Ethereum validator behavior.
- Product and project members who need a clear demo story for the staking flow and current limitations.

## 3. Suggested Slide Outline

### Slide 1: Ethereum Staking POC

- Key message: This project demonstrates Ethereum validator staking flows without requiring a real validator deposit for the main demo.
- Suggested visual: Screenshot of the home page in Mock Provider Mode.
- Bullet points:
  - Next.js dashboard for staking lifecycle demos.
  - Route B mock provider is the safest presentation path.
  - Simulator and Figment modes exist as separate paths.
- Speaker notes: Start by saying the POC is for explaining the lifecycle and validating UI/API flow, not for creating production validators.
- Codebase references: `src/app/page.tsx`, `src/components/MockProviderDemo.tsx`, `README.md`.

### Slide 2: Why This POC Exists

- Key message: Real staking is hard to demo live.
- Suggested visual: Problem list beside a short demo-flow timeline.
- Bullet points:
  - Real Ethereum validator staking normally uses 32 ETH per validator.
  - Provider access may require API approval and credentials.
  - Validator activation, exit, and withdrawal are not instant.
  - Slashing is not something to trigger in a live demo.
- Speaker notes: Explain that the POC turns a long, risky, external process into a controlled engineering demo.
- Codebase references: `docs/staking-mock-provider.md`, `README.md`.

### Slide 3: Real Staking Demo Challenges

- Key message: The real-world dependencies make live demos brittle.
- Suggested visual: Risk table showing ETH, API keys, timing, and slashing.
- Bullet points:
  - Real deposits require signing and submitting deposit transactions.
  - Provider API keys must stay server-side.
  - Beacon-chain status changes are asynchronous.
  - Slashing is a consensus-layer event, not a button in production.
- Speaker notes: Frame the mock provider as a safe first step before production integration.
- Codebase references: `.env.example`, `src/lib/figment.ts`, `src/MockEthereumStaking.sol`.

### Slide 4: Route B Mock Provider Approach

- Key message: Route B simulates provider behavior locally through backend API routes.
- Suggested visual: User -> frontend -> staking API -> mock provider -> JSON store.
- Bullet points:
  - `MockStakingProvider` implements `StakingProvider`.
  - Mock validators are saved in a local JSON file.
  - API routes expose stake, status, confirm, advance, exit, slash, and withdraw actions.
  - Returned transactions are mock payloads with explicit disclaimers.
- Speaker notes: Emphasize that this mode does not create real Ethereum validators.
- Codebase references: `src/lib/staking-provider.ts`, `src/lib/mock-staking-provider.ts`, `src/app/api/staking`.

### Slide 5: User Flow

- Key message: The demo flow is a simple end-to-end validator journey.
- Suggested visual: Flow diagram from wallet address entry to withdrawn/slashed state.
- Bullet points:
  - Enter wallet address and withdrawal address.
  - Create stake with Mock Provider.
  - Confirm mock transaction.
  - Advance lifecycle states.
  - Request exit, advance, mark withdrawn, or simulate slashing.
- Speaker notes: Mention that wallet connection can prefill addresses, but Mock Provider Mode also accepts typed addresses.
- Codebase references: `src/components/MockProviderDemo.tsx`, `src/lib/staking-provider.ts`.

### Slide 6: System Architecture

- Key message: The architecture keeps the frontend calling backend APIs instead of provider APIs directly.
- Suggested visual: Architecture diagram with frontend, Next.js API routes, provider interface, mock provider, and JSON store.
- Bullet points:
  - Frontend components call `/api/staking/...`.
  - Backend routes instantiate or call mock-provider functions.
  - Provider interface defines the replacement boundary.
  - Mock state persists to `MOCK_STAKING_STORE_PATH`.
- Speaker notes: This boundary is important for future real provider keys.
- Codebase references: `src/app/api/staking/providers/mock/stake/route.ts`, `src/lib/mock-staking-provider.ts`, `.env.example`.

### Slide 7: Provider Abstraction

- Key message: `StakingProvider` is the contract for provider replacement.
- Suggested visual: Interface box with Mock, Figment, Kiln provider boxes.
- Bullet points:
  - `createStakeRequest`
  - `getValidatorStatus`
  - `requestExit`
  - `getProviderInfo`
  - `PlaceholderProvider` exists for `kiln` and `figment`, but is not wired into the mock staking routes.
- Speaker notes: Real providers should implement this same interface or an evolved version of it.
- Codebase references: `src/lib/staking-provider.ts`.

### Slide 8: Important Frontend Function Calls

- Key message: `MockProviderDemo` is the main Route B frontend.
- Suggested visual: Annotated screenshot of stake form, validator dashboard, and demo controls.
- Bullet points:
  - `createStake` calls the mock stake API.
  - `loadValidator` loads stored validator status.
  - `runValidatorAction` calls confirm, advance, exit, slash, and withdraw routes.
  - `MockLifecycleTimeline` and `MockValidatorDetails` render status and metadata.
- Speaker notes: Keep the walkthrough focused on the functions that move the demo.
- Codebase references: `src/components/MockProviderDemo.tsx`.

### Slide 9: Important Backend Function Calls

- Key message: The backend routes are thin wrappers around provider functions.
- Suggested visual: Route table.
- Bullet points:
  - `POST /api/staking/providers/mock/stake`
  - `GET /api/staking/validators/[validatorId]`
  - `POST /api/staking/validators/[validatorId]/confirm`
  - `POST /api/staking/validators/[validatorId]/advance`
  - `POST /api/staking/validators/[validatorId]/exit`
  - `POST /api/staking/validators/[validatorId]/slash`
  - `POST /api/staking/validators/[validatorId]/withdraw`
- Speaker notes: Explain that route error responses use `mockProviderErrorResponse`.
- Codebase references: `src/app/api/staking`, `src/lib/mock-staking-provider.ts`.

### Slide 10: Validator Lifecycle

- Key message: Mock Provider Mode uses explicit string states; Simulator Mode uses Solidity enum states.
- Suggested visual: Lifecycle timeline.
- Bullet points:
  - Mock lifecycle: `draft`, `pending_deposit`, `deposit_submitted`, `activation_pending`, `active`, `exit_requested`, `exiting`, `withdrawable`, `withdrawn`.
  - Slashing moves to `slashed`, which is terminal for automatic advance.
  - Contract simulator lifecycle uses `PendingActivation`, `Active`, `Exiting`, `Slashed`, `Withdrawable`, `Withdrawn`.
- Speaker notes: Make it clear which lifecycle is being shown in the Route B demo.
- Codebase references: `src/lib/staking-provider.ts`, `src/lib/types.ts`, `src/MockEthereumStaking.sol`.

### Slide 11: Slashing Simulation

- Key message: Slashing is simulated for explanation, not detected from chain data.
- Suggested visual: Active validator moving to Slashed with reason text.
- Bullet points:
  - Mock Provider Mode accepts a slash reason string.
  - `slashMockValidator` sets status to `slashed` and records `slashedAt`.
  - Simulator Mode has `slashValidator` with enum reasons.
  - Real slashing would require consensus-layer proof/status data.
- Speaker notes: This lets a presenter explain slashing without causing a real event.
- Codebase references: `src/components/MockProviderDemo.tsx`, `src/lib/mock-staking-provider.ts`, `src/MockEthereumStaking.sol`.

### Slide 12: Mock vs Real Staking

- Key message: Mock Provider Mode is not real staking.
- Suggested visual: Mock vs production comparison table.
- Bullet points:
  - Mock validator public keys and transaction hashes are generated locally.
  - No real provider API is called in Mock Provider Mode.
  - No real deposit transaction is signed in Mock Provider Mode.
  - Figment Direct Mode can call Figment APIs, but Phase B1 does not send deposits.
- Speaker notes: State this clearly to avoid misunderstanding.
- Codebase references: `src/lib/mock-staking-provider.ts`, `src/lib/figment.ts`, `README.md`.

### Slide 13: Future Real Provider Integration

- Key message: A real provider can be added behind backend APIs.
- Suggested visual: Mock provider replaced by Real Provider Client.
- Bullet points:
  - Implement provider client for Kiln, Figment, Blockdaemon, or another provider.
  - Store provider API keys only in backend env variables.
  - Return unsigned deposit/exit data to frontend.
  - Track validator status from provider or beacon-chain data.
- Speaker notes: The current provider interface is a starting boundary, but it may need extension for production deposit signing and status tracking.
- Codebase references: `src/lib/staking-provider.ts`, `src/lib/figment.ts`, `.env.example`.

### Slide 14: Demo Script

- Key message: The presenter can run the full mock lifecycle in minutes.
- Suggested visual: Checklist with expected UI state after each action.
- Bullet points:
  - Open app and choose Mock Provider Mode.
  - Enter addresses and create stake.
  - Confirm mock transaction.
  - Advance to active.
  - Request exit, advance, mark withdrawn.
  - Create or load another validator and simulate slashing.
- Speaker notes: Use the validator dashboard and lifecycle panel as the main screens.
- Codebase references: `src/components/MockProviderDemo.tsx`, `docs/staking-mock-provider.md`.

### Slide 15: Current Limitations / TODO

- Key message: The POC is useful for demos, but production staking work remains.
- Suggested visual: TODO list grouped by provider, storage, chain tracking, and tests.
- Bullet points:
  - No real Kiln provider implementation.
  - Mock provider uses local JSON persistence.
  - Mock Provider Mode does not sign transactions.
  - No real beacon-chain status tracking in Route B.
  - Figment routes require real backend configuration and are Phase B1 only.
- Speaker notes: Close with a practical roadmap for turning the POC into production integration work.
- Codebase references: `src/lib/staking-provider.ts`, `src/lib/mock-staking-provider.ts`, `src/lib/figment.ts`, `test/mock-provider/lifecycle.test.mjs`.

## 4. Project Summary

The project is an Ethereum staking lifecycle POC built with Next.js, React, wagmi, viem, RainbowKit, Tailwind CSS, React Flow, Solidity, and Foundry.

- Staking mode status:
  - Mock Provider Mode is fully mock and API-backed. It persists demo validators locally and does not perform real staking.
  - Simulator Mode can send real transactions to a deployed `MockEthereumStaking` contract if `NEXT_PUBLIC_MOCK_STAKING_ADDRESS` is configured. This is a simulator contract, not real Ethereum consensus staking.
  - Figment Direct Mode has backend routes that call Figment API endpoints when configured, but the UI states "No deposit will be sent in Phase B1."
- Wallet connection exists through RainbowKit and wagmi in `src/app/providers.tsx` and `src/lib/wagmi.ts`.
- Transaction signing exists in Simulator Mode through `useWriteContract` in `src/app/page.tsx`.
- Mock Provider Mode does not sign real transactions; it returns `MockUnsignedTx` objects with a disclaimer.
- Mock validator states are persisted to a JSON file through `src/lib/mock-staking-provider.ts`. The default path is `.mock-staking/validators.json`, or `MOCK_STAKING_STORE_PATH` from env.
- Provider abstraction exists in `src/lib/staking-provider.ts`.
- Real provider SDKs are not imported. Figment integration uses direct `fetch` calls in `src/lib/figment.ts`.

## 5. Problem Statement

Real Ethereum staking is difficult to demonstrate live:

- Real Ethereum validator staking usually requires 32 ETH per validator.
- Real provider API access may require approval and server-side credentials.
- Validator activation, exit, and withdrawal are not instant.
- Slashing and lifecycle events are hard and unsafe to demo live.
- A frontend team still needs predictable data to validate UI flows, status labels, action states, and demo scripts.

This POC creates a safe simulation for explanation, UI validation, and backend route design before a production provider integration is added.

## 6. Proposed Solution

Route B uses a mock provider solution:

- `MockStakingProvider` simulates staking lifecycle data locally.
- Next.js backend API routes expose staking actions.
- The frontend shows provider selection, stake creation, mock transaction payloads, validator status, lifecycle progress, exit, withdrawal, and slashing.
- Development controls allow manually advancing state.
- The provider interface can later be replaced or extended for Kiln, Figment, Blockdaemon, or another provider.

## 7. High-Level Architecture

Route B Mock Provider Mode architecture:

```text
User
  |
  v
Frontend: MockProviderDemo
  |
  v
Next.js staking API routes
  |
  v
StakingProvider interface
  |
  v
MockStakingProvider
  |
  v
Local JSON validator state store
```

Other project paths:

```text
User wallet
  |
  v
Frontend: Simulator Mode in src/app/page.tsx
  |
  v
wagmi / viem
  |
  v
MockEthereumStaking simulator contract
```

```text
Frontend: Figment Direct Mode
  |
  v
Next.js Figment API routes
  |
  v
src/lib/figment.ts
  |
  v
Figment API over fetch
```

Architecture notes:

- Frontend: `src/app/page.tsx` chooses mode and renders `MockProviderDemo` for Route B.
- Backend: API route handlers live under `src/app/api/staking` and `src/app/api/figment`.
- Provider layer: `src/lib/staking-provider.ts`.
- Mock provider: `src/lib/mock-staking-provider.ts`.
- Wallet / Ethereum SDK: wagmi, viem, RainbowKit in `src/lib/wagmi.ts`, `src/app/providers.tsx`, and `src/app/page.tsx`.
- Storage: local JSON file through Node `fs/promises`.
- Environment variables: `.env.example` includes mock, Figment, wallet, and contract settings.

## 8. Main User Flow

| Step | Frontend component/function | Backend API route | Provider function | State change |
|---|---|---|---|---|
| 1. Connect wallet or enter wallet address | `MockProviderDemo`, `useAccount` | None | None | Wallet address and withdrawal address can be prefilled from wagmi account |
| 2. Select Mock Provider | `MockProviderDemo`, provider cards | `GET /api/staking/providers` | `getAvailableStakingProviders` | UI shows `mock` as selected and Figment/Kiln as coming soon |
| 3. Enter stake amount and withdrawal address | `MockProviderDemo` form state | None | None | Client validates addresses before submit |
| 4. Create stake request | `createStake` | `POST /api/staking/providers/mock/stake` | `MockStakingProvider.createStakeRequest` | New validator saved as `pending_deposit` |
| 5. Confirm mock transaction | `runValidatorAction("confirm")` | `POST /api/staking/validators/[validatorId]/confirm` | `confirmMockStake` | `pending_deposit` -> `deposit_submitted` |
| 6. Create mock validator | Same as step 4 | Same as step 4 | Same as step 4 | Validator record includes `id`, `mockValidatorPubkey`, addresses, amount, timestamps |
| 7. Advance validator lifecycle | `runValidatorAction("advance")` | `POST /api/staking/validators/[validatorId]/advance` | `advanceMockValidator` | Advances according to `nextMockLifecycleStatus` |
| 8. Request exit | `runValidatorAction("exit")` | `POST /api/staking/validators/[validatorId]/exit` | `MockStakingProvider.requestExit` | `active` -> `exit_requested` and sets `exitTxHash` |
| 9. Advance to withdrawable | `runValidatorAction("advance")` | `POST /api/staking/validators/[validatorId]/advance` | `advanceMockValidator` | `exit_requested` -> `exiting` -> `withdrawable` |
| 10. Mark withdrawn | `runValidatorAction("withdraw")` | `POST /api/staking/validators/[validatorId]/withdraw` | `markMockWithdrawn` | `withdrawable` -> `withdrawn` |
| 11. Simulate slashing | `runValidatorAction("slash")` | `POST /api/staking/validators/[validatorId]/slash` | `slashMockValidator` | Any non-`withdrawn` mock validator -> `slashed` |

## 9. Important Frontend Function Calls

### `MockProviderDemo`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Main Route B UI for provider selection, mock stake creation, validator loading, lifecycle controls, mock transaction previews, and validator details.
- Inputs: wagmi account address, user-entered wallet address, withdrawal address, amount, network, validator ID, slash reason.
- Outputs: Rendered mock provider demo state and local component state.
- API route called: Multiple routes under `/api/staking`.
- Demo step: Entire Mock Provider Mode demo.

### `createStake`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Validate addresses and create a mock stake request.
- Inputs: `walletAddress`, `amountEth`, `withdrawalAddress`, `network`.
- Calls: `POST /api/staking/providers/mock/stake`.
- Output: Updates `validator`, `validatorIdInput`, `mockUnsignedTx`, and success/error state.
- Demo step: Create stake request.

### `loadValidator`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Load a previously created mock validator by ID.
- Inputs: `validatorIdInput`.
- Calls: `GET /api/staking/validators/[validatorId]`.
- Output: Updates `validator`, `validatorIdInput`, and success/error state.
- Demo step: Show validator dashboard from persisted state.

### `runValidatorAction`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Run mock lifecycle actions from demo controls.
- Inputs: Action string: `confirm`, `advance`, `exit`, `slash`, or `withdraw`; for slash, `slashReason`.
- Calls:
  - `POST /api/staking/validators/[validatorId]/confirm`
  - `POST /api/staking/validators/[validatorId]/advance`
  - `POST /api/staking/validators/[validatorId]/exit`
  - `POST /api/staking/validators/[validatorId]/slash`
  - `POST /api/staking/validators/[validatorId]/withdraw`
- Output: Updates `validator`, optional `mockExitTx`, and success/error state.
- Demo step: Confirm deposit, advance lifecycle, request exit, mark withdrawn, simulate slashing.

### `MockLifecycleTimeline`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Render the mock lifecycle state timeline.
- Inputs: Current `MockValidatorStatus`.
- Outputs: Timeline UI using `mockLifecycle` and `mockStatusLabels`.
- API route called: None directly.
- Demo step: Explain lifecycle progression.

### `MockValidatorDetails`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Render validator metadata and timestamps.
- Inputs: `MockValidatorRecord`.
- Outputs: Dashboard fields such as validator ID, mock public key, provider, network, status, addresses, tx hashes, timestamps, and slash reason.
- API route called: None directly.
- Demo step: Show result after every state transition.

### `MockTransactionPanel`

- File: `src/components/MockProviderDemo.tsx`
- Purpose: Render mock deposit and mock exit transaction payloads.
- Inputs: `MockUnsignedTx`.
- Outputs: JSON payload with disclaimer.
- API route called: None directly.
- Demo step: Show what would become unsigned transaction data in a real provider flow.

### `Home`

- File: `src/app/page.tsx`
- Purpose: Main page that switches between `mock-provider`, `simulator`, and `figment` modes.
- Inputs: wagmi account, selected mode, simulator state, Figment state.
- Outputs: Main dashboard UI.
- API route called: Figment routes from Figment mode; staking routes through `MockProviderDemo`.
- Demo step: Open the app and select Mock Provider Mode.

### `stake`

- File: `src/app/page.tsx`
- Purpose: Simulator Mode stake action against the `MockEthereumStaking` contract.
- Inputs: Connected wallet, `withdrawalAddress`.
- Calls: `writeContractAsync` with function name `stake`.
- Output: Waits for transaction receipt, decodes `ValidatorStaked`, refreshes validator.
- Demo step: Simulator Mode only, not Route B.

### `executeAction`

- File: `src/app/page.tsx`
- Purpose: Simulator Mode contract action dispatcher.
- Inputs: `ActionName`.
- Calls: `writeContractAsync` for `advanceEpoch`, `activateValidator`, `simulateReward`, `simulatePenalty`, `requestExit`, `slashValidator`, `markWithdrawable`, or `withdraw`.
- Output: Writes contract transaction and refreshes simulator state.
- Demo step: Simulator Mode only.

### `requestFigmentValidator`

- File: `src/app/page.tsx`
- Purpose: Figment Direct Mode validator request.
- Inputs: `withdrawalAddress`, `numberOfValidators`.
- Calls: `POST /api/figment/validators/request`.
- Output: Stores Figment result and deposit preview data.
- Demo step: Figment Phase B1 preview only.

### `checkFigmentStatus`

- File: `src/app/page.tsx`
- Purpose: Figment Direct Mode status lookup.
- Inputs: `figmentResult.validatorIdentifier`.
- Calls: `GET /api/figment/validators/status`.
- Output: Stores Figment status response.
- Demo step: Figment Phase B1 preview only.

## 10. Important Backend Function Calls

### `GET`

- File path: `src/app/api/staking/providers/route.ts`
- Function name: `GET`
- HTTP route: `GET /api/staking/providers`
- Purpose: Return default provider, default network, and available provider metadata.
- Request input: None.
- Response output: `{ ok, defaultProvider, defaultNetwork, providers }`.
- Validator state transition: None.
- Error handling / validation: None in route.

### `POST`

- File path: `src/app/api/staking/providers/mock/stake/route.ts`
- Function name: `POST`
- HTTP route: `POST /api/staking/providers/mock/stake`
- Purpose: Create a mock stake request.
- Request input: JSON with `walletAddress`, `amountEth`, `withdrawalAddress`, `network`.
- Response output: `{ ok, stakeRequestId, validatorId, provider, network, status, mockUnsignedTx, validator }`.
- Validator state transition: Creates validator as `pending_deposit`.
- Error handling / validation: Catches provider errors and returns `mockProviderErrorResponse`.

### `GET`

- File path: `src/app/api/staking/validators/[validatorId]/route.ts`
- Function name: `GET`
- HTTP route: `GET /api/staking/validators/[validatorId]`
- Purpose: Load persisted mock validator status.
- Request input: `validatorId` route param.
- Response output: `{ ok, validator }`.
- Validator state transition: None.
- Error handling / validation: Missing validator returns provider error response.

### `POST`

- File path: `src/app/api/staking/validators/[validatorId]/confirm/route.ts`
- Function name: `POST`
- HTTP route: `POST /api/staking/validators/[validatorId]/confirm`
- Purpose: Confirm the mock deposit transaction.
- Request input: `validatorId` route param.
- Response output: `{ ok, validator }`.
- Validator state transition: `pending_deposit` -> `deposit_submitted`.
- Error handling / validation: `confirmMockStake` rejects non-`pending_deposit` validators with status 409.

### `POST`

- File path: `src/app/api/staking/validators/[validatorId]/advance/route.ts`
- Function name: `POST`
- HTTP route: `POST /api/staking/validators/[validatorId]/advance`
- Purpose: Move a mock validator to the next lifecycle state.
- Request input: `validatorId` route param.
- Response output: `{ ok, validator }`.
- Validator state transition: Uses `nextMockLifecycleStatus`.
- Error handling / validation: Rejects when no next lifecycle state exists.

### `POST`

- File path: `src/app/api/staking/validators/[validatorId]/exit/route.ts`
- Function name: `POST`
- HTTP route: `POST /api/staking/validators/[validatorId]/exit`
- Purpose: Request mock validator exit.
- Request input: `validatorId` route param.
- Response output: `{ ok, validator, mockExitTx }`.
- Validator state transition: `active` -> `exit_requested`.
- Error handling / validation: `MockStakingProvider.requestExit` rejects validators that are not `active`.

### `POST`

- File path: `src/app/api/staking/validators/[validatorId]/slash/route.ts`
- Function name: `POST`
- HTTP route: `POST /api/staking/validators/[validatorId]/slash`
- Purpose: Simulate a slashing event.
- Request input: `validatorId` route param and optional JSON `{ slashReason }`.
- Response output: `{ ok, validator }`.
- Validator state transition: non-`withdrawn` state -> `slashed`.
- Error handling / validation: `slashMockValidator` rejects `withdrawn` validators.

### `POST`

- File path: `src/app/api/staking/validators/[validatorId]/withdraw/route.ts`
- Function name: `POST`
- HTTP route: `POST /api/staking/validators/[validatorId]/withdraw`
- Purpose: Mark a mock validator withdrawn.
- Request input: `validatorId` route param.
- Response output: `{ ok, validator }`.
- Validator state transition: `withdrawable` -> `withdrawn`.
- Error handling / validation: `markMockWithdrawn` rejects validators that are not `withdrawable`.

### `MockStakingProvider.createStakeRequest`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `createStakeRequest`
- HTTP route, if applicable: Called by `POST /api/staking/providers/mock/stake`.
- Purpose: Validate input, generate IDs and mock public key, persist a validator, and return a mock unsigned deposit transaction.
- Request input: `CreateStakeInput`.
- Response output: `CreateStakeResult`.
- Validator state transition: Creates `pending_deposit`.
- Error handling / validation: Validates mock enabled, wallet address, withdrawal address, network, and positive amount.

### `MockStakingProvider.getValidatorStatus`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `getValidatorStatus`
- HTTP route, if applicable: Called by `GET /api/staking/validators/[validatorId]`.
- Purpose: Return a persisted mock validator record.
- Request input: `validatorId`.
- Response output: `MockValidatorRecord`.
- Validator state transition: None.
- Error handling / validation: Missing validator returns `MockProviderError` 404.

### `MockStakingProvider.requestExit`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `requestExit`
- HTTP route, if applicable: Called by `POST /api/staking/validators/[validatorId]/exit`.
- Purpose: Request mock exit and build a mock exit transaction.
- Request input: `validatorId`.
- Response output: `{ validator, mockExitTx }`.
- Validator state transition: `active` -> `exit_requested`.
- Error handling / validation: Rejects non-`active` validators.

### `confirmMockStake`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `confirmMockStake`
- HTTP route, if applicable: Called by `POST /api/staking/validators/[validatorId]/confirm`.
- Purpose: Simulate submitted deposit transaction.
- Request input: `validatorId`.
- Response output: Updated `MockValidatorRecord`.
- Validator state transition: `pending_deposit` -> `deposit_submitted`.
- Error handling / validation: Rejects non-`pending_deposit` validators.

### `advanceMockValidator`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `advanceMockValidator`
- HTTP route, if applicable: Called by `POST /api/staking/validators/[validatorId]/advance`.
- Purpose: Move to the next mock lifecycle state.
- Request input: `validatorId`.
- Response output: Updated `MockValidatorRecord`.
- Validator state transition: Depends on `nextMockLifecycleStatus`.
- Error handling / validation: Rejects terminal or unknown states.

### `slashMockValidator`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `slashMockValidator`
- HTTP route, if applicable: Called by `POST /api/staking/validators/[validatorId]/slash`.
- Purpose: Record mock slashing.
- Request input: `validatorId`, optional slash reason.
- Response output: Updated `MockValidatorRecord`.
- Validator state transition: non-`withdrawn` -> `slashed`.
- Error handling / validation: Rejects `withdrawn` validators.

### `markMockWithdrawn`

- File path: `src/lib/mock-staking-provider.ts`
- Function name: `markMockWithdrawn`
- HTTP route, if applicable: Called by `POST /api/staking/validators/[validatorId]/withdraw`.
- Purpose: Mark a mock withdrawable validator as withdrawn.
- Request input: `validatorId`.
- Response output: Updated `MockValidatorRecord`.
- Validator state transition: `withdrawable` -> `withdrawn`.
- Error handling / validation: Rejects non-`withdrawable` validators.

### Figment Route Functions

- File path: `src/app/api/figment/health/route.ts`, `src/app/api/figment/validators/request/route.ts`, `src/app/api/figment/validators/status/route.ts`
- Function names: `GET`, `POST`
- HTTP routes:
  - `GET /api/figment/health`
  - `POST /api/figment/validators/request`
  - `GET /api/figment/validators/status`
  - `POST /api/figment/validators/status`
- Purpose: Phase B1 Figment health, validator request, and status lookup.
- Request input: Withdrawal address, number of validators, validator identifier, or withdrawal address depending on route.
- Response output: Figment health, normalized request result, deposit preview, or status response.
- Validator state transition: None in local mock store.
- Error handling / validation: `figmentErrorResponse` maps config, validation, and upstream errors.

## 11. SDK / Library Usage

| Package name | Where it is imported | Why it is used | Key functions used | Real blockchain interaction or mock/demo logic |
|---|---|---|---|---|
| `viem` | `src/lib/mock-staking-provider.ts`, `src/lib/figment.ts`, `src/lib/contract.ts`, `src/app/page.tsx`, `src/components/MockProviderDemo.tsx` | Address validation, hashing, ABI event decoding, ETH formatting/parsing | `isAddress`, `keccak256`, `toBytes`, `decodeEventLog`, `formatEther`, `parseEther` | Used for both mock/demo logic and simulator blockchain interaction |
| `wagmi` | `src/app/page.tsx`, `src/components/MockProviderDemo.tsx`, `src/lib/wagmi.ts`, `src/app/providers.tsx` | Wallet account state, contract reads/writes, app wallet config | `useAccount`, `usePublicClient`, `useWriteContract`, `WagmiProvider`, `getDefaultConfig` | Real contract interaction in Simulator Mode; wallet address in Mock Provider Mode |
| `@rainbow-me/rainbowkit` | `src/app/providers.tsx`, `src/lib/wagmi.ts` | Wallet connection UI/provider setup | `RainbowKitProvider`, `getDefaultConfig` | Wallet connection infrastructure |
| `@tanstack/react-query` | `src/app/providers.tsx` | Required query client provider for wagmi/RainbowKit app setup | `QueryClient`, `QueryClientProvider` | App infrastructure |
| `next` | `src/app/page.tsx`, `src/app/api/.../route.ts` | App framework and API routes | Next.js App Router route exports `GET` and `POST` | Both frontend and backend routing |
| `react` | Frontend components | UI state and rendering | `useState`, `useEffect`, `useCallback`, `useMemo` | UI/demo logic |
| `reactflow` | `src/components/ValidatorFlow.tsx` | Visual lifecycle graph in Simulator Mode | React Flow components | Demo visualization |
| `tailwind-merge` | Check package usage before slide if needed | Listed dependency; no relevant staking-specific import found in inspected files | TODO: verify usage if including in final slides | TODO |
| `node:fs/promises` | `src/lib/mock-staking-provider.ts` | Local JSON persistence for mock validators | `mkdir`, `readFile`, `writeFile` | Mock/demo storage |
| `node:path` | `src/lib/mock-staking-provider.ts` | Build store path | `path.join`, `path.dirname` | Mock/demo storage |
| Foundry / Solidity | `src/MockEthereumStaking.sol`, `test/MockEthereumStaking.t.sol`, `foundry.toml` | Simulator contract and tests | `forge test`, Solidity contract functions | Simulator contract, not real Ethereum consensus staking |

TODO: No `ethers`, Express, NestJS, Fastify, database ORM, Kiln SDK, Figment SDK, or Blockdaemon SDK usage was found in the inspected codebase.

## 12. Validator Lifecycle

Mock Provider Mode states from `src/lib/staking-provider.ts`:

- `draft`
- `pending_deposit`
- `deposit_submitted`
- `activation_pending`
- `active`
- `exit_requested`
- `exiting`
- `withdrawable`
- `withdrawn`
- `slashed`

Mock Provider Mode state transition table:

| From | Action | To | Trigger | Function / Route |
|---|---|---|---|---|
| No record | Create mock stake | `pending_deposit` | User clicks `Stake with Mock Provider` | `MockStakingProvider.createStakeRequest` / `POST /api/staking/providers/mock/stake` |
| `draft` | Advance status | `pending_deposit` | Debug lifecycle logic only | `nextMockLifecycleStatus` |
| `pending_deposit` | Confirm mock transaction | `deposit_submitted` | User clicks `Confirm Mock Transaction` | `confirmMockStake` / `POST /api/staking/validators/[validatorId]/confirm` |
| `pending_deposit` | Advance status | `deposit_submitted` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| `deposit_submitted` | Advance status | `activation_pending` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| `activation_pending` | Advance status | `active` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| `active` | Request exit | `exit_requested` | User clicks `Request Exit` | `MockStakingProvider.requestExit` / `POST /api/staking/validators/[validatorId]/exit` |
| `active` | Advance status | `exit_requested` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| `exit_requested` | Advance status | `exiting` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| `exiting` | Advance status | `withdrawable` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| `withdrawable` | Mark withdrawn | `withdrawn` | User clicks `Mark Withdrawn` | `markMockWithdrawn` / `POST /api/staking/validators/[validatorId]/withdraw` |
| `withdrawable` | Advance status | `withdrawn` | User clicks `Advance Status` | `advanceMockValidator` / `POST /api/staking/validators/[validatorId]/advance` |
| Any state except `withdrawn` | Simulate slashing | `slashed` | User clicks `Simulate Slashing` | `slashMockValidator` / `POST /api/staking/validators/[validatorId]/slash` |
| `slashed` | Advance status | No transition | User clicks `Advance Status` | Rejected by `advanceMockValidator` |
| `withdrawn` | Advance/slash/withdraw | No transition | User action | Rejected by provider validation |

Simulator Mode states from `src/lib/types.ts` and `src/MockEthereumStaking.sol`:

- `None`
- `PendingActivation`
- `Active`
- `Exiting`
- `Slashed`
- `Withdrawable`
- `Withdrawn`

TODO: Mock Provider Mode has no epoch counters, rewards, penalties, or slashing withdrawal delay. Those exist in the Solidity simulator only.

## 13. Slashing Simulation

Mock Provider Mode:

- Trigger button: `Simulate Slashing` in `MockProviderDemo`.
- Route: `POST /api/staking/validators/[validatorId]/slash`.
- Provider function: `slashMockValidator`.
- Status change: any non-`withdrawn` validator moves to `slashed`.
- Slash reason: The UI sends `{ slashReason }`; the provider stores `slashReason` and `slashedAt`.
- UI explanation: When status is `slashed`, the UI displays that this is a mock slashing event for demo purposes and mentions double signing or surround voting as real Ethereum examples.
- Mock-only: Yes. This route does not detect or prove real slashing.

Simulator Mode:

- Trigger button comes through `ActionPanel` and `executeAction("slash")`.
- Contract function: `slashValidator(uint256 validatorId, SlashReason reason)`.
- Valid only for `Active` validators.
- Applies `SLASHING_PENALTY` and sets `withdrawableEpoch`.
- Still simulator-only, not real Ethereum consensus slashing.

## 14. Mock vs Real Staking

| Area | Current Behavior | Real Production Behavior |
|---|---|---|
| Validator creation | Mock Provider Mode creates a local `MockValidatorRecord`; Simulator Mode creates a record in `MockEthereumStaking`; Figment Direct Mode can request preview data only | Real Ethereum validator deposit data and validator registration |
| Transaction | Mock Provider Mode returns `MockUnsignedTx`; Simulator Mode signs contract writes via wagmi; Figment Phase B1 does not send deposit | User signs a real deposit transaction or provider-specific transaction |
| Provider API | Mock Provider Mode does not call a provider; Figment Direct Mode calls Figment with backend env config | Backend calls Kiln, Figment, Blockdaemon, or another provider with secure API credentials |
| Validator status | Mock Provider Mode reads local JSON; Simulator Mode reads a mock contract; Figment Direct Mode can fetch Figment status | Provider or beacon-chain status tracking |
| Slashing | Simulated by UI/API or simulator contract | Consensus-layer event based on validator misbehavior |
| Persistence | Mock provider writes local JSON | Database-backed durable persistence and audit history |
| API keys | Figment key is backend-only env; Mock Provider Mode needs no provider key | Provider API keys stored backend-side only |
| ETH amount | Mock Provider Mode defaults UI amount to `32`; older `StakePanel` text says `0.032 ETH` for the simulator | Real Ethereum staking normally uses 32 ETH per validator |

Mock Provider Mode does not perform real staking.

## 15. Future Real Provider Integration

A future real provider path can build on the current provider boundary:

- Create a real provider client implementing or extending `StakingProvider`.
- Store provider API keys in backend env variables only.
- Never expose provider API keys to frontend code or `NEXT_PUBLIC_*` variables.
- Keep the frontend calling backend routes only.
- Provider candidates: Kiln, Figment, Blockdaemon.

Potential real provider flow:

1. Frontend sends a create staking request to backend.
2. Backend validates wallet, withdrawal address, network, amount, and provider.
3. Backend calls provider API to create or fetch deposit/validator data.
4. Backend returns unsigned transaction or deposit preview data.
5. User signs the real transaction in the frontend wallet.
6. Backend tracks submitted transaction and provider validator identifier.
7. Backend polls or receives validator status from provider or beacon-chain data.
8. User requests exit through backend/provider flow.
9. Backend monitors withdrawable and withdrawn status.

Implementation notes:

- `PlaceholderProvider` currently exists for `kiln` and `figment` in `src/lib/staking-provider.ts`, but it throws `ProviderNotImplementedError`.
- `src/lib/figment.ts` is a direct Figment integration file, not an implementation of `StakingProvider`.
- Production integration will likely need extra interface methods for unsigned transaction building, submit/track metadata, and status normalization.

## 16. Demo Script

### Demo Step 1: Open the app

What to show: The home page.

What to say: "This is the Ethereum staking lifecycle POC. We will use Mock Provider Mode so the demo is safe and does not create a real validator."

Expected result: The page loads with mode controls and wallet status.

### Demo Step 2: Select Mock Provider Mode

What to show: The `Mock Provider Mode` tab and provider cards.

What to say: "The mock provider is selected. Figment and Kiln are shown as future real provider options."

Expected result: Mock Provider card is selected; real provider cards are marked coming soon.

### Demo Step 3: Create stake request

What to show: Wallet address, withdrawal address, amount, and network fields.

What to say: "We enter addresses and create a mock staking request. This creates local provider-style data."

Expected result: A validator is created in `pending_deposit` state and a mock transaction payload appears.

### Demo Step 4: Confirm mock transaction

What to show: `Confirm Mock Transaction` button.

What to say: "This simulates submitting the deposit transaction. No real transaction is signed here."

Expected result: Status moves to `deposit_submitted`.

### Demo Step 5: Show validator dashboard

What to show: Validator ID, mock public key, addresses, stake request ID, timestamps, and transaction hashes.

What to say: "The dashboard shows the metadata a real provider integration would eventually normalize and display."

Expected result: Validator details are visible.

### Demo Step 6: Advance to active

What to show: Click `Advance Status` until status is `active`.

What to say: "Real activation can take time. The mock provider lets us advance this lifecycle immediately for a demo."

Expected result: Lifecycle timeline reaches `Active`.

### Demo Step 7: Request exit

What to show: `Request Exit` button.

What to say: "Exit is allowed only once the mock validator is active."

Expected result: Status moves to `exit_requested` and a mock exit transaction appears.

### Demo Step 8: Advance to withdrawable

What to show: Click `Advance Status` until status is `withdrawable`.

What to say: "In production, withdrawable status would come from provider or beacon-chain tracking."

Expected result: Lifecycle timeline reaches `Withdrawable`.

### Demo Step 9: Mark withdrawn

What to show: `Mark Withdrawn` button.

What to say: "This records the final mock lifecycle state."

Expected result: Status moves to `withdrawn`.

### Demo Step 10: Simulate slashing

What to show: Create or load a non-withdrawn validator, enter slash reason, click `Simulate Slashing`.

What to say: "Slashing is simulated here for explanation. A real slashing event would be detected from consensus-layer/provider data."

Expected result: Status moves to `slashed`, slash reason and timestamp are shown.

## 17. Suggested Visuals

- Architecture diagram: Communicates the frontend -> backend route -> provider interface -> mock provider -> JSON store path.
- Validator lifecycle timeline: Communicates each mock state and where confirm, advance, exit, withdraw, and slash actions fit.
- Mock vs real comparison table: Communicates what is safe demo data versus what production staking needs.
- User flow diagram: Communicates the presenter path from opening the app to withdrawn/slashed outcomes.
- Provider abstraction diagram: Communicates how Mock Provider can be replaced by Kiln, Figment, or Blockdaemon.
- Demo screenshots to capture:
  - Mode selector with Mock Provider Mode selected.
  - Provider selection cards.
  - Stake form before submit.
  - Mock transaction payload.
  - Validator dashboard in `active`.
  - Demo controls with exit and slashing.
  - Final `withdrawn` and `slashed` states.

## 18. Key Talking Points

- "We chose mock provider first because real staking is expensive, slow, and dependent on external provider access."
- "Mock Provider Mode lets us validate UI, API contracts, and presentation flow without real ETH or real validator risk."
- "The frontend calls backend APIs. This is the right shape for future provider credentials because API keys should stay server-side."
- "The provider interface is the replacement boundary. Today it is implemented by `MockStakingProvider`; later it can be implemented by Kiln, Figment, Blockdaemon, or another provider."
- "Lifecycle simulation helps us explain activation, exit, withdrawal, and slashing in minutes instead of waiting for real chain timing."
- "Figment Direct Mode is already separated into backend API routes, but Phase B1 does not send deposits."
- "Simulator Mode is useful for smart-contract lifecycle testing, but it is still a mock contract, not Ethereum consensus staking."

## 19. Current Limitations

- Mock Provider Mode does not perform real staking.
- Mock Provider Mode does not sign real transactions.
- Mock Provider Mode does not call Kiln, Figment, Blockdaemon, or beacon-chain APIs.
- Mock validator public keys, transaction hashes, and transaction payloads are generated locally.
- Mock validator state is local JSON persistence, not production-grade database persistence.
- Mock Provider Mode has no real beacon-chain tracking.
- Mock Provider Mode has no real slashing detection or slashing proof validation.
- `PlaceholderProvider` for Kiln and Figment is not implemented.
- `src/lib/figment.ts` uses direct `fetch` calls and is not wired into `StakingProvider`.
- Figment Direct Mode requires `FIGMENT_API_KEY` and only supports Hoodi in Phase B1.
- Figment Direct Mode does not send deposit transactions.
- Simulator Mode requires a deployed `MockEthereumStaking` contract address in `NEXT_PUBLIC_MOCK_STAKING_ADDRESS`.
- Simulator Mode uses `0.032 ETH` in the mock contract, while real Ethereum validator staking normally uses 32 ETH.
- Mock provider tests in `test/mock-provider/lifecycle.test.mjs` test lifecycle helper behavior, not the full API route/provider persistence path.

## 20. TODO / Next Steps

- Add a real provider client stub that implements or extends `StakingProvider`.
- Decide whether Figment Direct Mode should become a `StakingProvider` implementation.
- Add backend route support for selecting real providers safely.
- Add database persistence for validator records, provider request IDs, transaction hashes, and status history.
- Add provider interface tests and API route tests for mock provider behavior.
- Add Kiln provider stub if Kiln is a likely first production provider.
- Add Blockdaemon provider notes if it is a candidate.
- Add real validator status tracking from provider APIs or beacon-chain data.
- Add explicit unsigned transaction signing flow for real provider integrations.
- Add production-safe audit logging for lifecycle state changes.
- Improve frontend lifecycle visualization for provider-specific status mapping.
- Capture screenshots for the presentation deck.

## 21. Appendix: Important File References

| Area | File | Purpose |
|---|---|---|
| Main app page | `src/app/page.tsx` | Mode switching, Simulator Mode functions, Figment Direct Mode functions, renders `MockProviderDemo` |
| App providers | `src/app/providers.tsx` | Sets up wagmi, React Query, and RainbowKit providers |
| wagmi config | `src/lib/wagmi.ts` | Configures RainbowKit/wagmi app name, WalletConnect project ID, and chains |
| Route B UI | `src/components/MockProviderDemo.tsx` | Main mock provider demo UI and frontend API calls |
| Older simulator stake panel | `src/components/StakePanel.tsx` | Simulator Mode stake form for contract staking |
| Simulator actions | `src/components/ActionPanel.tsx` | Contract simulator action controls |
| Simulator lifecycle visual | `src/components/ValidatorFlow.tsx` | React Flow lifecycle visualization |
| Simulator validator details | `src/components/ValidatorDetails.tsx` | Displays contract validator data |
| Wallet status | `src/components/WalletStatus.tsx` | Wallet connection status UI |
| Provider interface | `src/lib/staking-provider.ts` | Provider types, mock statuses, lifecycle helpers, available providers, placeholders |
| Mock provider | `src/lib/mock-staking-provider.ts` | Implements mock provider, local JSON persistence, mock transaction payloads, state transitions |
| Provider route | `src/app/api/staking/providers/route.ts` | Returns default and available staking providers |
| Mock stake route | `src/app/api/staking/providers/mock/stake/route.ts` | Creates mock stake request |
| Mock validator status route | `src/app/api/staking/validators/[validatorId]/route.ts` | Loads mock validator |
| Mock confirm route | `src/app/api/staking/validators/[validatorId]/confirm/route.ts` | Confirms mock deposit |
| Mock advance route | `src/app/api/staking/validators/[validatorId]/advance/route.ts` | Advances mock lifecycle |
| Mock exit route | `src/app/api/staking/validators/[validatorId]/exit/route.ts` | Requests mock exit |
| Mock slash route | `src/app/api/staking/validators/[validatorId]/slash/route.ts` | Simulates slashing |
| Mock withdraw route | `src/app/api/staking/validators/[validatorId]/withdraw/route.ts` | Marks mock validator withdrawn |
| Figment backend helper | `src/lib/figment.ts` | Figment config, validation, request, status, and response normalization |
| Figment health route | `src/app/api/figment/health/route.ts` | Figment health check route |
| Figment request route | `src/app/api/figment/validators/request/route.ts` | Figment validator request route |
| Figment status route | `src/app/api/figment/validators/status/route.ts` | Figment validator status route |
| Contract constants and ABI | `src/lib/contract.ts` | Mock contract address, ABI, constants, validator normalization |
| Contract types | `src/lib/types.ts` | Simulator validator status enum, slash reasons, validator type |
| Contract labels | `src/lib/labels.ts` | Simulator status and slash reason labels |
| Simulator contract | `src/MockEthereumStaking.sol` | Solidity staking lifecycle simulator |
| Mock provider docs | `docs/staking-mock-provider.md` | Existing Route B docs and API route overview |
| Flow docs | `docs/staking-poc-flow.md` | Existing staking POC flow documentation |
| Chinese flow docs | `docs/staking-poc-flow.zh.md` | Chinese staking POC flow documentation |
| Env example | `.env.example` | Mock provider, Figment, wallet, contract, and Foundry-related env variables |
| Package manifest | `package.json` | Scripts and dependencies |
| Mock provider tests | `test/mock-provider/lifecycle.test.mjs` | Node tests for mock lifecycle helper behavior |
| Contract tests | `test/MockEthereumStaking.t.sol` | Foundry tests for simulator contract lifecycle |
| Foundry config | `foundry.toml` | Solidity/Foundry project configuration |
