import { describe, expect, it } from "vitest";
import {
  VISIBLE_STAGES,
  mintStageToVisible,
} from "../../components/employee/types";

describe("mintStageToVisible", () => {
  it("collapses all 4-tx staging stages into 'verifying-onchain'", () => {
    // #given/when/then
    expect(mintStageToVisible("staging-init")).toBe("verifying-onchain");
    expect(mintStageToVisible("staging-append-1")).toBe("verifying-onchain");
    expect(mintStageToVisible("staging-append-2")).toBe("verifying-onchain");
    expect(mintStageToVisible("verifying")).toBe("verifying-onchain");
  });

  it("maps 'complete' to 'minting-credential'", () => {
    // #when/then
    expect(mintStageToVisible("complete")).toBe("minting-credential");
  });
});

describe("VISIBLE_STAGES", () => {
  it("matches the PRD §11.4 5-stage list verbatim", () => {
    // #then
    expect(VISIBLE_STAGES.map((s) => s.label)).toEqual([
      "Decrypting your UTXOs",
      "Building witness",
      "Generating ZK proof",
      "Verifying on-chain",
      "Minting credential",
    ]);
  });
});
