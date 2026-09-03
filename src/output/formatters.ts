import type { StatsOutput } from "../core/statsEngine.js";

export type OutputFormat = "table" | "json" | "md";

export function formatStats(stats: StatsOutput, format: OutputFormat): string {
	switch (format) {
		case "json":
			return `${JSON.stringify(stats, null, 2)}\n`;
		case "md":
			return formatMarkdown(stats);
		case "table":
			return formatTable(stats);
	}
}

function formatTable(stats: StatsOutput): string {
	const lines = [
		`Commits:             ${stats.totalCommits}`,
		`Active contributors: ${stats.activeContributors}`,
		`Files touched:       ${stats.filesTouched}`,
		`Lines added:         ${stats.linesAdded}`,
		`Lines deleted:       ${stats.linesDeleted}`,
		`Net lines changed:   ${stats.netLinesChanged}`,
		"",
		"Top churned files:",
		...(stats.topChurnedFiles.length === 0
			? ["  None"]
			: stats.topChurnedFiles.map(
					(file) =>
						`  ${file.path} (+${file.linesAdded}/-${file.linesDeleted}, ${file.commitCount} commits)`,
				)),
	];

	return `${lines.join("\n")}\n`;
}

function formatMarkdown(stats: StatsOutput): string {
	const files = stats.topChurnedFiles.length === 0
		? "| None | 0 | 0 | 0 |\n"
		: stats.topChurnedFiles
			.map(
				(file) =>
					`| ${file.path} | ${file.linesAdded} | ${file.linesDeleted} | ${file.commitCount} |`,
			)
			.join("\n") + "\n";

	return [
		"# Verigit report",
		"",
		"| Metric | Value |",
		"| --- | ---: |",
		`| Total commits | ${stats.totalCommits} |`,
		`| Active contributors | ${stats.activeContributors} |`,
		`| Files touched | ${stats.filesTouched} |`,
		`| Lines added | ${stats.linesAdded} |`,
		`| Lines deleted | ${stats.linesDeleted} |`,
		`| Net lines changed | ${stats.netLinesChanged} |`,
		"",
		"## Top churned files",
		"",
		"| File | Added | Deleted | Commits |",
		"| --- | ---: | ---: | ---: |",
		files.trimEnd(),
		"",
	].join("\n") + "\n";
}