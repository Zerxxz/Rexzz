export type EscrowStatus = 'draft' | 'funded' | 'reviewing' | 'released' | 'dispute';
export type MilestoneStatus = 'pending' | 'submitted' | 'approved';
export type ReviewRecommendation = 'approve' | 'revision' | 'partial_release' | 'dispute';

export interface Milestone {
  id: string;
  title: string;
  criteria: string[];
  amount: number;
  status: MilestoneStatus;
}

export interface EvidenceBundle {
  name: string;
  description: string;
  walrusBlobId: string;
  contentHash: string;
  submittedAt: string;
}

export interface AgentReview {
  score: number;
  recommendation: ReviewRecommendation;
  summary: string;
  checks: Array<{ label: string; passed: boolean; confidence: number }>;
}

export interface EscrowDeal {
  id: string;
  client: string;
  freelancer: string;
  brief: string;
  totalAmount: number;
  status: EscrowStatus;
  milestones: Milestone[];
  evidence?: EvidenceBundle;
  review?: AgentReview;
}

export interface CreateEvidenceOptions {
  submittedAt?: string;
}

const DEFAULT_CRITERIA = [
  'Deliverable matches the accepted brief',
  'Source files or proof bundle are available',
  'Client can verify the output from a public link or artifact',
];

const TITLE_KEYWORDS: Array<[RegExp, string]> = [
  [/landing|website|page|frontend|ui/i, 'Responsive landing page'],
  [/logo|brand|design|figma/i, 'Brand-ready design package'],
  [/smart contract|move|contract|escrow/i, 'Auditable Move smart contract'],
  [/video|demo|trailer|content/i, 'Published creator asset'],
  [/bot|agent|automation|ai/i, 'Working AI automation flow'],
];

export function normalizeAmount(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
}

export function buildMilestones(brief: string, budget: number): Milestone[] {
  const normalizedBudget = normalizeAmount(budget);
  const detectedTitle = TITLE_KEYWORDS.find(([pattern]) => pattern.test(brief))?.[1] ?? 'Verified work delivery';
  const split = [0.2, 0.5, 0.3].map((ratio) => Math.round(normalizedBudget * ratio));
  split[1] = (split[1] ?? 0) + normalizedBudget - split.reduce((sum, value) => sum + value, 0);

  return [
    {
      id: 'm1',
      title: `Scope lock: ${detectedTitle}`,
      criteria: ['Brief is converted into measurable acceptance criteria', 'Freelancer confirms timeline and deliverables'],
      amount: split[0] ?? 0,
      status: 'pending',
    },
    {
      id: 'm2',
      title: `Build and submit: ${detectedTitle}`,
      criteria: DEFAULT_CRITERIA,
      amount: split[1] ?? 0,
      status: 'pending',
    },
    {
      id: 'm3',
      title: 'Handoff, revision, and proof archive',
      criteria: ['Final files are archived on Walrus', 'Client receives handoff notes', 'No blocker remains unresolved'],
      amount: split[2] ?? 0,
      status: 'pending',
    },
  ];
}

export function createDeal(input: { client: string; freelancer: string; brief: string; totalAmount: number }): EscrowDeal {
  const totalAmount = normalizeAmount(input.totalAmount);
  const seed = `${input.client}-${input.freelancer}-${input.brief}-${totalAmount}`;
  return {
    id: `escrow_${hash(seed).slice(0, 8)}`,
    client: input.client.trim() || 'Anonymous client',
    freelancer: input.freelancer.trim() || 'Unassigned freelancer',
    brief: input.brief.trim() || 'Verified work delivery',
    totalAmount,
    status: 'funded',
    milestones: buildMilestones(input.brief, totalAmount),
  };
}

export function createEvidence(name: string, description: string, options: CreateEvidenceOptions = {}): EvidenceBundle {
  const submittedAt = options.submittedAt ?? new Date().toISOString();
  const safeName = name.trim() || 'proof-bundle';
  const safeDescription = description.trim() || 'Walrus evidence bundle submitted for review.';
  const contentHash = hash(`${safeName}:${safeDescription}:${submittedAt}`);
  return {
    name: safeName,
    description: safeDescription,
    walrusBlobId: `walrus://${contentHash.slice(0, 12)}-${slugify(safeName)}`,
    contentHash: `0x${contentHash}`,
    submittedAt,
  };
}

export function reviewEvidence(deal: EscrowDeal, evidence: EvidenceBundle): AgentReview {
  void deal;
  const words = `${evidence.name} ${evidence.description}`.toLowerCase();
  const hasLink = /https?:\/\/|demo|deploy|preview|figma|github|drive/.test(words);
  const hasSource = /source|repo|github|zip|figma|file|artifact|walrus/.test(words);
  const hasHandoff = /handoff|readme|notes|walkthrough|video|docs/.test(words);
  const checks = [
    { label: 'Evidence bundle is anchored to Walrus', passed: evidence.walrusBlobId.startsWith('walrus://'), confidence: 0.99 },
    { label: 'Includes a verifiable link or artifact', passed: hasLink, confidence: hasLink ? 0.92 : 0.41 },
    { label: 'Includes source files or editable proof', passed: hasSource, confidence: hasSource ? 0.9 : 0.48 },
    { label: 'Includes handoff context for the client', passed: hasHandoff, confidence: hasHandoff ? 0.86 : 0.55 },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const recommendation: ReviewRecommendation = score >= 75 ? 'approve' : score >= 25 ? 'revision' : 'dispute';

  return {
    score,
    recommendation,
    summary:
      recommendation === 'approve'
        ? 'Agent recommends releasing the active milestone because the proof bundle satisfies the core acceptance checks.'
        : 'Agent recommends requesting revisions before releasing funds because the proof bundle is missing key verification signals.',
    checks,
  };
}

export function releaseSubmittedMilestones(deal: EscrowDeal): EscrowDeal {
  const milestones = deal.milestones.map((milestone) => (milestone.status === 'submitted' ? { ...milestone, status: 'approved' as const } : milestone));
  const hasPendingMilestones = milestones.some((milestone) => milestone.status !== 'approved');
  return {
    ...deal,
    milestones,
    status: hasPendingMilestones ? 'funded' : 'released',
  };
}

export function releasedAmount(deal: EscrowDeal): number {
  return deal.status === 'released' ? deal.totalAmount : deal.milestones.filter((m) => m.status === 'approved').reduce((sum, m) => sum + m.amount, 0);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'proof';
}

function hash(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}
