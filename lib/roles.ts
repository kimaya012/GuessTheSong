// A listener's rank is drawn from their lifetime point total (userStats.totalPoints),
// not any single game — it's a reputation that builds up over many puzzles.
// Named after the culture of going to the pictures, matching the game's
// cinema-hall identity.
export interface ListenerRole {
  name: string;
  minPoints: number;
}

export const LISTENER_ROLES: ListenerRole[] = [
  { name: "Matinee Beginner", minPoints: 0 },
  { name: "Casual Listener", minPoints: 2500 },
  { name: "Devoted Listener", minPoints: 12000 },
  { name: "Soundtrack Scholar", minPoints: 30000 },
  { name: "Golden Jubilee Listener", minPoints: 60000 },
];

export interface RoleProgress {
  role: ListenerRole;
  next: ListenerRole | null;
  pointsToNext: number | null;
}

export function roleForPoints(totalPoints: number): RoleProgress {
  let current = LISTENER_ROLES[0];
  let currentIndex = 0;
  for (let i = 0; i < LISTENER_ROLES.length; i++) {
    if (totalPoints >= LISTENER_ROLES[i].minPoints) {
      current = LISTENER_ROLES[i];
      currentIndex = i;
    }
  }
  const next = LISTENER_ROLES[currentIndex + 1] ?? null;
  return {
    role: current,
    next,
    pointsToNext: next ? next.minPoints - totalPoints : null,
  };
}
