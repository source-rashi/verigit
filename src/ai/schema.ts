import { z } from "zod";
import type { StatsOutput } from "../core/statsEngine.js";

const fileChurnSchema = z.object({
	path: z.string(),
	linesAdded: z.number(),
	linesDeleted: z.number(),
	netLinesChanged: z.number(),
	commitCount: z.number(),
}).strict();

const previousPeriodStatsSchema = z.object({
	totalCommits: z.number(),
	activeContributors: z.number(),
	filesTouched: z.number(),
	linesAdded: z.number(),
	linesDeleted: z.number(),
	netLinesChanged: z.number(),
}).strict();

const periodComparisonSchema = z.object({
	previous: previousPeriodStatsSchema,
	commitsChangePercent: z.number().nullable(),
	contributorsChangePercent: z.number().nullable(),
	filesTouchedChangePercent: z.number().nullable(),
	netLinesChangedChangePercent: z.number().nullable(),
}).strict();

export const statsOutputSchema = z.object({
	range: z.object({
		since: z.string(),
		until: z.string(),
		latestCommitSha: z.string().nullable(),
	}).strict(),
	totalCommits: z.number(),
	activeContributors: z.number(),
	filesTouched: z.number(),
	linesAdded: z.number(),
	linesDeleted: z.number(),
	netLinesChanged: z.number(),
	topChurnedFiles: z.array(fileChurnSchema),
	comparison: periodComparisonSchema,
}).strict();

export type StatsSchemaOutput = z.infer<typeof statsOutputSchema>;

export const failureModes = [
	"misinterpretation",
	"overgeneralization",
	"causation_error",
	"temporal_error",
	"insufficient_evidence",
	"unsupported_claim",
] as const;

export const judgeOutputSchema = z.object({
	claim: z.string(),
	aligned: z.boolean(),
	failureMode: z.enum(failureModes).nullable(),
	confidence: z.number().min(0).max(1),
	reviewRequired: z.boolean(),
}).strict();

export type JudgeOutput = z.infer<typeof judgeOutputSchema>;

export const judgeOutputJsonSchema = {
	type: "object",
	additionalProperties: false,
	required: ["claim", "aligned", "failureMode", "confidence", "reviewRequired"],
	properties: {
		claim: { type: "string" },
		aligned: { type: "boolean" },
		failureMode: {
			anyOf: [
				{
					type: "string",
					enum: failureModes,
				},
				{ type: "null" },
			],
		},
		confidence: { type: "number", minimum: 0, maximum: 1 },
		reviewRequired: { type: "boolean" },
	},
} as const;

// Keep the runtime schema aligned with the TypeScript contract.
const statsOutputTypeCheck: StatsOutput = {} as StatsSchemaOutput;
void statsOutputTypeCheck;