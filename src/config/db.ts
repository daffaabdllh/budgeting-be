import { drizzle } from "drizzle-orm/d1";
import * as schema from "../database/schema";

export const db = (d1: D1Database) => {
    return drizzle(d1, { schema });
};

export type DrizzleD1 = ReturnType<typeof db>;
