# Small-tester release assessment

**Decision: not ready for external research testers. Remains unpublished.**

## Blocking items
- Firecrawl search returned HTTP 402 (insufficient credits) during the requested Fernando retry.
- xAI model discovery returned HTTP 403 (credits, spending limit or permissions). Direct Grok code is wired but a successful paid extraction has not been exercised.
- Paid research now requires verified app authentication; no sign-in/sign-up flow or tester access policy has been implemented. CSRF alone was not adequate protection for shared research credits.
- Before release, add an invite/access policy and enforced per-user research budgets, concurrency limits and durable job progress. A bounded request does not prevent repeated paid requests, and long three-pass jobs need deployment-time timeout/recovery testing.
- Browser-local artifacts are not account-isolated or synchronized. Export is essential; switching users on a shared browser can expose the previous network. Do not present login as account-owned storage until this is addressed.
- Obtain tester consent for sending research briefs to Firecrawl/xAI; decide retention and provider privacy settings. The seed is Augusto's demonstration network, not each tester's own private network.

## Implemented in this pass
- Explicit owner approval of Fernando Lozano → Peter J. Kuhn from the saved CV retrieval; no personal gateway inferred, original graph JSON unchanged.
- Direct server-only Grok extraction with account model discovery, strict structured output and clear billing failures; discovery precedes new searches.
- Deterministic automatic acceptance limited to explicit advisor/committee wording with full identities on accessible university/IZA sources. Coauthors, unclear identity, other claims and all ego relationships remain pending. Confidence is unchanged and automated acceptance is labeled separately.
- Uploads remain pending regardless of asserted source-check flags; rejections remain remembered.

## Next release gate
Fund both services, implement tester login/access and budgets, decide account data isolation, then run a real complete three-pass job and verify saved results, review and export on the published runtime. No Lineage redesign in this task.