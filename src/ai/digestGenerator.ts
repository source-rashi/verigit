import Groq from "groq-sdk";
import { loadConfig, type AppConfig } from "../config.js";
import { statsOutputSchema } from "./schema.js";
import type { StatsOutput } from "../core/statsEngine.js";

export const DIGEST_PROMPT_TEMPLATE = `You are a precise software engineering activity analyst.

Generate a natural-language summary of the repository activity represented only by the JSON stats object below.

Rules:
- Write exactly 3 to 5 sentences.
- Mention only facts directly supported by the provided stats.
- Do not infer code quality, developer performance, intent, causation, or business impact.
- Treat total commits as an activity count, not a quality signal.
- State numbers exactly as given in the stats JSON — do not round, estimate, or approximate any figure.
- Do not use ranges, grouping, or comparative phrases in place of exact figures.
- Describe the reporting period accurately using the authoritative range below; never assume or substitute a seven-day period.
- You may mention changes compared with the previous period only when the comparison values are present.
- Do not mention commit messages, diffs, files beyond the provided top churned files, or any information not present in the stats.
- Return plain text only. Do not use headings, bullets, JSON, or markdown.

Reporting range: {{RANGE_SINCE}} through {{RANGE_UNTIL}}

Stats JSON:
{{STATS_JSON}}`;

export interface DigestOptions {
	config?: AppConfig;
}

export async function generateDigest(
	stats: StatsOutput,
	options: DigestOptions = {},
): Promise<string> {
	const validatedStats = statsOutputSchema.parse(stats);
	const config = options.config ?? loadConfig();
	const prompt = DIGEST_PROMPT_TEMPLATE
		.replace("{{RANGE_SINCE}}", validatedStats.range.since)
		.replace("{{RANGE_UNTIL}}", validatedStats.range.until)
		.replace("{{STATS_JSON}}", JSON.stringify(validatedStats, null, 2));
	const client = new Groq({ apiKey: config.groqApiKey });

	try {
		const completion = await client.chat.completions.create({
			model: config.groqModel,
			messages: [{ role: "user", content: prompt }],
			temperature: 0.2,
			reasoning_effort: "low",
			include_reasoning: false,
			max_completion_tokens: 500,
		});
		const content = completion.choices[0]?.message?.content;
		if (!content || typeof content !== "string") {
			throw new Error("Groq returned an empty digest.");
		}

		return content.trim();
	} catch (error) {
		if (error instanceof Error && error.message === "Groq returned an empty digest.") {
			throw error;
		}
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Unable to generate digest with Groq: ${message}`);
	}
}