"use client";

import ReactFlow, { Background, type Edge, type Node } from "reactflow";
import { statusLabels, statusTone } from "@/lib/labels";
import { ValidatorStatus } from "@/lib/types";

const lifecycleNodes: Array<{ id: string; label: string; status: ValidatorStatus; x: number; y: number }> = [
  { id: "none", label: "Not Staked", status: ValidatorStatus.None, x: 0, y: 90 },
  { id: "pending", label: "Pending Activation", status: ValidatorStatus.PendingActivation, x: 220, y: 90 },
  { id: "active", label: "Active", status: ValidatorStatus.Active, x: 470, y: 90 },
  { id: "exiting", label: "Exiting", status: ValidatorStatus.Exiting, x: 720, y: 0 },
  { id: "slashed", label: "Slashed", status: ValidatorStatus.Slashed, x: 720, y: 180 },
  { id: "withdrawable", label: "Withdrawable", status: ValidatorStatus.Withdrawable, x: 970, y: 90 },
  { id: "withdrawn", label: "Withdrawn", status: ValidatorStatus.Withdrawn, x: 1220, y: 90 }
];

const edges: Edge[] = [
  { id: "none-pending", source: "none", target: "pending", animated: true },
  { id: "pending-active", source: "pending", target: "active", animated: true },
  { id: "active-exiting", source: "active", target: "exiting", animated: true },
  { id: "exiting-withdrawable", source: "exiting", target: "withdrawable", animated: true },
  { id: "withdrawable-withdrawn", source: "withdrawable", target: "withdrawn", animated: true },
  { id: "active-slashed", source: "active", target: "slashed", animated: true },
  { id: "slashed-withdrawable", source: "slashed", target: "withdrawable", animated: true }
];

export function ValidatorFlow({ status }: { status?: ValidatorStatus }) {
  const activeStatus = status ?? ValidatorStatus.None;
  const nodes: Node[] = lifecycleNodes.map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    data: { label: node.label },
    draggable: false,
    className:
      node.status === activeStatus
        ? `${statusTone(node.status)} !border-ink !shadow-panel`
        : "!border-line !bg-white !text-ink",
    style: {
      borderRadius: 8,
      borderWidth: 2,
      width: node.status === ValidatorStatus.PendingActivation ? 170 : 140,
      minHeight: 44,
      fontSize: 13,
      fontWeight: 700
    }
  }));

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Validator Lifecycle Flow</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink/70">
            This simulator simplifies Ethereum staking. It does not implement real Beacon Chain consensus, BLS
            signatures, validator clients, or exact slashing economics.
          </p>
        </div>
        <span className="text-sm font-medium text-ink/65">Current: {statusLabels[activeStatus]}</span>
      </div>

      <div className="mt-4 h-[320px] overflow-hidden rounded-md border border-line bg-paper">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} panOnScroll>
          <Background color="#d9ded6" gap={18} />
        </ReactFlow>
      </div>
    </section>
  );
}
