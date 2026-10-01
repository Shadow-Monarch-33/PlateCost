/**
 * Financial domain contracts intentionally contain only plain data.
 * Storage adapters may represent these values as PostgreSQL numeric strings.
 */
export type CurrencyCode = "INR";

export type MoneyAmount = {
  currency: CurrencyCode;
  /** Decimal amount. Do not use binary floating point for persisted truth. */
  amount: string;
};

export type BaseUnit = "g" | "kg" | "ml" | "l" | "each";

export type IngredientPrice = {
  amount: MoneyAmount;
  baseUnit: BaseUnit;
};
