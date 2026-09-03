import type { ParsedCommit } from "./gitParser.js";

export interface FileChurn {
	path: string;
	linesAdded: number;
	linesDeleted: number;
	netLinesChanged: number;
	commitCount: number;
}

export interface PreviousPeriodStats {
	totalCommits: number;
	activeContributors: number;
	filesTouched: number;
	linesAdded: number;
	linesDeleted: number;
	netLinesChanged: number;
}

export interface PeriodComparison {
	previous: PreviousPeriodStats;
	commitsChangePercent: number | null;
	contributorsChangePercent: number | null;
	filesTouchedChangePercent: number | null;
	netLinesChangedChangePercent: number | null;
}

export interface StatsOutput {
	range: {
		since: string;
		until: string;
		latestCommitSha: string | null;
	};
	totalCommits: number;
	activeContributors: number;
	filesTouched: number;
	linesAdded: number;
	linesDeleted: number;
	netLinesChanged: number;
	topChurnedFiles: FileChurn[];
	comparison: PeriodComparison;
}

export interface StatsRange {
	since: string;
	until: string;
}

export function computeStats(
	commits: ParsedCommit[],
	previousCommits: ParsedCommit[] = [],
	range: StatsRange = { since: "", until: "" },
): StatsOutput {
	const current = summarize(commits);
	const previous = summarize(previousCommits);

	return {
		range: {
			...range,
			latestCommitSha: commits[0]?.sha ?? null,
		},
		...current,
		topChurnedFiles: current.topChurnedFiles,
		comparison: {
			previous,
			commitsChangePercent: percentChange(current.totalCommits, previous.totalCommits),
			contributorsChangePercent: percentChange(
				current.activeContributors,
				previous.activeContributors,
			),
			filesTouchedChangePercent: percentChange(
				current.filesTouched,
				previous.filesTouched,
			),
			netLinesChangedChangePercent: percentChange(
				current.netLinesChanged,
				previous.netLinesChanged,
			),
		},
	};
}

function summarize(commits: ParsedCommit[]): PreviousPeriodStats & {
	topChurnedFiles: FileChurn[];
} {
	const contributors = new Set<string>();
	const files = new Map<string, FileChurn>();
	let linesAdded = 0;
	let linesDeleted = 0;

	for (const commit of commits) {
		contributors.add(contributorKey(commit));

		for (const change of commit.files) {
			linesAdded += change.additions;
			linesDeleted += change.deletions;

			const existing = files.get(change.path);
			if (existing) {
				existing.linesAdded += change.additions;
				existing.linesDeleted += change.deletions;
				existing.netLinesChanged = existing.linesAdded - existing.linesDeleted;
				existing.commitCount += 1;
				continue;
			}

			files.set(change.path, {
				path: change.path,
				linesAdded: change.additions,
				linesDeleted: change.deletions,
				netLinesChanged: change.additions - change.deletions,
				commitCount: 1,
			});
		}
	}

	const fileChurn = [...files.values()];
	return {
		totalCommits: commits.length,
		activeContributors: contributors.size,
		filesTouched: files.size,
		linesAdded,
		linesDeleted,
		netLinesChanged: linesAdded - linesDeleted,
		topChurnedFiles: fileChurn
			.sort((left, right) => {
				const churnDifference =
					right.linesAdded + right.linesDeleted - left.linesAdded - left.linesDeleted;
				return churnDifference || left.path.localeCompare(right.path);
			})
			.slice(0, 5),
	};
}

function contributorKey(commit: ParsedCommit): string {
	const email = commit.author.email?.trim().toLowerCase();
	if (email) {
		return `email:${email}`;
	}

	return `name:${commit.author.name.trim().toLowerCase()}`;
}

function percentChange(current: number, previous: number): number | null {
	if (previous === 0) {
		return null;
	}

	return Math.round(((current - previous) / previous) * 10000) / 100;
}