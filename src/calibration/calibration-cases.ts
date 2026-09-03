import type { StatsOutput } from "../core/statsEngine.js";
import type { JudgeOutput } from "../ai/schema.js";

export interface CalibrationCase {
	id: string;
	stats: StatsOutput;
	claim: string;
	expected: Pick<JudgeOutput, "aligned" | "failureMode">;
}

function makeStats(overrides: Partial<StatsOutput> = {}): StatsOutput {
	return {
		range: {
			since: "30d",
			until: "2026-09-03T00:00:00.000Z",
			latestCommitSha: "fixture-sha",
		},
		totalCommits: 18,
		activeContributors: 3,
		filesTouched: 12,
		linesAdded: 420,
		linesDeleted: 120,
		netLinesChanged: 300,
		topChurnedFiles: [{
			path: "src/api.ts",
			linesAdded: 100,
			linesDeleted: 40,
			netLinesChanged: 60,
			commitCount: 7,
		}],
		comparison: {
			previous: {
				totalCommits: 12,
				activeContributors: 2,
				filesTouched: 9,
				linesAdded: 300,
				linesDeleted: 100,
				netLinesChanged: 200,
			},
			commitsChangePercent: 50,
			contributorsChangePercent: 50,
			filesTouchedChangePercent: 33.33,
			netLinesChangedChangePercent: 50,
		},
		...overrides,
	};
}

function aligned(id: string, claim: string, stats: StatsOutput = makeStats()): CalibrationCase {
	return { id, stats, claim, expected: { aligned: true, failureMode: null } };
}

function misaligned(
	id: string,
	claim: string,
	failureMode: NonNullable<JudgeOutput["failureMode"]>,
	stats: StatsOutput = makeStats(),
): CalibrationCase {
	return { id, stats, claim, expected: { aligned: false, failureMode } };
}

const allCases: CalibrationCase[] = [
	// Aligned claims
	aligned("aligned-01", "The period recorded 18 commits by 3 active contributors."),
	aligned("aligned-02", "The repository touched 12 files and added 420 lines."),
	aligned("aligned-03", "The net change was 300 lines after 120 deletions."),
	aligned("aligned-04", "src/api.ts was the top churned file with 7 commits."),
	aligned("aligned-05", "The previous period recorded 12 commits."),
	aligned("aligned-06", "The current period had 50 percent more commits than the previous period."),
	aligned("aligned-07", "The reporting range is 30d through 2026-09-03T00:00:00.000Z."),
	aligned("aligned-08", "src/api.ts had 100 lines added and 40 lines deleted."),
	aligned("aligned-09", "There were 3 active contributors in the current period."),
	aligned("aligned-10", "The repository deleted 120 lines."),

	// Misinterpretation: correct values attached to the wrong metric or meaning
	misaligned("misinterpretation-01", "The repository added 300 lines.", "misinterpretation"),
	misaligned("misinterpretation-02", "The repository had 420 net lines changed.", "misinterpretation"),
	misaligned("misinterpretation-03", "src/api.ts was touched in 100 commits.", "misinterpretation"),
	misaligned("misinterpretation-04", "The 50 percent figure means contributors doubled.", "misinterpretation"),

	// Overgeneralization: a bounded fact is expanded beyond the evidence
	misaligned("overgeneralization-01", "Every changed file was src/api.ts.", "overgeneralization"),
	misaligned("overgeneralization-02", "All 18 commits modified the top churned file.", "overgeneralization"),
	misaligned("overgeneralization-03", "The three contributors worked on every file.", "overgeneralization"),
	misaligned("overgeneralization-04", "The repository's entire development effort was concentrated in src/api.ts.", "overgeneralization"),

	// Causation error: activity is treated as causing an unsupported outcome
	misaligned("causation_error-01", "The 18 commits improved the product's reliability.", "causation_error"),
	misaligned("causation_error-02", "Deleting 120 lines made the application faster.", "causation_error"),
	misaligned("causation_error-03", "The increase in commits caused customer satisfaction to rise.", "causation_error"),
	misaligned("causation_error-04", "The team touched 12 files because it was fixing production bugs.", "causation_error"),

	// Temporal error: current and previous periods are swapped or misstated
	misaligned("temporal_error-01", "The previous period had 18 commits.", "temporal_error"),
	misaligned("temporal_error-02", "The repository recorded 12 commits in the current period.", "temporal_error"),
	misaligned("temporal_error-03", "The report covers the last 7d.", "temporal_error"),
	misaligned("temporal_error-04", "The 50 percent increase describes the next period.", "temporal_error"),

	// Insufficient evidence: the claim needs information absent from StatsOutput
	misaligned("insufficient_evidence-01", "The team spent most of its time fixing authentication bugs.", "insufficient_evidence"),
	misaligned("insufficient_evidence-02", "The commits were written by senior engineers.", "insufficient_evidence"),
	misaligned("insufficient_evidence-03", "The changes removed a security vulnerability.", "insufficient_evidence"),
	misaligned("insufficient_evidence-04", "The repository is ready for production.", "insufficient_evidence"),

	// Unsupported claim: plausible repository assertions with no evidence at all
	misaligned("unsupported_claim-01", "The team had a productive sprint.", "unsupported_claim"),
	misaligned("unsupported_claim-02", "The API redesign was the main project goal.", "unsupported_claim"),
	misaligned("unsupported_claim-03", "The project is healthier than last month.", "unsupported_claim"),
	misaligned("unsupported_claim-04", "The contributors collaborated effectively.", "unsupported_claim"),
	misaligned("unsupported_claim-05", "The codebase is becoming easier to maintain.", "unsupported_claim"),

	// Additional aligned cases with zero and negative values
	aligned("aligned-11", "The previous period had 12 commits and 200 net lines changed."),
	aligned("aligned-12", "The top churned file was src/api.ts with 60 net lines changed."),
	aligned("aligned-13", "The current period had 33.33 percent more files touched than the previous period."),
	aligned("aligned-14", "The range ends at 2026-09-03T00:00:00.000Z."),
	aligned("aligned-15", "There were 120 deleted lines in the period."),

	// Subtle mixed negative cases
	misaligned("misinterpretation-05", "The 420 additions mean the net change was 420 lines.", "misinterpretation"),
	misaligned("overgeneralization-05", "src/api.ts was the only important file in the repository.", "overgeneralization"),
	misaligned("causation_error-05", "The 50 percent commit increase proves the team became more productive.", "causation_error"),
	misaligned("temporal_error-05", "The 30d range means these are exactly the commits from the previous period.", "temporal_error"),
	misaligned("insufficient_evidence-05", "The 420 added lines introduced a successful feature.", "insufficient_evidence"),
	misaligned("unsupported_claim-06", "The project team prefers small pull requests.", "unsupported_claim"),
	aligned("aligned-16", "There were 420 lines added and 120 lines deleted."),
	aligned("aligned-17", "The current period touched 12 files."),
	aligned("aligned-18", "The previous period had 2 active contributors."),
	misaligned("unsupported_claim-07", "The repository has no technical debt.", "unsupported_claim"),
	misaligned("unsupported_claim-08", "The contributors used test-driven development.", "unsupported_claim"),
	misaligned("temporal_error-06", "The previous period had 9 files touched.", "temporal_error"),
	misaligned("misinterpretation-06", "The repository deleted 300 lines.", "misinterpretation"),
	misaligned("overgeneralization-06", "All contributors modified src/api.ts.", "overgeneralization"),
	misaligned("causation_error-06", "The 300 net lines guarantee the release was successful.", "causation_error"),
];

const additionalDevCases: CalibrationCase[] = [
	misaligned("unsupported_claim-dev-01", "The team completed a successful release.", "unsupported_claim"),
	misaligned("unsupported_claim-dev-02", "The repository's architecture is now easier to maintain.", "unsupported_claim"),
	misaligned("unsupported_claim-dev-03", "The contributors coordinated effectively during this period.", "unsupported_claim"),
];

export const devCases = allCases.slice(0, 30).concat(additionalDevCases);
export const lockedCases = allCases.slice(30, 50);