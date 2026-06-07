import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeal, createEvidence, releasedAmount, releaseSubmittedMilestones, reviewEvidence } from '../dist/assets/domain.js';

test('createDeal builds three funded milestones that sum to the normalized total amount', () => {
  const deal = createDeal({ client: ' client ', freelancer: ' freelancer ', brief: 'Build landing page', totalAmount: 101.4 });
  assert.equal(deal.status, 'funded');
  assert.equal(deal.client, 'client');
  assert.equal(deal.freelancer, 'freelancer');
  assert.equal(deal.totalAmount, 101);
  assert.equal(deal.milestones.length, 3);
  assert.equal(deal.milestones.reduce((sum, milestone) => sum + milestone.amount, 0), 101);
});

test('createEvidence can be deterministic for repeatable agent tests', () => {
  const evidence = createEvidence('source.zip', 'GitHub source and Walrus artifact.', { submittedAt: '2026-06-07T00:00:00.000Z' });
  assert.equal(evidence.walrusBlobId, 'walrus://0aa74072554a-source-zip');
  assert.equal(evidence.contentHash, '0x0aa74072554a6f97');
});

test('reviewEvidence approves strong proof bundles and flags weak ones for revision', () => {
  const deal = createDeal({ client: 'client', freelancer: 'freelancer', brief: 'Build website with source and walkthrough', totalAmount: 100 });
  const strongEvidence = createEvidence('source.zip', 'GitHub source, https://demo.example preview, video walkthrough, README handoff notes, and Walrus artifact.');
  const weakEvidence = createEvidence('screenshot.png', 'One screenshot only.');

  assert.equal(reviewEvidence(deal, strongEvidence).recommendation, 'approve');
  assert.equal(reviewEvidence(deal, weakEvidence).recommendation, 'revision');
});

test('releaseSubmittedMilestones approves submitted milestones without over-releasing pending work', () => {
  const deal = createDeal({ client: 'client', freelancer: 'freelancer', brief: 'Build Move escrow', totalAmount: 90 });
  deal.milestones[0].status = 'approved';
  deal.milestones[1].status = 'submitted';

  const releasedDeal = releaseSubmittedMilestones(deal);
  assert.equal(releasedDeal.status, 'funded');
  assert.equal(releasedDeal.milestones[1].status, 'approved');
  assert.equal(releasedAmount(releasedDeal), releasedDeal.milestones[0].amount + releasedDeal.milestones[1].amount);
});
