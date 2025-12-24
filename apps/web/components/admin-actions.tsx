"use client";

import * as React from "react";
import { keccak256, toBytes } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import { blendedVaultAbi } from "@blended-vault/sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { vaultAddress } from "@/lib/chain";
import { ALLOCATOR_ROLE, CURATOR_ROLE, DEFAULT_ADMIN_ROLE, GUARDIAN_ROLE } from "@/lib/roles";

const accessControlAbi = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function AdminActions() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [queueInput, setQueueInput] = React.useState("");
  const [capInput, setCapInput] = React.useState("");
  const [salt, setSalt] = React.useState("queue");
  const safeVaultAddress = (vaultAddress ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const { data: isAdmin } = useReadContract({
    abi: accessControlAbi,
    address: safeVaultAddress,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, address ?? "0x"],
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const { data: isCurator } = useReadContract({
    abi: accessControlAbi,
    address: safeVaultAddress,
    functionName: "hasRole",
    args: [CURATOR_ROLE, address ?? "0x"],
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const { data: isAllocator } = useReadContract({
    abi: accessControlAbi,
    address: safeVaultAddress,
    functionName: "hasRole",
    args: [ALLOCATOR_ROLE, address ?? "0x"],
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const { data: isGuardian } = useReadContract({
    abi: accessControlAbi,
    address: safeVaultAddress,
    functionName: "hasRole",
    args: [GUARDIAN_ROLE, address ?? "0x"],
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const roleLabel = isAdmin
    ? "Owner"
    : isCurator
      ? "Curator"
      : isAllocator
        ? "Allocator"
        : isGuardian
          ? "Guardian"
          : "Viewer";

  async function harvest() {
    if (!vaultAddress) {
      return;
    }
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "harvest",
      args: [],
    });
  }

  async function pauseDeposits() {
    if (!vaultAddress) {
      return;
    }
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "pauseDeposits",
      args: [],
    });
  }

  async function pauseWithdrawals() {
    if (!vaultAddress) {
      return;
    }
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "pauseWithdrawals",
      args: [],
    });
  }

  async function updateQueues() {
    if (!vaultAddress) {
      return;
    }
    const entries = queueInput
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean) as `0x${string}`[];

    if (entries.length === 0) {
      return;
    }

    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "setDepositQueue",
      args: [entries],
    });
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "setWithdrawQueue",
      args: [entries],
    });
  }

  async function scheduleCapIncrease() {
    if (!vaultAddress) {
      return;
    }
    const [strategy, cap] = capInput.split(",").map((value) => value.trim());
    if (!strategy || !cap) {
      return;
    }
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "scheduleCapIncrease",
      args: [strategy as `0x${string}`, BigInt(cap), keccak256(toBytes(salt))],
    });
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle className="text-sm text-muted">Admin actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Role detected:</span>
          <span className="rounded-full border border-border px-2 py-1 text-text">{roleLabel}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button variant="outline" disabled={!isAllocator || isPending} onClick={harvest}>
            Harvest
          </Button>
          <Button variant="outline" disabled={!isGuardian || isPending} onClick={pauseDeposits}>
            Pause Deposits
          </Button>
          <Button variant="outline" disabled={!isGuardian || isPending} onClick={pauseWithdrawals}>
            Pause Withdrawals
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted">Queue update (one strategy per line).</p>
          <Input
            value={queueInput}
            onChange={(event) => setQueueInput(event.target.value)}
            placeholder="0xStrategyA\n0xStrategyB"
          />
          <Button variant="outline" disabled={!isAllocator || isPending} onClick={updateQueues}>
            Update Queues
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted">Schedule cap increase: "strategy,cap" and salt.</p>
          <Input
            value={capInput}
            onChange={(event) => setCapInput(event.target.value)}
            placeholder="0xStrategy,1000000000"
          />
          <Input value={salt} onChange={(event) => setSalt(event.target.value)} placeholder="salt" />
          <Button variant="outline" disabled={!isCurator || isPending} onClick={scheduleCapIncrease}>
            Schedule Cap Increase
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
