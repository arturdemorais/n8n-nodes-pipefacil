# Publishing and n8n verification

The npm package is `n8n-nodes-pipefacil`. npm publication and n8n verification
are separate steps. Do not describe the package as verified until n8n approves it.

## One-time external setup

1. Make `arturdemorais/n8n-nodes-pipefacil` public after reviewing its files and
   history for material that should remain private. n8n's scanner downloads the
   public source commit recorded in the npm provenance attestation.
2. In the npm package's settings, add a Trusted Publisher:
   - Provider: GitHub Actions
   - Repository owner: `arturdemorais`
   - Repository name: `n8n-nodes-pipefacil`
   - Workflow filename: `publish-npm.yml`
   - Environment: leave blank (the workflow does not use a GitHub Environment)
3. For Trusted Publishing, leave the repository's `NPM_TOKEN` secret unset.
   The workflow has `id-token: write` for OIDC. If retaining token authentication,
   use a granular npm token authorized for this package as `NPM_TOKEN` instead.
   The package maintainer must verify these settings; they cannot be inferred
   from the source files.

Do not rename the workflow without also updating npm's Trusted Publisher setting.

## Prepare a release

1. Run `npm ci`, `npm run lint` and `npm test`.
2. Run `npm run dev` and test the example workflow, selectors and relevant writes
   in a disposable PipeFácil workspace. Verify the node in light/dark mode and
   check credentials and errors on the target n8n version.
3. Choose an unpublished package version. Update both `package.json` and
   `package-lock.json` (for example with `npm version patch --no-git-tag-version`),
   and move the relevant `CHANGELOG.md` Unreleased entries into a dated release.
4. Run `npm pack --dry-run --json`. Check for compiled node/credential entry
   points, both icons, README, LICENSE, docs and the example workflow. Ensure no
   credentials, private inputs or unrelated files enter the tarball.
5. Review and commit the changes, then push the commit to `main`.
6. Create and push a `vX.Y.Z` tag matching `package.json`. This triggers
   `.github/workflows/publish-npm.yml`, which checks the version, lints, tests,
   builds and publishes with `--provenance`.

Use a new version: an already published npm version cannot be replaced. The
current CLI's `npm run release` also automates version/commit/tag/push steps;
review its changelog generation and tag convention before using it. It may look
for `publish.yml` and warn even though this project uses `publish-npm.yml`.
Do not publish locally for verification.

## Verify the published artifact

```sh
npm view n8n-nodes-pipefacil version repository maintainers dist.attestations --json
npx @n8n/scan-community-package n8n-nodes-pipefacil@X.Y.Z
```

The scanner checks provenance, downloads the attested public GitHub source and
lints both source and published JavaScript. It stops at the first failed stage.
Its current CLI may print a failed result while exiting with status 0: inspect
the result text, not just the shell exit status. A local lint pass does not
replace a scan of the published package.

## Submit to n8n

Log in to the [n8n Creator Portal](https://creators.n8n.io/nodes) and submit the
package. Supply the public repository, documentation and any testing information
requested by the portal. Address the technical/UX review before claiming verified
status or Cloud availability.

## Sources

- [Submission and provenance requirements](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes.md)
- [Verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md)
- [UX guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines.md)
