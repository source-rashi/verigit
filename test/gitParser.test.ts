import { describe, expect, it } from "vitest";
import {
	COMMIT_SEPARATOR,
	FIELD_SEPARATOR,
	parseGitLog,
} from "../src/core/gitParser.js";

function commit(header: string, ...rows: string[]): string {
	return `${COMMIT_SEPARATOR}${header}${rows.length > 0 ? `\n${rows.join("\n")}` : ""}`;
}

const header = (...fields: string[]) => fields.join(FIELD_SEPARATOR);

describe("parseGitLog", () => {
	it("parses a normal commit and its line counts", () => {
		const output = commit(
			header("abc123", "parent1", "Ada Lovelace", "ada@example.com", "2026-09-01T10:00:00Z"),
			"4\t2\tsrc/index.ts",
			"1\t0\tREADME.md",
		);

		expect(parseGitLog(output)).toEqual([
			{
				sha: "abc123",
				parentShas: ["parent1"],
				author: { name: "Ada Lovelace", email: "ada@example.com" },
				authoredAt: "2026-09-01T10:00:00Z",
				files: [
					{ path: "src/index.ts", additions: 4, deletions: 2, isBinary: false },
					{ path: "README.md", additions: 1, deletions: 0, isBinary: false },
				],
			},
		]);
	});

	it("retains every parent of a merge commit", () => {
		const output = commit(
			header("merge123", "parent1 parent2", "Grace Hopper", "grace@example.com", "2026-09-01T11:00:00Z"),
			"3\t1\tsrc/merge.ts",
		);

		expect(parseGitLog(output)[0].parentShas).toEqual(["parent1", "parent2"]);
	});

	it("expands git's brace-style rename path", () => {
		const output = commit(
			header("rename123", "parent1", "Linus Torvalds", "linus@example.com", "2026-09-01T12:00:00Z"),
			"5\t2\tsrc/{old-name.ts => new-name.ts}",
		);

		expect(parseGitLog(output)[0].files[0]).toEqual({
			path: "src/new-name.ts",
			previousPath: "src/old-name.ts",
			additions: 5,
			deletions: 2,
			isBinary: false,
		});
	});

	it("flags binary changes and reports zero line counts", () => {
		const output = commit(
			header("binary123", "parent1", "Margaret Hamilton", "", "2026-09-01T13:00:00Z"),
			"-\t-\tassets/logo.png",
		);

		expect(parseGitLog(output)[0]).toMatchObject({
			author: { email: null },
			files: [
				{ path: "assets/logo.png", additions: 0, deletions: 0, isBinary: true },
			],
		});
	});

	it("returns no commits for an empty repository or empty log", () => {
		expect(parseGitLog("")).toEqual([]);
		expect(parseGitLog("\n\n")).toEqual([]);
	});
});