import type { StatsOutput } from "../core/statsEngine.js";
import { checkCoverage } from "./coverage.js";

export interface CitationResult {
	citationsPassed: boolean;
	unverifiedNumbers: string[];
}

export interface DigestValidationResult extends CitationResult {
	coverageScore: number;
	missingFacts: string[];
}

export function checkCitations(stats: StatsOutput, digestText: string): CitationResult {
	const values = new Set(collectNumbers(stats).map(normalizeNumber));
	const citedNumbers = extractCitedNumbers(digestText);
	const unverifiedNumbers = [...new Set(
		citedNumbers
			.filter((number) => !values.has(normalizeNumber(number)))
			.map((number) => number),
	)];

	return {
		citationsPassed: unverifiedNumbers.length === 0,
		unverifiedNumbers,
	};
}

export function validateDigest(
	stats: StatsOutput,
	digestText: string,
): DigestValidationResult {
	const citations = checkCitations(stats, digestText);
	const coverage = checkCoverage(stats, digestText);
	return {
		...citations,
		coverageScore: coverage.score,
		missingFacts: coverage.missingFacts,
	};
}

function collectNumbers(value: unknown): string[] {
	if (typeof value === "number") {
		return [String(value)];
	}
	if (Array.isArray(value)) {
		return value.flatMap(collectNumbers);
	}
	if (value !== null && typeof value === "object") {
		return Object.values(value).flatMap(collectNumbers);
	}
	return [];
}

function extractCitedNumbers(text: string): string[] {
	const number = "[-+]?\\d[\\d,]*(?:\\.\\d+)?";
	const metric = "(?:commits?|contributors?|files?|lines?|net\\s+(?:increase|decrease|change)|net\\s+lines?\\s+changed|added|deleted|deletions?|commits?)";
	const cited: string[] = [];
	const beforeMetric = new RegExp(`(?<![\\w/.-])(${number})(?=\\s*(?:${metric})\\b)`, "gi");
	const afterMetric = new RegExp(`(?:${metric})\\s+(?:of\\s+)?(${number})\\b`, "gi");

	for (const match of text.matchAll(beforeMetric)) {
		cited.push(match[1]);
	}
	for (const match of text.matchAll(afterMetric)) {
		cited.push(match[1]);
	}

	return cited;
}

function normalizeNumber(value: string): string {
	return value.replace(/,/g, "").replace(/^\+/, "");
}