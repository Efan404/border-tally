import { getMinerUPollInterval } from "@/lib/mineru-parser";

describe("MinerU polling cadence", () => {
  test("uses a 10 second polling interval to reduce edge invocations", () => {
    expect(getMinerUPollInterval(0)).toBe(10000);
    expect(getMinerUPollInterval(10_000)).toBe(10000);
    expect(getMinerUPollInterval(60_000)).toBe(10000);
  });
});
