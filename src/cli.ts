import { Command } from "commander";
import { runReport } from "./commands/report.js";

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

if (process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("cli.ts")) {
		await program.parseAsync(process.argv);
}