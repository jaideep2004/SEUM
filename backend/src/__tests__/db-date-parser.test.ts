import { types } from "pg";
// Registering the DATE parser happens as a side effect of importing the pool.
import "../db";

describe("Postgres DATE type parsing", () => {
  it("keeps DATE columns as plain YYYY-MM-DD strings", () => {
    const parseDate = types.getTypeParser(1082) as (value: string) => unknown;
    expect(parseDate("2026-11-17")).toBe("2026-11-17");
    expect(parseDate("2026-01-01")).toBe("2026-01-01");
  });
});
