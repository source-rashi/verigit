export const COMMIT_SEPARATOR = "\x1e";
export const FIELD_SEPARATOR = "\x1f";

export interface ParsedFileChange {
	path: string;
	previousPath?: string;
	additions: number;
	deletions: number;
	isBinary: boolean;
}

export interface ParsedCommit {
	sha: string;
	parentShas: string[];
	author: {
		name: string;
		email: string | null;
	};
	authoredAt: string;
	files: ParsedFileChange[];
}

/**
 * Header format for the input is:
 * %x1e%H%x1f%P%x1f%an%x1f%ae%x1f%aI
 * followed by git's --numstat rows.
 */
export function parseGitLog(output: string): ParsedCommit[] {
	if (output.trim() === "") {
		return [];
	}

	return output
		.split(COMMIT_SEPARATOR)
		.map((record) => record.trim())
		.filter(Boolean)
		.map(parseCommitRecord);
}

function parseCommitRecord(record: string): ParsedCommit {
	const lines = record.split(/\r?\n/);
	const header = lines.shift() ?? "";
	const fields = header.split(FIELD_SEPARATOR);

	if (fields.length < 5 || fields[0] === "") {
		throw new Error(`Invalid git log commit header: ${header}`);
	}

	const [sha, parents, authorName, authorEmail, authoredAt] = fields;

	return {
		sha,
		parentShas: parents === "" ? [] : parents.split(" "),
		author: {
			name: authorName,
			email: authorEmail === "" ? null : authorEmail,
		},
		authoredAt,
		files: lines.filter((line) => line.trim() !== "").map(parseNumstat),
	};
}

function parseNumstat(line: string): ParsedFileChange {
	const match = /^(\d+|-)\s+(\d+|-)\s+(.+)$/.exec(line.trim());
	if (!match) {
		throw new Error(`Invalid git numstat row: ${line}`);
	}

	const [, additionsText, deletionsText, rawPath] = match;
	const isBinary = additionsText === "-" || deletionsText === "-";
	const rename = parseRenamePath(rawPath);

	return {
		path: rename.path,
		...(rename.previousPath === undefined
			? {}
			: { previousPath: rename.previousPath }),
		additions: isBinary ? 0 : Number(additionsText),
		deletions: isBinary ? 0 : Number(deletionsText),
		isBinary,
	};
}

function parseRenamePath(rawPath: string): {
	path: string;
	previousPath?: string;
} {
	const arrow = rawPath.indexOf(" => ");
	if (arrow < 0) {
		return { path: rawPath };
	}

	const before = rawPath.slice(0, arrow);
	const after = rawPath.slice(arrow + 4);
	const braceMatch = /^(.*)\{(.*) => (.*)\}(.*)$/.exec(rawPath);

	if (braceMatch) {
		const [, prefix, oldPart, newPart, suffix] = braceMatch;
		return {
			previousPath: `${prefix}${oldPart}${suffix}`,
			path: `${prefix}${newPart}${suffix}`,
		};
	}

	return { previousPath: before, path: after };
}