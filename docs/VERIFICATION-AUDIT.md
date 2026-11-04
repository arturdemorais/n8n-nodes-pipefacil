# n8n verification readiness audit

Audit date: 4 November 2026. The initial review inspected `0.4.0` and the local
changes subsequently prepared as `0.5.0`. This is a readiness review, not n8n
approval or a penetration test. The repository was made public with the owner's
authorization after the initial review. Creator Portal submission remains pending.

## Result

The local package passes lint, build and regression tests after the corrections
below. The repository is now public. Version `0.5.0` was published through GitHub
Actions with SLSA v1 provenance and passed every stage of the official scanner,
including attested source and published tarball analysis. Passing these checks
does not establish n8n approval. Creator Portal review is a separate step.

## Requirements reviewed

| Area | Evidence and result |
| --- | --- |
| Package discovery | `n8n-nodes-pipefacil` has the required prefix and `n8n-community-node-package` keyword. Node and credential entries resolve to compiled files. |
| Ownership | npm lists `arturdemorais <artur@grupovorp.com>` as maintainer and the same GitHub repository as `package.json`. No mismatch found in these metadata. |
| Public source | **Resolved.** Changed from private to public with the owner's authorization. GitHub now reports `visibility: public`. |
| Provenance | **Resolved in 0.5.0.** Published through GitHub Actions with SLSA v1 provenance. The official scanner verified the attestation and fetched source commit 96f3cec. The older 0.4.0 still lacks provenance. |
| Publishing authentication | GitHub Actions publication succeeded using the existing NPM_TOKEN secret. Its value was not read. No Trusted Publisher or credential changes were necessary. |
| License | `package.json` declares MIT. Added the missing MIT `LICENSE` file; it is included in the npm file list. |
| Dependencies | No runtime `dependencies`, `optionalDependencies` or bundled dependencies. Runtime source imports only local modules and the n8n-provided `n8n-workflow` peer dependency. Development dependencies remain outside the distributed runtime. |
| Restricted APIs | Source inspection found no direct environment-variable access, filesystem access, process execution or console logging in `nodes/` or `credentials/`. Binary data uses n8n's binary helpers. |
| Credentials | Access token is required, empty by default, marked as a password and sent through n8n's authentication helpers. HTTPS API origin is fixed. Documented the user-list permission needed by the existing connection test. No embedded key was found in runtime source or example. |
| Scope | One service: PipeFácil. The node integrates CRM operations rather than implementing logic or flow control. Public searches found no existing PipeFácil entry in n8n's integration catalog/core repository; this is not an exhaustive uniqueness guarantee. |
| Language | Runtime labels, help and locally generated messages are English. Replaced the Portuguese README and translated the recent changelog entries. Service names, API enum values and workspace-supplied names remain unchanged. Upstream API errors may use the provider's language. |
| Documentation | README covers installation, credentials, permissions, every resource, compatibility limits, troubleshooting, side effects and API limitations. Added release instructions and an importable, credential-free read-only workflow. |
| UX | Resource/operation selectors, required fields, optional collections, dynamic selectors, cursor pagination and mapped fields reviewed. Standardized action wording and collection placeholders; added missing boolean descriptions. |
| Output | Corrected Reference → List Users to extract `data.members`, verified against the public OpenAPI contract. Deal → Remove Tag now returns the n8n deletion confirmation. Other existing deletion operations already provide confirmation. |
| Output size / AI | Added optional Simplify and tool Raw/Simplified/Selected Fields controls for supported record/reference operations. Raw output remains the default; identifiers and item metadata are retained. Upload/deletion receipts and activity/custom-value lists retain their existing output. |
| Metadata and assets | Changed category to Sales and node group to output. Primary documentation points to the English package README; that GitHub URL becomes public only after the visibility change. Both SVG assets and the codex JSON are present in the package file list. |
| CI | Corrected concurrency grouping to use workflow and ref; unrelated branches no longer share a cancellation group. Publish checks still enforce tag/version equality, lint and tests before publishing. |
| Distribution | Inspected `npm pack --dry-run --json` after build. Runtime entry points, icons, README, LICENSE, changelog, docs and example are included. Narrowed published directories to exclude build metadata and the duplicate compiled package manifest. No tests, node_modules or repository configuration are included. |
| Versioning | Node versions 1 and 1.1 remain available. Package 0.5.0 is published with a matching lockfile and dated changelog. The user-list and tag-removal output corrections are documented because downstream expressions may need adjustment. |

## Checks executed

- `npm run lint`: passes with no lint errors or rule warnings. The toolchain emits
  a Node warning about inherited `NO_COLOR`/`FORCE_COLOR`; it is unrelated to node
  compliance.
- `npm test`: build succeeds and all 43 tests pass, including six new tests for
  output projection, item metadata, visibility in tool mode, user-list routing
  and deletion confirmation. Existing tests cover pagination, filters, contact
  updates, option edits, uploads and message preparation.
- `n8n-node cloud-support`: reports strict mode and default ESLint configuration
  enabled. This reports local eligibility settings, not approval.
- `npm pack --dry-run --json`: succeeds; published file list inspected.
- `git diff --check`: passes.
- `npx --yes @n8n/scan-community-package n8n-nodes-pipefacil@0.4.0`: fails its
  provenance stage. It does not reach attested-source download or static analysis
  of the published tarball. The scanner printed the failed result but exited 0.
- `npx --yes @n8n/scan-community-package n8n-nodes-pipefacil@0.5.0`: **passes all
  checks**, including provenance, attested GitHub source at commit `96f3cec` and
  published package analysis.
- [GitHub Actions publication](https://github.com/arturdemorais/n8n-nodes-pipefacil/actions/runs/41889354461)
  and the corresponding CI run both completed successfully.
- npm reports `latest: 0.5.0` and `https://slsa.dev/provenance/v1` in
  `dist.attestations.provenance.predicateType`.
- GitHub and npm metadata inspected. Repository visibility was subsequently
  changed to public with the owner's authorization.
- Public OpenAPI contract read to confirm authentication and the response fields
  used by the output corrections. No authenticated business API request was sent.

The tests verify local logic, expressions and metadata. They do not run the full
n8n routing engine against the live API or a Postman HTTP simulation. No network
transport behavior, upstream permissions or write side effects were validated.
The installed Postman CLI does not support `postman status`; no Postman workspace
or artifacts were used or changed.

## Remaining validation and known limits

1. Repository visibility is resolved. A pattern-based check inspected 223 Git
   objects before making it public and found no matches for PipeFácil API keys,
   GitHub/npm tokens, AWS access key IDs or private key headers. This is not an
   exhaustive secret-detection guarantee.
2. Publication and scanning are resolved for 0.5.0. The existing granular token
   worked; the source commit and attestation were verified. Keep publishing future
   releases through GitHub Actions. Older versions cannot be retroactively
   republished with provenance.
3. Run the example and representative operations in a real n8n test instance.
   Check selectors, credentials, light/dark icons, binary input and AI tool mode.
   No minimum supported n8n application version is claimed until runtime testing.
4. Exercise required permissions, API validation, rate limits and partial writes
   with a disposable PipeFácil workspace before release. No test key was supplied
   or taken from local credentials during this audit.
5. Contact By Phone currently examines at most 50 search results; it cannot
   establish uniqueness across omitted pages. Use an explicit ID when ambiguity
   is possible. Option edits perform read/modify/write without concurrency
   protection; serialize edits. Lead creation/contact updates and note uploads
   can partially complete, so automatic retries may duplicate work. These limits
   are documented rather than changing request semantics in a publishing audit.
6. Submit in the Creator Portal and address n8n's final technical and UX review.
   The team's review may request further changes beyond static checks.

## Sources

- [n8n submission requirements](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes.md)
- [n8n verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md)
- [n8n UX guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines.md)
- [PipeFácil public OpenAPI contract](https://developers.matchsales.com.br/api/openapi.json)
- Scanner README and implementation from the installed `@n8n/scan-community-package`.
