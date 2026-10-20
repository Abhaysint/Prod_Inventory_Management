// Enums verified against app/models.py:47-51 and app/models.py:67-70

export const UserRole = {
  ADMIN: "admin",
  MANAGER: "manager",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TransactionType = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
  ADJUSTMENT: "adjustment",
  RETURN: "return",
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
