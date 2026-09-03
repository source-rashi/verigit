import "dotenv/config";

export interface AppConfig {
	groqApiKey: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
	const groqApiKey = env.GROQ_API_KEY?.trim();
	if (!groqApiKey) {
		throw new Error(
			"GROQ_API_KEY is missing. Add it to the project root .env file or your environment.",
		);
	}

	return { groqApiKey };
}