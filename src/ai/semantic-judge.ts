import Groq from "groq-sdk";
import type { StatsOutput } from "../core/statsEngine.js";
import { loadConfig, type AppConfig } from "../config.js";
import {
	judgeOutputJsonSchema,
	judgeOutputSchema,
	statsOutputSchema,
	type JudgeOutput,
} from "./schema.js";

export const SEMANTIC_JUDGE_SYSTEM_PROMPT = `You are a strict semantic verifier for repository activity summaries.

Your task is to determine whether one candidate claim is fully supported by the supplied structured repository statistics.

Metric definitions:
- commits.total is an activity count, not a quality signal.
- contributors.active_this_period is the number of distinct active contributors.
- files.touched is the number of distinct files touched in the period.
- lines.net_change is lines.added minus lines.deleted.
- A number must be attributed to the correct metric, not merely appear somewhere in the stats.
- For example, citing netLinesChanged as if it were linesAdded is a misinterpretation and is not an aligned claim.
- topChurnedFiles contains files ranked by total line churn, with their additions, deletions, net changes, and commit counts.
- comparison.previous contains raw metrics for the previous period.
- Percentage comparisons are exact reported deltas and must not be confused with raw metric values.
- A claim about causation, intent, quality, productivity, performance, or business impact is unsupported unless the evidence explicitly contains that fact.

Failure-mode precedence and distinctions:
- Use overgeneralization when a claim takes a supported, bounded repository fact and extends it with universal or exhaustive language such as "every", "all", "entire", "only", or "the whole team". Knowing that src/api.ts is the top churned file does not support "every changed file was src/api.ts" or "the three contributors worked on every file". These are overgeneralizations, not merely insufficient evidence.
- Use insufficient_evidence when the claim introduces a specific fact or topic for which the evidence provides no meaningful corresponding fact at all, such as a claim about authentication work, seniority, or a security fix.
- Use temporal_error when a claim assigns a current-period value to the previous period, assigns a previous-period value to the current period, uses the wrong reporting range, or refers to a future or next period. When a number exists in the evidence but is attributed to the wrong period, prefer temporal_error over misinterpretation or unsupported_claim.
- The current period is represented by the top-level aggregate fields. The previous period is represented by comparison.previous. The range field identifies the reporting window. Do not transfer values between these scopes.
- Use unsupported_claim only when the claim makes a repository assertion with no relevant numerical, file, range, or comparison anchor in the evidence.

Judge the claim against the evidence exactly. Do not reward claims merely because they sound plausible. Do not infer facts that are absent. If the claim is aligned, set failureMode to null. If it is not aligned, select the single most appropriate failure mode:
- misinterpretation: the evidence is used as the wrong metric or meaning
- overgeneralization: a narrow fact is expanded beyond what the evidence supports
- causation_error: activity is presented as causing an outcome not supported by the evidence
- temporal_error: the claim uses the wrong reporting period or comparison period
- insufficient_evidence: the claim requires facts not present in the supplied evidence
- unsupported_claim: the claim is not grounded in the supplied evidence

Set confidence to a number from 0 to 1. Set reviewRequired to true when the judgment is materially uncertain or the claim should receive human review.

Return only the required structured JSON verdict.`;

export interface JudgeOptions {
	config?: AppConfig;
}

export async function judgeClaim(
	claim: string,
	stats: StatsOutput,
	options: JudgeOptions = {},
): Promise<JudgeOutput> {
	const validatedStats = statsOutputSchema.parse(stats);
	const config = options.config ?? loadConfig();
	const client = new Groq({ apiKey: config.groqApiKey, timeout: 45_000 });

	try {
		const completion = await client.chat.completions.create({
			model: config.groqModel,
			messages: [
				{ role: "system", content: SEMANTIC_JUDGE_SYSTEM_PROMPT },
				{
					role: "user",
					content: `Candidate claim:\n${claim}\n\nStructured stats evidence:\n${JSON.stringify(validatedStats, null, 2)}`,
				},
			],
			temperature: 0,
			reasoning_effort: "low",
			include_reasoning: false,
			max_completion_tokens: 300,
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "judge_verdict",
					strict: true,
					schema: judgeOutputJsonSchema,
				},
			},
		});
		const content = completion.choices[0]?.message?.content;
		if (!content || typeof content !== "string") {
			throw new Error("Groq returned an empty judge verdict.");
		}

		return judgeOutputSchema.parse(JSON.parse(content));
	} catch (error) {
		if (error instanceof Error && error.message === "Groq returned an empty judge verdict.") {
			throw error;
		}
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Unable to judge claim with Groq: ${message}`);
	}
}