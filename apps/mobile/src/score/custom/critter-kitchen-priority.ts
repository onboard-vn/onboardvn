export function defaultCritterPriorities(
  players: { identityId: string; seat: number }[],
): Record<string, number> {
  return Object.fromEntries(
    [...players]
      .sort((left, right) => left.seat - right.seat)
      .map((player, index) => [player.identityId, index + 1]),
  );
}
