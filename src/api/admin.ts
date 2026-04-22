import { supabase } from "../lib/supabase";
export type CreateUserPayload = {
  email: string;
  password: string;
  role: "cashier" | "kitchen" | "hall" | "assembly" | "history" | "admin";
};

export async function createUserByAdmin(payload: CreateUserPayload) {
  const { data, error } = await supabase.functions.invoke("create-staff-user", {
    body: payload,
    headers: {
      "x-admin-secret": import.meta.env.VITE_ADMIN_FUNCTION_SECRET as string,
    },
  });

  if (error) {
    throw new Error(error.message || "Function invoke failed");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}