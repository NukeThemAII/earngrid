export type TvlResponse = {
  timestamp: number;
  blockNumber: number;
  totalAssets: string;
  totalSupply: string;
  assetsPerShare: string;
};

export type ApyResponse = {
  timestamp: number;
  assetsPerShare: string;
  apy7d: number | null;
  apy30d: number | null;
  snapshots: {
    latest: number;
    sevenDay: number | null;
    thirtyDay: number | null;
  };
};

export type AllocationResponse = {
  timestamp: number;
  blockNumber: number;
  allocations: {
    strategy: string;
    assets: string;
    tier: number;
    capAssets: string;
    enabled: boolean;
    isSynchronous: boolean;
  }[];
};

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001";
}

export async function fetchTvl(): Promise<TvlResponse | null> {
  return fetchJson<TvlResponse>("/api/tvl");
}

export async function fetchApy(): Promise<ApyResponse | null> {
  return fetchJson<ApyResponse>("/api/apy");
}

export async function fetchAllocations(): Promise<AllocationResponse | null> {
  return fetchJson<AllocationResponse>("/api/allocations");
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
