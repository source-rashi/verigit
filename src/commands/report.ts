import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { ParsedCommit } from "../core/gitParser.js";
import { parseGitLog } from "../core/gitParser.js";
import { readStatsCache, writeStatsCache } from "../core/cache.js";
import { computeStats } from "../core/statsEngine.js";
import { formatStats, type OutputFormat } from "../output/formatters.js";

export interface ReportOptions {
	since: string;
	format: OutputFormat;
	cwd?: string;
}

export function getGitCommits(args: string[], cwd?: string): ParsedCommit[] {
	try {
		const output = execFileSync(
			"git",
			[
				"log",
				"--no-color",
				"--numstat",
				"--format=%x1e%H%x1f%P%x1f%an%x1f%ae%x1f%aI",
				...args,
			],
			{ cwd, encoding: "utf8" },
		);
		return parseGitLog(output);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Unable to read git history: ${message}`);
	}
}

export function runReport(options: ReportOptions): string {
	const periodStart = parsePeriodStart(options.since);
	const currentCommits = getGitCommits([`--since=${periodStart.toISOString()}`], options.cwd);
	const latestSha = currentCommits[0]?.sha ?? null;
	const cachePath = join(options.cwd ?? process.cwd(), ".repowise", "stats-cache.json");
	const cached = readStatsCache(latestSha, cachePath);
	if (cached) {
		return formatStats(cached, options.format);
	}

	const previousStart = new Date(periodStart.getTime() - (Date.now() - periodStart.getTime()));
	const previousCommits = getGitCommits(
		[`--since=${previousStart.toISOString()}`, `--until=${periodStart.toISOString()}`],
		options.cwd,
	);
	const stats = computeStats(currentCommits, previousCommits, {
		since: options.since,
		until: new Date().toISOString(),
	});
	writeStatsCache(stats, cachePath);
	return formatStats(stats, options.format);
}

function parsePeriodStart(period: string): Date {
	const match = /^(\d+)([dhw])$/.exec(period);
	if (!match) {
		const date = new Date(period);
		if (!Number.isNaN(date.getTime())) {
			return date;
		}
		throw new Error(`Unsupported period: ${period}. Use values such as 30d or an ISO date.`);
	}

	const [, amountText, unit] = match;
	const unitMilliseconds = { d: 86_400_000, h: 3_600_000, w: 604_800_000 }[unit as "d" | "h" | "w"];
	return new Date(Date.now() - Number(amountText) * unitMilliseconds);
}