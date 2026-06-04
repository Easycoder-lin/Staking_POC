# Ethereum Staking Lifecycle POC

This repository contains a simplified Ethereum validator staking simulator built with Solidity, Foundry, Next.js, wagmi, viem, RainbowKit, Tailwind CSS, and React Flow.

The contract and dashboard are demo-oriented. They help visualize staking, activation, rewards, penalties, voluntary exit, slashing, withdrawal delay, and final withdrawal, but they are not real Ethereum consensus logic.

## Install Dependencies

```sh
npm install
```

Install Foundry separately if it is not already available:

```sh
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Run Contract Tests

```sh
forge test -vvv
```

## Run Mock Provider Tests

```sh
npm run test:mock-provider
```

## Run Local Anvil

In one terminal:

```sh
anvil
```

Anvil prints local funded accounts and private keys. Use one of those accounts in your browser wallet.

## Deploy The Contract

In another terminal, deploy to local Anvil:

```sh
forge create \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <ANVIL_PRIVATE_KEY> \
  src/MockEthereumStaking.sol:MockEthereumStaking
```

Copy the deployed contract address.

## Configure The Frontend

Create `.env.local`:

```sh
NEXT_PUBLIC_MOCK_STAKING_ADDRESS=0xYourDeployedContractAddress
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is optional for injected local wallets, but recommended for the full RainbowKit wallet list.

For Figment Direct Mode Phase B1, add server-side Figment configuration:

```sh
FIGMENT_MODE=live
FIGMENT_API_BASE_URL=https://api.figment.io
FIGMENT_API_KEY=
FIGMENT_ETH_NETWORK=hoodi
NEXT_PUBLIC_ETH_NETWORK=hoodi
NEXT_PUBLIC_ETH_DEPOSIT_CONTRACT_ADDRESS=
NEXT_PUBLIC_ENABLE_REAL_STAKING=false
```

`FIGMENT_API_KEY` is read only by backend API routes. Phase B1 requests validator data and previews the deposit transaction only. It does not send 32 Hoodi ETH.

For Route B mock provider mode, add optional demo configuration:

```sh
MOCK_STAKING_ENABLED=true
DEFAULT_STAKING_PROVIDER=mock
DEFAULT_STAKING_NETWORK=hoodi
MOCK_STAKING_STORE_PATH=.mock-staking/validators.json
```

The mock provider persists demo validators locally and never creates a real Ethereum validator. See `docs/staking-mock-provider.md` for API routes and the full lifecycle demo.

## Run The Frontend

```sh
npm run dev
```

Open the printed local URL, usually `http://localhost:3000`.

## Recommended Demo Flow

Normal exit:

1. Stake 0.032 ETH
2. Advance 2 epochs
3. Activate validator
4. Simulate reward
5. Request exit
6. Advance 4 epochs
7. Mark withdrawable
8. Withdraw

Slashing:

1. Stake 0.032 ETH
2. Advance 2 epochs
3. Activate validator
4. Slash validator with DoubleProposal
5. Advance 8 epochs
6. Mark withdrawable
7. Withdraw remaining balance
