"use client";

import * as React from "react";
import { erc20Abi, parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import { blendedVaultAbi } from "@blended-vault/sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usdcAddress, usdcDecimals, vaultAddress } from "@/lib/chain";

export function DepositWithdrawPanel() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = React.useState("");
  const { writeContractAsync, isPending } = useWriteContract();

  const parsedAmount = safeParseUnits(amount, usdcDecimals);

  async function approve() {
    if (!address || !usdcAddress || !vaultAddress || parsedAmount === 0n) {
      return;
    }
    await writeContractAsync({
      abi: erc20Abi,
      address: usdcAddress,
      functionName: "approve",
      args: [vaultAddress, parsedAmount],
    });
  }

  async function deposit() {
    if (!address || !vaultAddress || parsedAmount === 0n) {
      return;
    }
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "deposit",
      args: [parsedAmount, address],
    });
  }

  async function withdraw() {
    if (!address || !vaultAddress || parsedAmount === 0n) {
      return;
    }
    await writeContractAsync({
      abi: blendedVaultAbi,
      address: vaultAddress,
      functionName: "withdraw",
      args: [parsedAmount, address, address],
    });
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle className="text-sm text-muted">Deposit / Withdraw</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Button variant="outline" onClick={approve} disabled={!isConnected || isPending}>
            Approve USDC
          </Button>
          <Button onClick={deposit} disabled={!isConnected || isPending}>
            Deposit
          </Button>
          <Button variant="outline" onClick={withdraw} disabled={!isConnected || isPending}>
            Withdraw
          </Button>
        </div>
        <p className="text-xs text-muted">
          This is a synchronous vault. Withdrawals revert if liquidity is unavailable.
        </p>
      </CardContent>
    </Card>
  );
}

function safeParseUnits(value: string, decimals: number): bigint {
  if (!value) {
    return 0n;
  }
  try {
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
}
