export const ROLES = {
  ADMIN: "admin",
  CASHIER: "cashier",
  KITCHEN: "kitchen",
  HALL: "hall",
  ASSEMBLY: "assembly",
  HISTORY: "history",
  CLIENT: "client",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HOME_ROUTE: Record<string, string> = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.CASHIER]: "/cashier",
  [ROLES.KITCHEN]: "/kitchen",
  [ROLES.HALL]: "/monitor",
  [ROLES.ASSEMBLY]: "/assembly",
  [ROLES.HISTORY]: "/history",
  [ROLES.CLIENT]: "/client",
};