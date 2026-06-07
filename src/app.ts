import { createDeal, createEvidence, releasedAmount, releaseSubmittedMilestones, reviewEvidence, type EscrowDeal } from './domain.js';

const state: { deal: EscrowDeal } = {
  deal: createDeal({
    client: 'Mysten Labs Growth Guild',
    freelancer: '0xFreelancerStudio',
    brief: 'Build a responsive landing page for a Sui game with deploy link, GitHub source, demo walkthrough, and final handoff notes.',
    totalAmount: 120,
  }),
};

state.deal.evidence = createEvidence(
  'sui-game-landing-page.zip',
  'GitHub source, https://demo.proofpilot.xyz preview, video walkthrough, and README handoff notes stored as a Walrus proof bundle.',
);
state.deal.review = reviewEvidence(state.deal, state.deal.evidence);
state.deal.milestones[0]!.status = 'approved';
state.deal.milestones[1]!.status = 'submitted';
state.deal.status = 'reviewing';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('Missing #app root element');
}
const app = appRoot;

function render() {
  const deal = state.deal;
  const evidence = deal.evidence;
  const review = deal.review;
  const released = releasedAmount(deal);
  const locked = deal.totalAmount - released;

  app.innerHTML = `
    <main>
      <section class="hero">
        <nav class="nav">
          <div class="brand"><span class="brand-mark">✦</span> ProofPilot</div>
          <div class="nav-links"><a href="#workflow">Workflow</a><a href="#agent">Agent</a><a href="#move">Move</a></div>
        </nav>
        <div class="hero-grid">
          <div>
            <p class="eyebrow">Sui Overflow MVP · Agentic Web + Payments + Walrus</p>
            <h1>AI milestone escrow for trustless freelance delivery.</h1>
            <p class="lede">ProofPilot turns a messy brief into funded Sui milestones, anchors deliverable proof on Walrus, asks an AI agent to review acceptance criteria, and releases payment with transparent on-chain state.</p>
            <div class="hero-actions">
              <button data-action="create">Generate Demo Escrow</button>
              <button data-action="release" class="secondary">Release Reviewed Milestone</button>
            </div>
          </div>
          <aside class="deal-card">
            <div class="card-header"><span>Live Escrow Object</span><strong>${h(deal.id)}</strong></div>
            <dl>
              <div><dt>Client</dt><dd>${h(deal.client)}</dd></div>
              <div><dt>Freelancer</dt><dd>${h(deal.freelancer)}</dd></div>
              <div><dt>Status</dt><dd><span class="pill ${h(deal.status)}">${h(deal.status)}</span></dd></div>
            </dl>
            <div class="balance-grid">
              <div><span>Total funded</span><strong>${deal.totalAmount} SUI</strong></div>
              <div><span>Released</span><strong>${released} SUI</strong></div>
              <div><span>Locked</span><strong>${locked} SUI</strong></div>
            </div>
          </aside>
        </div>
      </section>

      <section id="workflow" class="section workflow">
        <div class="section-title">
          <p class="eyebrow">Workflow</p>
          <h2>From natural-language scope to payment release</h2>
        </div>
        <div class="columns">
          <article class="panel">
            <h3>AI-generated milestones</h3>
            <div class="milestones">${deal.milestones.map(milestoneTemplate).join('')}</div>
          </article>
          <article class="panel proof-panel">
            <h3>Walrus proof bundle</h3>
            ${evidence ? evidenceTemplate(evidence) : '<p>No evidence uploaded yet.</p>'}
          </article>
        </div>
      </section>

      <section id="agent" class="section agent-grid">
        <article class="panel agent-panel">
          <p class="eyebrow">Agent review</p>
          <h2>${review?.score ?? 0}% confidence · ${h(review?.recommendation ?? 'pending')}</h2>
          <p>${h(review?.summary ?? 'Upload evidence to start review.')}</p>
          <div class="checks">${review?.checks.map(checkTemplate).join('') ?? ''}</div>
        </article>
        <article class="panel">
          <p class="eyebrow">Reputation primitive</p>
          <h2>Portable proof of completed work</h2>
          <p>When milestones are approved, ProofPilot can mint a Sui reputation object referencing the Walrus bundle, payment value, client rating, and category.</p>
          <div class="badge-preview">
            <span>Verified Sui Builder</span>
            <strong>${released} SUI delivered</strong>
            <small>${h(evidence?.walrusBlobId ?? 'walrus://pending')}</small>
          </div>
        </article>
      </section>

      <section id="move" class="section architecture">
        <div>
          <p class="eyebrow">Architecture</p>
          <h2>Sui objects make escrow state composable.</h2>
          <p>The prototype includes a Move module sketch for escrow, evidence, review, release, and dispute events so the web app maps directly to an on-chain implementation.</p>
        </div>
        <div class="stack">
          <span>zkLogin onboarding</span><span>Sui escrow object</span><span>Walrus blob evidence</span><span>AI review JSON</span><span>Milestone release tx</span>
        </div>
      </section>
    </main>
  `;

  document.querySelector('[data-action="create"]')?.addEventListener('click', () => {
    const amount = 80 + Math.floor(Math.random() * 90);
    state.deal = createDeal({
      client: 'Overflow Judge DAO',
      freelancer: '0xProofPilotBuilder',
      brief: 'Create a Move smart contract escrow, frontend demo, GitHub source, deployment preview, and handoff video for Sui Overflow.',
      totalAmount: amount,
    });
    state.deal.evidence = createEvidence('proofpilot-overflow-demo.zip', 'GitHub source, deployment preview, video walkthrough, Walrus artifact, and README handoff notes.');
    state.deal.review = reviewEvidence(state.deal, state.deal.evidence);
    state.deal.milestones[0]!.status = 'approved';
    state.deal.milestones[1]!.status = 'submitted';
    state.deal.status = 'reviewing';
    render();
  });

  document.querySelector('[data-action="release"]')?.addEventListener('click', () => {
    state.deal = releaseSubmittedMilestones(state.deal);
    render();
  });
}

function milestoneTemplate(milestone: EscrowDeal['milestones'][number]) {
  return `
    <div class="milestone">
      <div><strong>${h(milestone.title)}</strong><span>${milestone.amount} SUI</span></div>
      <p>${h(milestone.criteria.join(' · '))}</p>
      <small class="pill ${h(milestone.status)}">${h(milestone.status)}</small>
    </div>
  `;
}

function evidenceTemplate(evidence: NonNullable<EscrowDeal['evidence']>) {
  return `
    <div class="proof-box">
      <span class="blob">${h(evidence.walrusBlobId)}</span>
      <strong>${h(evidence.name)}</strong>
      <p>${h(evidence.description)}</p>
      <small>Content hash ${h(evidence.contentHash)}</small>
    </div>
  `;
}

function checkTemplate(check: NonNullable<EscrowDeal['review']>['checks'][number]) {
  return `
    <div class="check ${check.passed ? 'pass' : 'fail'}">
      <span>${check.passed ? '✓' : '!'}</span>
      <div><strong>${h(check.label)}</strong><small>${Math.round(check.confidence * 100)}% confidence</small></div>
    </div>
  `;
}

function h(value: string | number): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

render();
