import { generateDigest } from "../ai/digestGenerator.js";
import { judgeClaim } from "../ai/semantic-judge.js";
import { repairDigest } from "../ai/repair.js";
import { validateDigest, type DigestValidationResult } from "../ai/validation.js";
import type { JudgeOutput } from "../ai/schema.js";
import type { StatsOutput } from "../core/statsEngine.js";
import { runReport } from "./report.js";

export interface DigestCommandOptions {
	since: string;
	cwd?: string;
	strict?: boolean;
	minCoverage?: number;
}

export async function runDigest(options: DigestCommandOptions): Promise<string> {
	const stats = JSON.parse(
		runReport({ since: options.since, format: "json", cwd: options.cwd }),
	) as StatsOutput;
	const digest = await generateDigest(stats);
	if (!options.strict) {
		return digest;
	}

	return runStrictValidation(stats, digest, options.minCoverage ?? 0.8);
}

async function runStrictValidation(
	stats: StatsOutput,
	initialDigest: string,
	minCoverage: number,
): Promise<string> {
	const initial = await evaluateDigest(stats, initialDigest);
	if (passesStrictValidation(initial, minCoverage)) {
		return initialDigest;
	}

	const repairedDigest = await repairDigest({
		stats,
		digestText: initialDigest,
		validation: initial.validation,
		semanticFailures: initial.semanticFailures,
	});
	const repaired = await evaluateDigest(stats, repairedDigest);
	if (!passesStrictValidation(repaired, minCoverage)) {
		throw new Error(
			`Digest failed strict validation after one repair attempt. Missing facts: ${repaired.validation.missingFacts.join(", ") || "none"}; unverified numbers: ${repaired.validation.unverifiedNumbers.join(", ") || "none"}.`,
		);
	}

	return repairedDigest;
}

interface StrictEvaluation {
	validation: DigestValidationResult;
	semanticFailures: JudgeOutput[];
}

async function evaluateDigest(
	stats: StatsOutput,
	digestText: string,
): Promise<StrictEvaluation> {
	const validation = validateDigest(stats, digestText);
	const claims = digestText
		.split(/(?<=[.!?])\s+/)
		.map((claim) => claim.trim())
		.filter(Boolean);
	const verdicts = await Promise.all(claims.map((claim) => judgeClaim(claim, stats)));
	return {
		validation,
		semanticFailures: verdicts.filter((verdict) => !verdict.aligned || verdict.reviewRequired),
	};
}

function passesStrictValidation(
	evaluation: StrictEvaluation,
	minCoverage: number,
): boolean {
	return evaluation.validation.citationsPassed
		&& evaluation.validation.coverageScore >= minCoverage
		&& evaluation.semanticFailures.length === 0;
}