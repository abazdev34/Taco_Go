export type ProfileRole =
  | "admin"
  | "cashier"
  | "kitchen"
  | "hall"
  | "assembly"
  | "history";

export type AccessStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string | null;
  role: ProfileRole | null;
  status: AccessStatus | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
}