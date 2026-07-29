export type UserRole = "admin" | "provider" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
