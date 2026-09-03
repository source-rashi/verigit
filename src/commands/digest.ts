import { generateDigest } from "../ai/digestGenerator.js";
import { runReport } from "./report.js";

export interface DigestCommandOptions {
	since: string;
	cwd?: string;
}

export async function runDigest(options: DigestCommandOptions): Promise<string> {
	const stats = JSON.parse(
		runReport({ since: options.since, format: "json", cwd: options.cwd }),
	);
	return generateDigest(stats);
}