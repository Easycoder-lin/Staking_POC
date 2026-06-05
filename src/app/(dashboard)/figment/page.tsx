"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { FigmentConnectionStatus } from "@/components/FigmentConnectionStatus";
import { FigmentDepositPreview, type DepositPreview } from "@/components/FigmentDepositPreview";
import { FigmentValidatorRequest } from "@/components/FigmentValidatorRequest";
import { FigmentValidatorStatus } from "@/components/FigmentValidatorStatus";
import { WalletStatus } from "@/components/WalletStatus";

type FigmentHealth = {
  ok?: boolean;
  mode?: string;
  network?: string;
  baseUrl?: string;
  error?: string;
};

type FigmentRequestResponse = {
  ok?: boolean;
  error?: string;
  details?: unknown;
  validatorIdentifier?: string;
  depositData?: unknown;
  unsignedTransaction?: unknown;
  depositPreview?: DepositPreview;
  raw?: unknown;
};

export default function FigmentPage() {
  const { address } = useAccount();
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [numberOfValidators, setNumberOfValidators] = useState(1);
  const [figmentHealth, setFigmentHealth] = useState<FigmentHealth>();
  const [figmentResult, setFigmentResult] = useState<FigmentRequestResponse>();
  const [figmentStatus, setFigmentStatus] = useState<unknown>();
  const [figmentPending, setFigmentPending] = useState<string>();
  const [figmentError, setFigmentError] = useState<string>();
  const [figmentSuccess, setFigmentSuccess] = useState<string>();

  useEffect(() => {
    setWithdrawalAddress((current) => current || address || "");
  }, [address]);

  const checkFigmentHealth = useCallback(async () => {
    setFigmentPending("health");
    setFigmentError(undefined);
    setFigmentSuccess(undefined);
    try {
      const response = await fetch("/api/figment/health", { cache: "no-store" });
      const body = (await response.json()) as FigmentHealth;
      if (!response.ok || !body.ok) throw new Error(body.error || "Figment health check failed.");
      setFigmentHealth(body);
    } catch (healthError) {
      setFigmentHealth(undefined);
      setFigmentError(readableError(healthError));
    } finally {
      setFigmentPending(undefined);
    }
  }, []);

  const requestFigmentValidator = useCallback(async () => {
    setFigmentPending("request");
    setFigmentError(undefined);
    setFigmentSuccess(undefined);

    if (!isAddress(withdrawalAddress)) {
      setFigmentPending(undefined);
      setFigmentError("Enter a valid withdrawal address.");
      return;
    }
    if (!Number.isInteger(numberOfValidators) || numberOfValidators <= 0) {
      setFigmentPending(undefined);
      setFigmentError("numberOfValidators must be greater than 0.");
      return;
    }

    try {
      const response = await fetch("/api/figment/validators/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalAddress, numberOfValidators })
      });
      const body = (await response.json()) as FigmentRequestResponse;
      if (!response.ok || !body.ok) throw new Error(body.error || "Figment validator request failed.");
      setFigmentResult(body);
      setFigmentStatus(undefined);
      setFigmentSuccess("Figment returned validator data for preview.");
    } catch (requestError) {
      setFigmentError(readableError(requestError));
    } finally {
      setFigmentPending(undefined);
    }
  }, [numberOfValidators, withdrawalAddress]);

  const checkFigmentStatus = useCallback(async () => {
    if (!figmentResult?.validatorIdentifier) return;

    setFigmentPending("status");
    setFigmentError(undefined);
    try {
      const params = new URLSearchParams({ validatorIdentifier: figmentResult.validatorIdentifier });
      const response = await fetch(`/api/figment/validators/status?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as { ok?: boolean; error?: string; status?: unknown };
      if (!response.ok || !body.ok) throw new Error(body.error || "Figment validator status lookup failed.");
      setFigmentStatus(body.status);
    } catch (statusError) {
      setFigmentError(readableError(statusError));
    } finally {
      setFigmentPending(undefined);
    }
  }, [figmentResult?.validatorIdentifier]);

  return (
    <>
      <WalletStatus />
      <div className="rounded-lg border border-rose/25 bg-rose/10 p-4 text-sm font-semibold text-rose">
        No deposit will be sent in Phase B1.
      </div>
      <FigmentConnectionStatus
        health={figmentHealth}
        pending={figmentPending === "health"}
        error={figmentPending === "health" ? undefined : figmentError}
        onCheck={checkFigmentHealth}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <FigmentValidatorRequest
            withdrawalAddress={withdrawalAddress}
            connectedAddress={address}
            numberOfValidators={numberOfValidators}
            pending={figmentPending === "request"}
            error={figmentPending === "request" ? figmentError : undefined}
            success={figmentSuccess}
            onWithdrawalAddressChange={setWithdrawalAddress}
            onNumberOfValidatorsChange={setNumberOfValidators}
            onRequest={requestFigmentValidator}
          />
          <FigmentValidatorStatus
            validatorIdentifier={figmentResult?.validatorIdentifier}
            status={figmentStatus}
            pending={figmentPending === "status"}
            error={figmentPending === "status" ? figmentError : undefined}
            onCheck={checkFigmentStatus}
          />
        </div>
        <FigmentDepositPreview
          depositData={figmentResult?.depositData}
          unsignedTransaction={figmentResult?.unsignedTransaction}
          preview={figmentResult?.depositPreview}
        />
      </div>
    </>
  );
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0];
  return "Request failed.";
}
