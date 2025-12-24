"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </Button>
    );
  }

  return (
    <Button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending || connectors.length === 0}
    >
      Connect Wallet
    </Button>
  );
}
