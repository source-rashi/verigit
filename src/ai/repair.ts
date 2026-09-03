import type { AppConfig } from "../config.js";
import type { StatsOutput } from "../core/statsEngine.js";
import { generateDigest } from "./digestGenerator.js";
import type { DigestValidationResult } from "./validation.js";
import type { JudgeOutput } from "./schema.js";

export interface RepairOptions {
	stats: StatsOutput;
	digestText: string;
	validation: DigestValidationResult;
	semanticFailures: JudgeOutput[];
	config?: AppConfig;
}

export async function repairDigest(options: RepairOptions): Promise<string> {
	const semanticFindings = options.semanticFailures.length === 0
		? "None"
		: options.semanticFailures
			.map((verdict) => `${verdict.failureMode ?? "unaligned"}: ${verdict.claim}`)
			.join("\n");
	const repairContext = [
		"Regenerate the digest once to correct these validation failures.",
		`Unverified numbers: ${options.validation.unverifiedNumbers.join(", ") || "none"}`,
		`Missing required facts: ${options.validation.missingFacts.join(", ") || "none"}`,
		`Semantic failures:\n${semanticFindings}`,
		"Use only the supplied stats JSON as evidence. Return exactly 3 to 5 plain-text sentences.",
	].join("\n");

	return generateDigest(options.stats, {
		config: options.config,
		repairContext,
	});
}