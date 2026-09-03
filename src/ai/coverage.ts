import type { StatsOutput } from "../core/statsEngine.js";

export interface CoverageResult {
	score: number;
	missingFacts: string[];
}

const requiredFacts = [
	"totalCommits",
	"activeContributors",
	"filesTouched",
	"netLinesChanged",
] as const;

export function checkCoverage(
	stats: StatsOutput,
	digestText: string,
): CoverageResult {
	const missingFacts = requiredFacts.filter(
		(fact) => !hasAggregateFact(stats, digestText, fact),
	) as string[];

	if (stats.topChurnedFiles.length > 0) {
		const topFile = stats.topChurnedFiles[0].path;
		if (!digestText.includes(topFile)) {
			missingFacts.push("topChurnedFiles[0]");
		}
	}

	const requiredCount = requiredFacts.length + (stats.topChurnedFiles.length > 0 ? 1 : 0);
	return {
		score: (requiredCount - missingFacts.length) / requiredCount,
		missingFacts,
	};
}

function hasAggregateFact(
	stats: StatsOutput,
	digestText: string,
	fact: (typeof requiredFacts)[number],
): boolean {
	const value = {
		totalCommits: stats.totalCommits,
		activeContributors: stats.activeContributors,
		filesTouched: stats.filesTouched,
		netLinesChanged: stats.netLinesChanged,
	}[fact];
	const number = numberPattern(value);

	const contextPatterns = {
		totalCommits: new RegExp(`${number}\\s+(?:total\\s+)?commits?\\b`, "i"),
		activeContributors: new RegExp(
			`${number}\\s+(?:active\\s+)?contributors?\\b`,
			"i",
		),
		filesTouched: new RegExp(`${number}\\s+(?:distinct\\s+)?files?\\b`, "i"),
		netLinesChanged: new RegExp(
			`(?:net\\s+(?:increase|decrease|change)|net\\s+lines?\\s+changed)\\s+(?:of\\s+)?${number}\\b|${number}\\s+net\\s+lines?\\s+changed\\b`,
			"i",
		),
	};

	return contextPatterns[fact].test(digestText);
}

function numberPattern(value: number): string {
	return escapeRegExp(value.toLocaleString("en-US"));
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}