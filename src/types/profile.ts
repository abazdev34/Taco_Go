export type UserRole =
  | "admin"
  | "cashier"
  | "kitchen"
  | "hall"
  | "history"
  | "assembly"
  | "client";

export type AccessStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole | null;
  status: AccessStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string | null;
};