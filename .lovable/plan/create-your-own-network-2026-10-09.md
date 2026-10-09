# Create your own network

## Goal
Anyone who signs in can start a network centred on themselves instead of inheriting Augusto's. Augusto's network stays available as an example, and share links keep working.

## 1. A "Start your own network" welcome
- A new visitor who isn't the owner sees a short choice at the start: **Start my own network** or **Explore Augusto's example**. They can switch any time from Your data.
- The owner never sees this choice and keeps the current behaviour.

## 2. The creation wizard (3 short steps, in a glass card)
1. **You:** your name, plus an optional OpenAlex author link or ID so research finds the right person and friends' networks can match you (🤝).
2. **First contacts:** up to 6 people you know personally, such as your advisor, coauthors or labmates. For each one you pick a relationship (advisor, committee, coauthor, colleague) and can add a source link if you have one.
   - These become your **gateway links**, the only way routes leave you, exactly like Augusto's four.
   - They are marked "Your own statement" (private attestation). A link with no URL stays unverified, thin and dashed. Nothing is invented.
3. **Destinations (optional):** places or people you'd like to reach. They are added as "No recorded path yet".
- Finish → the new network becomes active, the map frames you and your contacts, and a hint offers "Grow it with research" (testers only) or "Copy an agent prompt" (everyone).

## 3. Your data list
- It shows every network with its owner's name. "Augusto's example" is labelled as an example. The new network can be renamed, switched to, or deleted.
- With account saving on, your own network syncs to your account like any other.

## 4. Correctness checks
- Path, Lineage, People summary, and hop counts all start from the new network's owner, not Augusto.
- The four Augusto-specific gateway names never appear in someone else's network.
- An empty network shows honest empty states ("Add a first contact to see routes").

## Technical details
- Extend `createArtifact(title, owner, { catalogId, contacts[], destinations[] })` in `ingest.ts`. Contacts become person nodes, plus edges with `ego_gateway: true`, `attestation: 'user'`, `review_status: 'reviewed'`, `review_method: 'owner'`, a basis mapped from the relationship, urls only if provided, confidence low when no URL, and strength by basis. Destination nodes get `target: true`.
- New `create-network-wizard.tsx`. NetworkExplorer opens it on first visit when there's no owner role and no `an:own-network` flag. Choosing the example sets the flag.
- Audit for hard-coded `augusto` / gateway ids (network.ts `isAugustoEdge` already uses egoId; check people summary, tour copy, trail guide, `expansion_root` usage) and switch them to `egoId`.
- Tests: the created artifact passes `validateArtifact`; gateways equal the contacts; lineageDepths root at the new ego; edges without a URL stay unverified.
- AGENTS.md rule: user-created networks seed gateways only from owner-stated contacts as attested links; there are no implicit links.
