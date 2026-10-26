import { describe, expect, it } from "bun:test";
import { createIlluminate } from "../../../app/experiences/illuminate";
import { ILLUMINATE_LEVELS } from "../../../app/experiences/illuminate/controls";

describe("createIlluminate", () => {
  it("should start at the middle quality level", () => {
    const { quality } = createIlluminate();
    expect(quality).toEqual({ levels: ILLUMINATE_LEVELS.length, initial: ILLUMINATE_LEVELS.length - 1 });
  });
});
