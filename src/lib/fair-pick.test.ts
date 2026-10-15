import { describe, expect, it } from "vitest";
import { fairPick } from "./fair-pick";

describe("fairPick", () => {
  it("never repeats the last holder when others are available", () => {
    for (let i = 0; i < 200; i++) expect(fairPick(["a", "b", "c"], ["a"])).not.toBe("a");
  });
  it("prefers the player with the fewest past picks", () => {
    expect(fairPick(["a", "b", "c"], ["a", "b", "a", "b"])).toBe("c");
  });
  it("allows a repeat when only one candidate exists", () => {
    expect(fairPick(["a"], ["a"])).toBe("a");
  });
  it("distributes roughly evenly over many rounds", () => {
    const hist: string[] = [];
    const ids = ["a", "b", "c", "d"];
    for (let i = 0; i < 400; i++) hist.push(fairPick(ids, hist)!);
    for (const id of ids) expect(hist.filter((h) => h === id).length).toBe(100);
  });
});
