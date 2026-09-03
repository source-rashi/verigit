import { Command } from "commander";
import { runDigest } from "./commands/digest.js";
import { runReport } from "./commands/report.js";
import { formatCalibrationScores, runCalibration } from "./calibration/calibrate.js";

export const program = new Command().name("verigit").description("Git repository intelligence CLI");

program
	.command("report")
	.description("Show repository activity statistics")
	.option("--since <period>", "include commits from this period", "30d")
	.option("--format <format>", "output format: table, json, or md", "table")
	.action((options: { since: string; format: string }) => {
		if (!["table", "json", "md"].includes(options.format)) {
			throw new Error(`Unsupported format: ${options.format}`);
		}

		process.stdout.write(
			runReport({
				since: options.since,
				format: options.format as "table" | "json" | "md",
			}),
		);
	});

program
	.command("digest")
	.description("Generate an AI activity digest")
	.option("--since <period>", "include commits from this period", "7d")
	.action(async (options: { since: string }) => {
		process.stdout.write(await runDigest({ since: options.since }));
		process.stdout.write("\n");
	});

program
	.command("calibrate")
	.description("Evaluate the semantic judge against calibration cases")
	.option("--test", "run the locked calibration set")
	.action(async (options: { test?: boolean }) => {
		const scores = await runCalibration({ locked: options.test === true });
		process.stdout.write(formatCalibrationScores(scores));
	});

if (process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("cli.ts")) {
		try {
			await program.parseAsync(process.argv);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`Error: ${message}`);
			process.exitCode = 1;
		}
}