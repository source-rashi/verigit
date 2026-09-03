import { judgeClaim } from "../ai/semantic-judge.js";
import type { JudgeOutput } from "../ai/schema.js";
import { devCases, lockedCases, type CalibrationCase } from "./calibration-cases.js";

export interface CalibrationOptions {
	locked?: boolean;
}

export interface CalibrationScores {
	set: "dev" | "locked";
	total: number;
	correct: number;
	accuracy: number;
	precision: number;
	recall: number;
	f1: number;
	falsePositiveRate: number;
	failureModeAgreement: Record<string, number>;
}

export async function runCalibration(
	options: CalibrationOptions = {},
): Promise<CalibrationScores> {
	const cases = options.locked ? lockedCases : devCases;
	const predictions: JudgeOutput[] = [];
	for (const calibrationCase of cases) {
		predictions.push(await judgeClaim(calibrationCase.claim, calibrationCase.stats));
	}

	return scoreCalibration(cases, predictions, options.locked ? "locked" : "dev");
}

export function scoreCalibration(
	cases: CalibrationCase[],
	predictions: JudgeOutput[],
	set: "dev" | "locked",
): CalibrationScores {
	if (cases.length !== predictions.length) {
		throw new Error("Calibration cases and predictions must have equal lengths.");
	}

	let correct = 0;
	let truePositive = 0;
	let falsePositive = 0;
	let falseNegative = 0;
	let trueNegative = 0;
	const modeTotals = new Map<string, { correct: number; total: number }>();

	for (const [index, calibrationCase] of cases.entries()) {
		const expectedAligned = calibrationCase.expected.aligned;
		const predicted = predictions[index];
		const predictedAligned = predicted.aligned;
		if (expectedAligned === predictedAligned && calibrationCase.expected.failureMode === predicted.failureMode) {
			correct += 1;
		}

		if (!expectedAligned && !predictedAligned) {
			truePositive += 1;
		} else if (expectedAligned && !predictedAligned) {
			falsePositive += 1;
		} else if (!expectedAligned && predictedAligned) {
			falseNegative += 1;
		} else {
			trueNegative += 1;
		}

		const mode = calibrationCase.expected.failureMode;
		if (mode) {
			const total = modeTotals.get(mode) ?? { correct: 0, total: 0 };
			total.total += 1;
			if (predicted.failureMode === mode) {
				total.correct += 1;
			}
			modeTotals.set(mode, total);
		}
	}

	const precision = ratio(truePositive, truePositive + falsePositive);
	const recall = ratio(truePositive, truePositive + falseNegative);
	return {
		set,
		total: cases.length,
		correct,
		accuracy: ratio(correct, cases.length),
		precision,
		recall,
		f1: ratio(2 * precision * recall, precision + recall),
		falsePositiveRate: ratio(falsePositive, falsePositive + trueNegative),
		failureModeAgreement: Object.fromEntries(
			[...modeTotals.entries()].map(([mode, values]) => [mode, ratio(values.correct, values.total)]),
		),
	};
}

function ratio(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : Math.round((numerator / denominator) * 10000) / 10000;
}

export function formatCalibrationScores(scores: CalibrationScores): string {
	return [
		`Calibration set: ${scores.set}`,
		`Cases: ${scores.total}`,
		`Accuracy: ${scores.accuracy}`,
		`Precision: ${scores.precision}`,
		`Recall: ${scores.recall}`,
		`F1: ${scores.f1}`,
		`False-positive rate: ${scores.falsePositiveRate}`,
		"Failure-mode agreement:",
		...Object.entries(scores.failureModeAgreement).map(([mode, score]) => `  ${mode}: ${score}`),
	].join("\n") + "\n";
}