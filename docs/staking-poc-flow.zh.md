# Staking POC 流程說明

## 1. 目的

這個 POC 用來示範 Ethereum validator staking 的主要生命週期。它讓工程師可以清楚看到：建立 staking request、查看 validator metadata、推進 validator 狀態、request exit、withdraw，以及模擬 slashing。

目前 app 有三種模式：

- Mock Provider Mode：以 API 為主的本地模擬流程。這是目前 provider abstraction 的主要 demo flow。它使用 mock provider 和本地 JSON 儲存，不會建立真正的 Ethereum validator。
- Simulator Mode：本地 smart contract simulator。它會透過 wagmi 和 viem 發送真實 wallet transaction 到設定好的 demo contract，但該 contract 只是簡化版 simulator，不是 Ethereum consensus staking。
- Figment Direct Mode：backend-only 的 Figment API preview flow。設定完成後，可以向 Figment 請求 validator/deposit preview data；目前 Phase B1 不會從 app 發送 32 ETH deposit transaction。

Wallet 連線是真的，使用 RainbowKit 和 wagmi。Mock Provider Mode 只使用 connected wallet address 作為預設輸入值，不會要求 wallet 簽署回傳的 mock transaction。

## 2. 高階架構

Frontend 是 Next.js App Router React app。Backend 使用 Next.js route handlers，放在 `src/app/api`。Provider abstraction 定義在 `src/lib/staking-provider.ts`，目前完整實作是 `src/lib/mock-staking-provider.ts` 裡的 mock provider。

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

主要元件：

- Frontend：`src/app/page.tsx` 負責切換 Mock Provider Mode、Simulator Mode、Figment Direct Mode。
- Mock provider UI：`src/components/MockProviderDemo.tsx`。
- Backend routes：`src/app/api/staking/**` 和 `src/app/api/figment/**`。
- Provider layer：`src/lib/staking-provider.ts`。
- Mock provider：`src/lib/mock-staking-provider.ts`。
- Wallet / Ethereum SDK：RainbowKit、wagmi、viem。
- Storage layer：本地 JSON 檔，路徑由 `MOCK_STAKING_STORE_PATH` 控制，預設是 `.mock-staking/validators.json`。
- Smart contract simulator：`src/MockEthereumStaking.sol`，ABI helper 在 `src/lib/contract.ts`。
- External provider integration：Figment helper 在 `src/lib/figment.ts`；Kiln 和 Figment 在通用 provider list 中目前是 placeholder。

## 3. 主要使用者流程

1. Connect wallet 或輸入 wallet address
   - Frontend：`src/components/WalletStatus.tsx` 的 `WalletStatus()` 使用 RainbowKit `ConnectButton`。
   - Frontend：`MockProviderDemo()` 讀取 `useAccount()`，並預填 wallet address 和 withdrawal address。
   - Backend：wallet connection 不需要 API call。
   - Provider：此步驟尚未呼叫 provider。

2. 選擇 staking provider
   - Frontend：`MockProviderDemo()` mount 時呼叫 `GET /api/staking/providers`。
   - Backend route：`src/app/api/staking/providers/route.ts` 的 `GET()`。
   - Service/provider：`getAvailableStakingProviders()` 回傳 mock、Figment、Kiln 的 provider metadata。
   - 目前結果：除非 `MOCK_STAKING_ENABLED=false`，否則只有 mock provider 是 enabled。

3. 輸入 stake amount 和 withdrawal address
   - Frontend：`MockProviderDemo()` 用 React state 保存 `walletAddress`、`withdrawalAddress`、`amountEth`、`network`。
   - Frontend validation：使用 viem `isAddress()` 檢查 wallet address 和 withdrawal address。
   - Backend validation：建立 stake request 時會再次檢查。

4. 建立 staking request
   - Frontend function：`src/components/MockProviderDemo.tsx` 的 `createStake()`。
   - API call：`POST /api/staking/providers/mock/stake`。
   - Backend route：`src/app/api/staking/providers/mock/stake/route.ts` 的 `POST()`。
   - Provider function：`MockStakingProvider.createStakeRequest()`。
   - Output：`stakeRequestId`、`validatorId`、`mockUnsignedTx`，以及狀態為 `pending_deposit` 的 `validator` record。

5. Sign 或 confirm transaction
   - Mock Provider Mode：沒有真實 wallet signature。使用者點擊 `Confirm Mock Transaction`。
   - Frontend function：`runValidatorAction("confirm")`。
   - API call：`POST /api/staking/validators/:validatorId/confirm`。
   - Backend function：`confirmMockStake()`。
   - State transition：`pending_deposit` -> `deposit_submitted`。
   - Simulator Mode：`stake()` 會呼叫 `writeContractAsync()`，並等待 demo contract 的真實 transaction receipt。

6. 建立 validator record
   - Mock Provider Mode 在 `createStakeRequest()` 時建立並儲存 validator。
   - Storage：`saveValidator()` 寫入設定的 JSON store。
   - Mock fields 包含 `mockValidatorPubkey`、`publicKey`、`stakeRequestId`、timestamps、provider、network、wallet address、withdrawal address。

7. 追蹤 validator lifecycle
   - Frontend function：`loadValidator()` 呼叫 `GET /api/staking/validators/:validatorId`。
   - Frontend function：`runValidatorAction("advance")` 呼叫 `POST /api/staking/validators/:validatorId/advance`。
   - Backend functions：`MockStakingProvider.getValidatorStatus()` 和 `advanceMockValidator()`。
   - State transition：`deposit_submitted` -> `activation_pending` -> `active`，之後再進入 exit 相關狀態。

8. Request exit
   - Frontend function：`runValidatorAction("exit")`。
   - API call：`POST /api/staking/validators/:validatorId/exit`。
   - Backend route：`src/app/api/staking/validators/[validatorId]/exit/route.ts` 的 `POST()`。
   - Provider function：`MockStakingProvider.requestExit()`。
   - Validation：validator 必須是 `active`。
   - State transition：`active` -> `exit_requested`。

9. Withdraw / mark withdrawn
   - Frontend function：`runValidatorAction("withdraw")`。
   - API call：`POST /api/staking/validators/:validatorId/withdraw`。
   - Backend function：`markMockWithdrawn()`。
   - Validation：validator 必須是 `withdrawable`。
   - State transition：`withdrawable` -> `withdrawn`。

10. 模擬 slashing
    - Frontend function：`runValidatorAction("slash")`。
    - API call：`POST /api/staking/validators/:validatorId/slash`。
    - Backend function：`slashMockValidator()`。
    - Validation：`withdrawn` validator 不能被 slash。
    - State transition：任何非 `withdrawn` 的 mock validator -> `slashed`。

## 4. 重要 Frontend Function Calls

### `Home()`

- File：`src/app/page.tsx`
- Purpose：主要 dashboard component。負責切換 app mode，並管理 wallet、simulator、Figment state。
- Inputs：沒有直接參數；讀取 wallet state 和 contract env config。
- Output：render Mock Provider Mode、Simulator Mode 或 Figment Direct Mode。
- Used when：app page 載入時。

### `MockProviderDemo()`

- File：`src/components/MockProviderDemo.tsx`
- Purpose：API-backed mock staking UI。
- Inputs：來自 `useAccount()` 的 connected wallet address。
- Output：render provider cards、stake form、validator lookup、lifecycle timeline、transaction payload、demo controls。
- Used when：使用者選擇 Mock Provider Mode。

### `createStake()`

- File：`src/components/MockProviderDemo.tsx`
- Purpose：從 UI 建立 mock staking request。
- Inputs：`walletAddress`、`withdrawalAddress`、`amountEth`、`network`。
- Calls：`POST /api/staking/providers/mock/stake`。
- Output：更新 `validator`、`validatorIdInput`、`mockUnsignedTx`。
- Used when：使用者點擊 `Stake with Mock Provider`。

### `loadValidator()`

- File：`src/components/MockProviderDemo.tsx`
- Purpose：用 validator ID 載入已儲存的 mock validator。
- Inputs：validator ID string。
- Calls：`GET /api/staking/validators/:validatorId`。
- Output：更新目前的 `validator` state。
- Used when：使用者點擊 `Load`。

### `runValidatorAction(action)`

- File：`src/components/MockProviderDemo.tsx`
- Purpose：對目前 mock validator 執行 lifecycle action。
- Inputs：action name：`confirm`、`advance`、`exit`、`slash`、`withdraw`。
- Calls：`POST /api/staking/validators/:validatorId/:action`。
- Output：更新 current validator、success/error state，必要時更新 `mockExitTx`。
- Used when：使用者點擊 demo lifecycle controls。

### `WalletStatus()`

- File：`src/components/WalletStatus.tsx`
- Purpose：顯示 wallet connection、chain ID、simulator contract address。
- Inputs：wagmi `useAccount()`、`useChainId()`、`MOCK_STAKING_ADDRESS`。
- Output：wallet status UI 和 RainbowKit connect button。
- Used when：dashboard 在任何 mode render 時。

### `stake()`

- File：`src/app/page.tsx`
- Purpose：發送真實 wallet transaction 到本地 `MockEthereumStaking` simulator contract。
- Inputs：connected wallet、`withdrawalAddress`。
- Calls：wagmi `writeContractAsync()`，function name 是 `stake`，value 是 `REQUIRED_STAKE`。
- Output：等待 receipt、decode `ValidatorStaked` event、保存 selected validator ID。
- Used when：使用者在 Simulator Mode 點擊 stake。

### `executeAction(action)`

- File：`src/app/page.tsx`
- Purpose：發送 simulator contract lifecycle transactions。
- Inputs：`ActionPanel` 傳入的 action、selected validator ID、slash reason。
- Calls：wagmi `writeContractAsync()`，對應 `advanceEpoch`、`activateValidator`、`simulateReward`、`simulatePenalty`、`requestExit`、`slashValidator`、`markWithdrawable`、`withdraw`。
- Output：transaction receipt、更新 validator state、新增 timeline entry。
- Used when：使用者點擊 simulator action buttons。

### `requestFigmentValidator()`

- File：`src/app/page.tsx`
- Purpose：透過 backend 向 Figment 請求 validator/deposit preview data。
- Inputs：`withdrawalAddress`、`numberOfValidators`。
- Calls：`POST /api/figment/validators/request`。
- Output：保存 Figment result 和 deposit preview。
- Used when：使用者在 Figment Direct Mode 點擊 request。

### `checkFigmentStatus()`

- File：`src/app/page.tsx`
- Purpose：透過 backend 載入 Figment validator status。
- Inputs：`validatorIdentifier`。
- Calls：`GET /api/figment/validators/status?validatorIdentifier=...`。
- Output：保存 Figment status response。
- Used when：使用者在 Figment Direct Mode 檢查 status。

## 5. 重要 Backend Function Calls

### `GET /api/staking/providers`

- File：`src/app/api/staking/providers/route.ts`
- Function：`GET()`
- Purpose：列出 staking provider options。
- Input：無。
- Output：`ok`、`defaultProvider`、`defaultNetwork`、`providers`。
- Validation rules：無。
- Related state transition：無。

### `POST /api/staking/providers/mock/stake`

- File：`src/app/api/staking/providers/mock/stake/route.ts`
- Function：`POST()`
- Purpose：建立 mock stake request 和 validator record。
- Input body：`walletAddress`、`amountEth`、`withdrawalAddress`、`network`。
- Output：`stakeRequestId`、`validatorId`、`provider`、`network`、`status`、`mockUnsignedTx`、`validator`。
- Validation rules：mock provider 必須 enabled；wallet/withdrawal address 必須有效；amount 必須大於 0；network 必須是 `hoodi`、`holesky` 或 `local`。
- Related state transition：新 validator 從 `pending_deposit` 開始。

### `GET /api/staking/validators/:validatorId`

- File：`src/app/api/staking/validators/[validatorId]/route.ts`
- Function：`GET()`
- Purpose：讀取已儲存的 mock validator。
- Params：`validatorId`。
- Output：`ok`、`validator`。
- Validation rules：validator 必須存在。
- Related state transition：無。

### `POST /api/staking/validators/:validatorId/confirm`

- File：`src/app/api/staking/validators/[validatorId]/confirm/route.ts`
- Function：`POST()`
- Purpose：confirm mock deposit。
- Params：`validatorId`。
- Output：`ok`、`validator`。
- Validation rules：目前 status 必須是 `pending_deposit`。
- Related state transition：`pending_deposit` -> `deposit_submitted`。

### `POST /api/staking/validators/:validatorId/advance`

- File：`src/app/api/staking/validators/[validatorId]/advance/route.ts`
- Function：`POST()`
- Purpose：把 mock validator 推進到下一個 lifecycle state。
- Params：`validatorId`。
- Output：`ok`、`validator`。
- Validation rules：validator 必須有下一個 state；`slashed` 和 `withdrawn` 不能 advance。
- Related state transition：依照 `mockLifecycle`。

### `POST /api/staking/validators/:validatorId/exit`

- File：`src/app/api/staking/validators/[validatorId]/exit/route.ts`
- Function：`POST()`
- Purpose：request mock validator exit。
- Params：`validatorId`。
- Output：`ok`、`validator`、`mockExitTx`。
- Validation rules：目前 status 必須是 `active`。
- Related state transition：`active` -> `exit_requested`。

### `POST /api/staking/validators/:validatorId/withdraw`

- File：`src/app/api/staking/validators/[validatorId]/withdraw/route.ts`
- Function：`POST()`
- Purpose：把 mock validator 標記為 withdrawn。
- Params：`validatorId`。
- Output：`ok`、`validator`。
- Validation rules：目前 status 必須是 `withdrawable`。
- Related state transition：`withdrawable` -> `withdrawn`。

### `POST /api/staking/validators/:validatorId/slash`

- File：`src/app/api/staking/validators/[validatorId]/slash/route.ts`
- Function：`POST()`
- Purpose：記錄 mock slashing event。
- Params：`validatorId`。
- Input body：可選 `slashReason`。
- Output：`ok`、`validator`。
- Validation rules：目前 status 不能是 `withdrawn`。
- Related state transition：非 withdrawn state -> `slashed`。

### `MockStakingProvider.createStakeRequest(input)`

- File：`src/lib/mock-staking-provider.ts`
- Purpose：驗證 input、建立 IDs、建立 fake public key data、儲存 validator，並回傳 mock unsigned deposit transaction。
- Input：`CreateStakeInput`。
- Output：`CreateStakeResult`。
- Validation rules：address、amount、network、mock enabled。
- Related state transition：建立 `pending_deposit`。

### `confirmMockStake(validatorId)`

- File：`src/lib/mock-staking-provider.ts`
- Purpose：加入 fake deposit transaction hash，並標記 deposit submitted。
- Input：`validatorId`。
- Output：updated validator。
- Validation rules：status 必須是 `pending_deposit`。
- Related state transition：`pending_deposit` -> `deposit_submitted`。

### `advanceMockValidator(validatorId)`

- File：`src/lib/mock-staking-provider.ts`
- Purpose：使用 `nextMockLifecycleStatus()` 推進 status。
- Input：`validatorId`。
- Output：updated validator。
- Validation rules：必須存在下一個 state。
- Related state transition：`mockLifecycle` 中的下一個 status。

### `MockStakingProvider.requestExit(validatorId)`

- File：`src/lib/mock-staking-provider.ts`
- Purpose：標記 exit requested，並回傳 mock exit transaction payload。
- Input：`validatorId`。
- Output：updated validator 和 `mockExitTx`。
- Validation rules：status 必須是 `active`。
- Related state transition：`active` -> `exit_requested`。

### `requestFigmentValidators(input)`

- File：`src/lib/figment.ts`
- HTTP route：`POST /api/figment/validators/request`。
- Purpose：從 backend 呼叫 Figment API，並 normalize validator/deposit preview data。
- Input body：`withdrawalAddress`、`numberOfValidators`、可選 `fundingAddress`。
- Output：`network`、可選 `validatorIdentifier`、`depositData`、`unsignedTransaction`、`depositPreview`、`raw`。
- Validation rules：目前只支援 Hoodi；withdrawal/funding address 必須有效；validator count 必須大於 0；Figment env vars 必須存在。
- Related state transition：不影響本地 mock lifecycle。

## 6. SDK / Library 使用方式

### wagmi

- Imported in：`src/app/page.tsx`、`src/components/MockProviderDemo.tsx`、`src/components/WalletStatus.tsx`、`src/lib/wagmi.ts`、`src/app/providers.tsx`。
- Why：wallet account state、chain ID、public client reads、contract writes。
- Key functions：`useAccount()`、`useChainId()`、`usePublicClient()`、`useWriteContract()`、`WagmiProvider`、`getDefaultConfig()`。
- Usage type：Simulator Mode 會做真實 wallet connection 和 contract transaction；Mock Provider Mode 只用 wallet address 顯示和預填。

### viem

- Imported in：`src/app/page.tsx`、`src/lib/contract.ts`、`src/lib/mock-staking-provider.ts`、`src/lib/staking-provider.ts`、`src/lib/types.ts`、`src/lib/figment.ts`、`src/components/MockProviderDemo.tsx`。
- Why：Ethereum address/hash types、address validation、ETH parse/format、event decoding、fake hash generation。
- Key functions：`isAddress()`、`parseEther()`、`formatEther()`、`decodeEventLog()`、`keccak256()`、`toBytes()`。
- Usage type：所有模式都會用到 validation/formatting；Simulator Mode 用來 decode contract event；Mock Provider Mode 用來生成 mock hash。

### RainbowKit

- Imported in：`src/lib/wagmi.ts`、`src/app/providers.tsx`、`src/components/WalletStatus.tsx`。
- Why：wallet connection UI 和 default wallet config。
- Key functions/components：`getDefaultConfig()`、`RainbowKitProvider`、`ConnectButton`。
- Usage type：真實 wallet connection UI。

### React Query

- Imported in：`src/app/providers.tsx`。
- Why：wagmi/RainbowKit data flow 需要 provider setup。
- Key functions：`QueryClient`、`QueryClientProvider`。
- Usage type：frontend state/data support，不是 staking business logic。

### Next.js route handlers

- Used in：`src/app/api/**/route.ts`。
- Why：mock provider 和 Figment integration 的 backend API layer。
- Key functions：exported `GET()`、`POST()` handlers、`Response.json()`。
- Usage type：backend-only API calls 和 local provider operations。

### Figment HTTP API

- Used in：`src/lib/figment.ts`。
- Why：external provider preview/status integration。
- Key functions：`figmentHealth()`、`requestFigmentValidators()`、`getFigmentValidatorStatus()`。
- Usage type：設定完成後，從 backend 呼叫真實 external provider API。

### Solidity / Foundry

- Files：`src/MockEthereumStaking.sol`、`test/MockEthereumStaking.t.sol`、`foundry.toml`。
- Why：本地 smart contract simulator 和 tests。
- Key contract functions：`stake`、`activateValidator`、`simulateReward`、`simulatePenalty`、`requestExit`、`slashValidator`、`markWithdrawable`、`withdraw`、`advanceEpoch`、`getValidator`。
- Usage type：local simulation contract，不是真實 Ethereum validator deposit infrastructure。

## 7. Validator Lifecycle

Mock Provider Mode lifecycle：

| From | Action | To | Trigger |
|---|---|---|---|
| none | create stake request | pending_deposit | 使用者點擊 `Stake with Mock Provider` |
| pending_deposit | confirm mock tx | deposit_submitted | 使用者點擊 `Confirm Mock Transaction` |
| deposit_submitted | advance | activation_pending | demo transition |
| activation_pending | advance | active | demo transition |
| active | request exit | exit_requested | 使用者點擊 `Request Exit` |
| exit_requested | advance | exiting | demo transition |
| exiting | advance | withdrawable | demo transition |
| withdrawable | mark withdrawn | withdrawn | 使用者點擊 `Mark Withdrawn` |
| any non-withdrawn state | simulate slashing | slashed | 使用者點擊 `Simulate Slashing` |

Mock lifecycle array 定義在 `src/lib/staking-provider.ts`：

```text
draft -> pending_deposit -> deposit_submitted -> activation_pending -> active -> exit_requested -> exiting -> withdrawable -> withdrawn
```

實際上，新的 mock validator 會直接從 `pending_deposit` 建立；`draft` 目前是 type/lifecycle 概念，但 `createStakeRequest()` 不會把它 persisted。

Simulator Mode lifecycle：

| From | Action | To | Trigger |
|---|---|---|---|
| None | `stake` | PendingActivation | wallet transaction to `stake()` |
| PendingActivation | `activateValidator` | Active | current epoch 達到 activation epoch |
| Active | `requestExit` | Exiting | validator owner request exit |
| Active | `slashValidator` | Slashed | simulator slashing action |
| Exiting or Slashed | `markWithdrawable` | Withdrawable | current epoch 達到 withdrawable epoch |
| Withdrawable | `withdraw` | Withdrawn | withdrawal address 呼叫 `withdraw()` |

## 8. API Reference

### `GET /api/staking/providers`

Request body：無。

Response body：

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

Example：

```sh
curl http://localhost:3000/api/staking/providers
```

### `POST /api/staking/providers/mock/stake`

Request body：

```json
{
  "walletAddress": "0x1111111111111111111111111111111111111111",
  "withdrawalAddress": "0x2222222222222222222222222222222222222222",
  "amountEth": "32",
  "network": "hoodi"
}
```

Response body 重點：

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

Example：

```sh
curl -X POST http://localhost:3000/api/staking/providers/mock/stake \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"0x1111111111111111111111111111111111111111","withdrawalAddress":"0x2222222222222222222222222222222222222222","amountEth":"32","network":"hoodi"}'
```

### `GET /api/staking/validators/:validatorId`

Request body：無。

Response body 重點：

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

Example：

```sh
curl http://localhost:3000/api/staking/validators/mock-val-example
```

### `POST /api/staking/validators/:validatorId/confirm`

- Request body：無。
- Purpose：把 `pending_deposit` 推進到 `deposit_submitted`。

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/confirm
```

### `POST /api/staking/validators/:validatorId/advance`

- Request body：無。
- Purpose：依照 mock lifecycle 推進下一個狀態。

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/advance
```

### `POST /api/staking/validators/:validatorId/exit`

- Request body：無。
- Purpose：從 `active` 進入 `exit_requested`，並回傳 `mockExitTx`。

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/exit
```

### `POST /api/staking/validators/:validatorId/withdraw`

- Request body：無。
- Purpose：從 `withdrawable` 標記為 `withdrawn`。

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/withdraw
```

### `POST /api/staking/validators/:validatorId/slash`

Request body：

```json
{
  "slashReason": "Mock double signing event"
}
```

Example：

```sh
curl -X POST http://localhost:3000/api/staking/validators/mock-val-example/slash \
  -H 'Content-Type: application/json' \
  -d '{"slashReason":"Mock double signing event"}'
```

### `GET /api/figment/health`

Purpose：檢查 backend Figment config 是否可用。

```sh
curl http://localhost:3000/api/figment/health
```

### `POST /api/figment/validators/request`

Request body：

```json
{
  "withdrawalAddress": "0x2222222222222222222222222222222222222222",
  "numberOfValidators": 1
}
```

Example：

```sh
curl -X POST http://localhost:3000/api/figment/validators/request \
  -H 'Content-Type: application/json' \
  -d '{"withdrawalAddress":"0x2222222222222222222222222222222222222222","numberOfValidators":1}'
```

### `GET /api/figment/validators/status`

使用 `validatorIdentifier` 或 `withdrawalAddress` query param。

```sh
curl 'http://localhost:3000/api/figment/validators/status?validatorIdentifier=example-validator'
```

## 9. Environment Variables

目前 `.env.example` 中存在的變數：

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

用途說明：

- `NEXT_PUBLIC_MOCK_STAKING_ADDRESS`：frontend simulator contract address。如果是 zero address，Simulator Mode 會停用 contract actions。
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`：RainbowKit/wagmi wallet connector project ID。
- `FIGMENT_MODE`：Figment health response 會回傳；預設 `live`。
- `FIGMENT_API_BASE_URL`：backend Figment API base URL。
- `FIGMENT_API_KEY`：backend-only Figment API key。不能放在 frontend。
- `FIGMENT_ETH_NETWORK`：Figment network；目前 code 只支援 `hoodi`，並拒絕 mainnet。
- `NEXT_PUBLIC_ETH_NETWORK`：env example 中的 public network label/config；目前 staking code 沒有直接讀取。
- `NEXT_PUBLIC_ETH_DEPOSIT_CONTRACT_ADDRESS`：Figment deposit preview fallback 用的 deposit contract address。
- `NEXT_PUBLIC_ENABLE_REAL_STAKING`：env example 中的 public feature flag；目前 staking code 沒有強制使用。
- `MOCK_STAKING_ENABLED`：控制 mock provider 是否 enabled。只要不是 `false` 就視為 enabled。
- `DEFAULT_STAKING_PROVIDER`：`GET /api/staking/providers` 回傳的 default provider；預設 `mock`。
- `DEFAULT_STAKING_NETWORK`：provider list 回傳與 mock default network；預設 `hoodi`。
- `MOCK_STAKING_STORE_PATH`：mock validators 的本地 JSON storage path。
- `SEPOLIA_RPC_URL`、`PRIVATE_KEY`、`ETHERSCAN_API_KEY`：Foundry deployment/verification 或外部工具使用，不是 Next.js staking API routes 使用。

建議但目前不是必要：

```env
REAL_STAKING_PROVIDER=figment
KILN_API_KEY=
BLOCKDAEMON_API_KEY=
PROVIDER_WEBHOOK_SECRET=
```

如果未來接真實 provider，這些都應該保持 backend-only。

## 10. Mock vs Real Staking

Mock Provider Mode 目前透過 `MockStakingProvider` 模擬 validator creation 和 lifecycle transitions。它會回傳 fake validator public key、fake transaction hash、mock unsigned transaction payload。它不會送 ETH、不會呼叫 Ethereum deposit contract、不會建立 Beacon Chain deposit data、不會操作 validator clients，也不會執行真實 withdrawal。

Simulator Mode 會發送真實 wallet transaction，但目標只是 `MockEthereumStaking` 這個簡化 demo contract。它適合用來展示 contract state transitions，但不是 Ethereum 真實 staking。

Figment Direct Mode 是最接近真實 provider integration 的路徑。它會從 backend route handler 呼叫 Figment，並回傳 validator/deposit preview data。目前 frontend 只顯示 preview 和 status，不會送出真實 deposit transaction。

Mock provider 適合 product demo、UI review、staking lifecycle 說明。它不能被視為真實 staking infrastructure。

## 11. 未來接入真實 Provider

替換點是 `src/lib/staking-provider.ts` 裡的 provider interface：

- `createStakeRequest(input)`
- `getValidatorStatus(validatorId)`
- `requestExit(validatorId)`
- `getProviderInfo()`

未來要接 Kiln、Figment、Blockdaemon 或其他 provider，可以在 `src/lib/mock-staking-provider.ts` 旁邊新增 backend-only client class/module。它應該盡量回傳相同高階資料結構，但資料要改成真實 provider request IDs、真實 validator/deposit data、真實 status fields。

建議 integration rules：

- Provider API keys 只存在 backend environment variables，例如 `FIGMENT_API_KEY`、`KILN_API_KEY`、`BLOCKDAEMON_API_KEY`。
- 不要用 `NEXT_PUBLIC_` 放任何 provider secret。
- 所有 provider API calls 都走 Next.js backend route handlers。
- Frontend 只呼叫本地 API routes，不直接呼叫 third-party provider APIs。
- 在 backend 加上 provider-specific validation 和 error mapping。
- 明確定義 provider 是回傳 unsigned transaction 給 wallet signing，還是只建立 provider-side request。
- 如果加入 webhook，要做 signature verification，並使用 backend-only `PROVIDER_WEBHOOK_SECRET`。
- 保留 Mock Provider Mode，避免真實 provider 故障時影響 UI demo。
