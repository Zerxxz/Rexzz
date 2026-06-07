# ProofPilot

ProofPilot is a Sui Overflow hackathon MVP for **AI milestone escrow**. It demonstrates how a client can fund a Sui escrow, how a freelancer can attach verifiable deliverables as Walrus blob references, how an agent can score evidence against acceptance criteria, and how an approved milestone can release payment.

## What is included

- A dependency-free TypeScript web app in `src/app.ts` with a polished demo flow.
- Domain logic in `src/domain.ts` for creating escrow deals, generating milestones, creating Walrus-style evidence bundles, scoring evidence, releasing submitted milestones, and calculating released funds.
- A Move module sketch in `move/proof_pilot/sources/proof_pilot.move` that maps the UI concepts to Sui objects and events.
- Node built-in tests in `test/domain.test.mjs`.
- A build verification script in `scripts/verify-build.mjs` that checks emitted demo artifacts before the build is considered successful.

## Local development

```bash
npm run build
npm test
npm run dev
```

Then open `http://localhost:4173`.

## Quality gates

`npm run build` runs TypeScript compilation, copies static assets, and verifies that the generated `dist` folder contains the compiled app, domain module, stylesheet, and HTML entrypoint. `npm test` runs the same build gate before executing the Node test suite.

## Hackathon pitch

ProofPilot targets the Sui Overflow Agentic Web, Payments, and Walrus themes:

1. The agent turns a natural-language brief into measurable milestones.
2. Client funds an escrow object on Sui.
3. Freelancer uploads deliverables and stores blob references from Walrus.
4. The AI agent records a structured review.
5. Client releases the milestone payment and the freelancer earns portable reputation.
