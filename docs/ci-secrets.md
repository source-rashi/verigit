# GitHub Actions Secrets

## GROQ_API_KEY

1. Open `source-rashi/verigit` on GitHub.
2. Go to **Settings**.
3. Open **Secrets and variables** > **Actions**.
4. Select **New repository secret**.
5. Set the name to `GROQ_API_KEY`.
6. Paste the Groq API key as the value and save it.

`eval.yml` reads this exact name through `secrets.GROQ_API_KEY`. The reusable evaluation job receives it from `release.yml` through `secrets: inherit`. The CI workflow does not receive or use this secret.

## Enabling npm publishing later

Before enabling real releases, add an `NPM_TOKEN` repository secret in the same location. Then:

- remove `--dry-run` from the semantic-release command in `release.yml`;
- pass `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` to the release job environment;
- keep `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` available for tags, changelog commits, and GitHub release metadata;
- verify the package name and npm access before the first publish.

The current release workflow is intentionally dry-run only and will not publish to npm.
