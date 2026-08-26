import type { User } from "./types";

function roleTier(role: string | null | undefined) {
  if (role === "admin") return 0;
  if (role === "manager") return 1;
  return 2;
}

function idSequence(uniqueId: string) {
  const match = uniqueId.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function sortEmployees<T extends Pick<User, "unique_id"> & { role?: string | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const roleDiff = roleTier(a.role) - roleTier(b.role);
    if (roleDiff !== 0) return roleDiff;
    const seqDiff = idSequence(a.unique_id) - idSequence(b.unique_id);
    if (seqDiff !== 0) return seqDiff;
    return a.unique_id.localeCompare(b.unique_id);
  });
}
