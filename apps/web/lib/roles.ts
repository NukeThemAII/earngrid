import { keccak256, toBytes } from "viem";

export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
export const CURATOR_ROLE = keccak256(toBytes("CURATOR_ROLE"));
export const ALLOCATOR_ROLE = keccak256(toBytes("ALLOCATOR_ROLE"));
export const GUARDIAN_ROLE = keccak256(toBytes("GUARDIAN_ROLE"));
