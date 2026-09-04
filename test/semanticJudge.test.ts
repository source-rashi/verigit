import { describe, expect, it } from "vitest";
import {
	digestJudgeOutputSchema,
	judgeOutputSchema,
} from "../src/ai/schema.js";

const verdict = {
	claim: "The repository recorded 18 commits.",
	aligned: true,
	failureMode: null,
	confidence: 0.99,
	reviewRequired: false,
};

describe("digest judge output schema", () => {
	it("accepts a strict array of claim verdicts", () => {
		expect(digestJudgeOutputSchema.parse({ verdicts: [verdict] })).toEqual({
			verdicts: [verdict],
		});
	});

	it("rejects an empty verdict array and unexpected fields", () => {
		expect(() => digestJudgeOutputSchema.parse({ verdicts: [] })).toThrow();
		expect(() => digestJudgeOutputSchema.parse({ verdicts: [verdict], extra: true })).toThrow();
	});

	it("keeps the single-claim schema available for calibration", () => {
		expect(judgeOutputSchema.parse(verdict)).toEqual(verdict);
	});
});