import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";

export type AppRole = "student" | "employer" | "staff" | "department";

export type CurrentActor = {
  loading: boolean;
  role?: AppRole;
  userId?: string;
  name: string;
  email?: string;
  roles: string[];
};

// IAM returns a flat array for the impersonating operator but an
// organization-keyed map ({ default: ["student"] }) for org-scoped end users.
export function flattenRoles(roles: unknown): string[] {
  if (typeof roles === "string") return roles ? [roles] : [];
  if (Array.isArray(roles)) return roles.map(String);
  if (roles && typeof roles === "object") return Object.values(roles as Record<string, unknown>).flatMap(flattenRoles);
  return [];
}

// The project owner (clouduser) has no app role; treat them as staff so the
// account that created the project can run the career-services screens.
export function resolveRole(roles: unknown): AppRole | undefined {
  const set = new Set(flattenRoles(roles).map((role) => role.toLowerCase()));
  if (set.has("staff") || set.has("clouduser")) return "staff";
  if (set.has("employer")) return "employer";
  if (set.has("department")) return "department";
  if (set.has("student")) return "student";
  return undefined;
}

export function homePathFor(role?: AppRole): string {
  switch (role) {
    case "student": return "/student/opportunities";
    case "employer": return "/employer/opportunities";
    case "staff": return "/staff";
    case "department": return "/department/analytics";
    default: return "/no-role";
  }
}

export function useActor(): CurrentActor {
  const me = useCurrentUser();
  const profile = me.data?.data;
  return {
    loading: me.isLoading,
    role: resolveRole(profile?.roles),
    userId: profile?.itemId,
    name: userDisplayName(profile),
    email: profile?.email,
    roles: flattenRoles(profile?.roles)
  };
}
