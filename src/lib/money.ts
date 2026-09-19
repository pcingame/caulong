import { z } from "zod";

/**
 * Postgres Int columns overflow past ~2.1B, and no real court/water fee for
 * a badminton session is anywhere near this — cap well below the DB limit
 * so an absurd input (e.g. 1e15) fails validation with a clean 400 instead
 * of crashing the insert with a raw Postgres error.
 */
export const MAX_MONEY_AMOUNT = 100_000_000; // 100 triệu đồng

export const moneyAmountSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_MONEY_AMOUNT, `Số tiền tối đa ${MAX_MONEY_AMOUNT.toLocaleString("vi-VN")}đ`);
