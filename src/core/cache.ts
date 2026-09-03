import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { StatsOutput } from "./statsEngine.js";

interface StatsCacheEntry {
	latestCommitSha: string;
	stats: StatsOutput;
}

export const DEFAULT_CACHE_PATH = join(".repowise", "stats-cache.json");

export function readStatsCache(
	latestCommitSha: string | null,
	cachePath: string = DEFAULT_CACHE_PATH,
): StatsOutput | null {
	if (!latestCommitSha) {
		return null;
	}

	try {
		const entry = JSON.parse(readFileSync(cachePath, "utf8")) as StatsCacheEntry;
		if (entry.latestCommitSha !== latestCommitSha || !entry.stats) {
			return null;
		}

		return entry.stats;
	} catch {
		return null;
	}
}

export function writeStatsCache(
	stats: StatsOutput,
	cachePath: string = DEFAULT_CACHE_PATH,
): void {
	const latestCommitSha = stats.range.latestCommitSha;
	if (!latestCommitSha) {
		return;
	}

	const entry: StatsCacheEntry = { latestCommitSha, stats };
	mkdirSync(dirname(cachePath), { recursive: true });
	writeFileSync(cachePath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
}