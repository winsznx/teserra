# gaps.md

Drift, ambiguities, and observations against the PRDs. **Append-only — never edit the PRDs themselves.**

The Frontend PRD is the contract. When something contradicts reality (library behavior, missing wireframe state, version mismatch, ambiguous wording), log it here. Tim triages and decides whether the PRD changes. In the meantime, build against the closest reasonable interpretation and note your interim choice below.

---

## How to log an observation

Append a new section at the bottom of this file. Keep entries terse.

```
## YYYY-MM-DD — short title
- PRD section: §X.Y of Frontend PRD (or Engineering PRD)
- Observation: what reality looks like vs. what the PRD says
- Interim build choice: how you proceeded so you weren't blocked
- Status: open / triaged by Tim / closed
```

Examples of things worth logging:
- Library API doesn't behave the way the PRD assumes.
- A wireframe leaves a state undefined (empty / loading / error).
- A dependency version in the PRD doesn't match what npm resolves.
- A microcopy string in §13 conflicts with one in §11.
- You made a small judgment call that wasn't covered.

Don't log: typos in your own code, things you're about to fix in the next commit, personal style preferences. This file is for **PRD↔reality drift**, not a TODO list.

---

## Entries

<!-- Append new observations below this line. Newest at the bottom. -->
