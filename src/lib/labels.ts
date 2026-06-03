import { SlashReason, ValidatorStatus } from "@/lib/types";

export const statusLabels: Record<ValidatorStatus, string> = {
  [ValidatorStatus.None]: "Not Staked",
  [ValidatorStatus.PendingActivation]: "Pending Activation",
  [ValidatorStatus.Active]: "Active",
  [ValidatorStatus.Exiting]: "Exiting",
  [ValidatorStatus.Slashed]: "Slashed",
  [ValidatorStatus.Withdrawable]: "Withdrawable",
  [ValidatorStatus.Withdrawn]: "Withdrawn"
};

export const slashReasonLabels: Record<SlashReason, string> = {
  [SlashReason.None]: "None",
  [SlashReason.DoubleProposal]: "DoubleProposal",
  [SlashReason.DoubleVote]: "DoubleVote",
  [SlashReason.SurroundVote]: "SurroundVote"
};

export function statusTone(status: ValidatorStatus) {
  if (status === ValidatorStatus.Active) return "bg-moss text-white";
  if (status === ValidatorStatus.Slashed) return "bg-rose text-white";
  if (status === ValidatorStatus.Withdrawable) return "bg-sky text-white";
  if (status === ValidatorStatus.Withdrawn) return "bg-ink text-white";
  if (status === ValidatorStatus.Exiting) return "bg-rust text-white";
  return "bg-line text-ink";
}
