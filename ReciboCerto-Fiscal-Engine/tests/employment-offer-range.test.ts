import { describe, expect, it } from "vitest";
import { workerRangeProfiles } from "../src";

describe("intervalo sem perfil do candidato", () => {
  it("usa perfis distintos, explícitos e sem regimes presumidos", () => {
    const profiles = workerRangeProfiles("PT-MADEIRA");
    expect(profiles).toHaveLength(4);
    expect(new Set(profiles.map((profile) => `${profile.maritalStatus}:${profile.dependants}`)).size)
      .toBe(4);
    for (const profile of profiles) {
      expect(profile.jurisdiction).toBe("PT-MADEIRA");
      expect(profile.disability).toBe(false);
      expect(profile.youthIrs).toBeUndefined();
    }
  });
});

