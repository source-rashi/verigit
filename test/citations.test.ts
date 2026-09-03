import { describe, expect, it } from "vitest";
import type { StatsOutput } from "../src/core/statsEngine.js";
import { validateDigest } from "../src/ai/validation.js";

const stats: StatsOutput = {
	range: {
		since: "30d",
		until: "2026-09-03T00:00:00.000Z",
		latestCommitSha: "abc123",
	},
	totalCommits: 18,
	activeContributors: 1,
	filesTouched: 32,
	linesAdded: 3089,
	linesDeleted: 41,
	netLinesChanged: 3048,
	topChurnedFiles: [{
		path: "src/v2/parser.ts",
		linesAdded: 10,
		linesDeleted: 2,
		netLinesChanged: 8,
		commitCount: 2,
	}],
	comparison: {
		previous: {
			totalCommits: 0,
			activeContributors: 0,
			filesTouched: 0,
			linesAdded: 0,
			linesDeleted: 0,
			netLinesChanged: 0,
		},
		commitsChangePercent: null,
		contributorsChangePercent: null,
		filesTouchedChangePercent: null,
		netLinesChangedChangePercent: null,
	},
};

const groundedDigest =
	"In the last 30 days through 2026-09-03T00:00:00.000Z, there were 18 commits by 1 active contributor across 32 files, with a net change of 3048 lines. The top file was src/v2/parser.ts.";

describe("deterministic digest validation", () => {
	it("passes a fully grounded digest", () => {
		expect(validateDigest(stats, groundedDigest)).toEqual({
			citationsPassed: true,
			unverifiedNumbers: [],
			coverageScore: 1,
			missingFacts: [],
		});
	});

	it("identifies a fabricated number", () => {
		const result = validateDigest(stats, `${groundedDigest} It had 999 commits.`);
		expect(result.citationsPassed).toBe(false);
		expect(result.unverifiedNumbers).toContain("999");
	});

	it("reports a missing required period fact", () => {
		const result = validateDigest(stats, groundedDigest.replace("last 30 days through 2026-09-03T00:00:00.000Z", "recently"));
		expect(result.coverageScore).toBeLessThan(1);
		expect(result.missingFacts).toContain("periodRange");
	});

	it("ignores digits that are part of a filename", () => {
		const result = validateDigest(stats, groundedDigest.replace("src/v2/parser.ts", "src/v9/parser.ts"));
		expect(result.citationsPassed).toBe(true);
	});

	it("documents metric conflation as outside deterministic checking", () => {
		const result = validateDigest(stats, groundedDigest.replace("net change of 3048 lines", "3048 lines added"));
		expect(result.citationsPassed).toBe(true);
	});
});