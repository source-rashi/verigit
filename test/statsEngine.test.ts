import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readStatsCache, writeStatsCache } from "../src/core/cache.js";
import type { ParsedCommit } from "../src/core/gitParser.js";
import { computeStats } from "../src/core/statsEngine.js";

const commit = (
	sha: string,
	author: ParsedCommit["author"],
	files: ParsedCommit["files"],
): ParsedCommit => ({
	sha,
	parentShas: [],
	author,
	authoredAt: "2026-09-01T00:00:00Z",
	files,
});

describe("computeStats", () => {
	it("computes repository totals and top churned files", () => {
		const commits = [
			commit("new", { name: "Ada", email: "ADA@example.com" }, [
				{ path: "a.ts", additions: 10, deletions: 2, isBinary: false },
				{ path: "b.ts", additions: 1, deletions: 0, isBinary: false },
			]),
			commit("old", { name: "Grace", email: "grace@example.com" }, [
				{ path: "a.ts", additions: 3, deletions: 4, isBinary: false },
				{ path: "image.png", additions: 0, deletions: 0, isBinary: true },
			]),
		];

		const stats = computeStats(commits, [
			commit("previous", { name: "Grace", email: "grace@example.com" }, [
				{ path: "old.ts", additions: 2, deletions: 0, isBinary: false },
			]),
		], { since: "30d", until: "now" });

		expect(stats.totalCommits).toBe(2);
		expect(stats.activeContributors).toBe(2);
		expect(stats.filesTouched).toBe(3);
		expect(stats.linesAdded).toBe(14);
		expect(stats.linesDeleted).toBe(6);
		expect(stats.netLinesChanged).toBe(8);
		expect(stats.topChurnedFiles[0]).toEqual({
			path: "a.ts",
			linesAdded: 13,
			linesDeleted: 6,
			netLinesChanged: 7,
			commitCount: 2,
		});
		expect(stats.comparison.previous.totalCommits).toBe(1);
		expect(stats.comparison.commitsChangePercent).toBe(100);
	});

	it("returns zero metrics and null deltas for an empty period", () => {
		const stats = computeStats([], [], { since: "tomorrow", until: "now" });

		expect(stats).toMatchObject({
			totalCommits: 0,
			activeContributors: 0,
			filesTouched: 0,
			linesAdded: 0,
			linesDeleted: 0,
			netLinesChanged: 0,
			topChurnedFiles: [],
			range: { latestCommitSha: null },
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
			},
		});
	});

	it("uses one normalized email identity and falls back to name", () => {
		const stats = computeStats([
			commit("one", { name: "Ada", email: "ADA@example.com" }, []),
			commit("two", { name: "Different", email: "ada@example.com" }, []),
			commit("three", { name: "Grace", email: null }, []),
			commit("four", { name: " grace ", email: null }, []),
		]);

		expect(stats.activeContributors).toBe(2);
	});
});

describe("stats cache", () => {
	let temporaryDirectory: string;

	afterEach(() => {
		if (temporaryDirectory) {
			rmSync(temporaryDirectory, { recursive: true, force: true });
		}
	});

	it("hits for the same SHA and misses for a changed SHA", () => {
		temporaryDirectory = mkdtempSync(join(tmpdir(), "verigit-cache-"));
		const cachePath = join(temporaryDirectory, ".repowise", "stats.json");
		const stats = computeStats([
			commit("latest", { name: "Ada", email: "ada@example.com" }, []),
		]);

		expect(readStatsCache("latest", cachePath)).toBeNull();
		writeStatsCache(stats, cachePath);
		expect(readStatsCache("latest", cachePath)).toEqual(stats);
		expect(readStatsCache("changed", cachePath)).toBeNull();
	});
});