module proof_pilot::escrow;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

const E_NOT_CLIENT: u64 = 1;
const E_NOT_FREELANCER: u64 = 2;
const E_BAD_STATUS: u64 = 3;
const E_BAD_MILESTONE: u64 = 4;

public struct Escrow has key, store {
    id: UID,
    client: address,
    freelancer: address,
    total_amount: u64,
    released_amount: u64,
    status: u8,
    milestones: vector<Milestone>,
    vault: Balance<SUI>,
}

public struct Milestone has copy, drop, store {
    index: u64,
    title_hash: vector<u8>,
    criteria_hash: vector<u8>,
    amount: u64,
    status: u8,
}

public struct Evidence has copy, drop, store {
    milestone_index: u64,
    walrus_blob_id: vector<u8>,
    content_hash: vector<u8>,
    submitted_at_ms: u64,
}

public struct Review has copy, drop, store {
    milestone_index: u64,
    agent: address,
    score: u8,
    recommendation: u8,
    review_blob_id: vector<u8>,
    created_at_ms: u64,
}

public struct EscrowCreated has copy, drop {
    escrow_id: ID,
    client: address,
    freelancer: address,
    total_amount: u64,
}

public struct EvidenceSubmitted has copy, drop {
    escrow_id: ID,
    milestone_index: u64,
    walrus_blob_id: vector<u8>,
}

public struct ReviewRecorded has copy, drop {
    escrow_id: ID,
    milestone_index: u64,
    score: u8,
    recommendation: u8,
}

public struct MilestoneReleased has copy, drop {
    escrow_id: ID,
    milestone_index: u64,
    amount: u64,
    freelancer: address,
}

public fun create_escrow(
    freelancer: address,
    title_hashes: vector<vector<u8>>,
    criteria_hashes: vector<vector<u8>>,
    amounts: vector<u64>,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    let total_amount = coin::value(&payment);
    let count = vector::length(&amounts);
    assert!(count == vector::length(&title_hashes), E_BAD_MILESTONE);
    assert!(count == vector::length(&criteria_hashes), E_BAD_MILESTONE);

    let mut milestones = vector[];
    let mut index = 0;
    let mut allocated = 0;
    while (index < count) {
        let amount = *vector::borrow(&amounts, index);
        allocated = allocated + amount;
        vector::push_back(&mut milestones, Milestone {
            index,
            title_hash: *vector::borrow(&title_hashes, index),
            criteria_hash: *vector::borrow(&criteria_hashes, index),
            amount,
            status: 0,
        });
        index = index + 1;
    };
    assert!(allocated == total_amount, E_BAD_MILESTONE);

    let escrow = Escrow {
        id: object::new(ctx),
        client: tx_context::sender(ctx),
        freelancer,
        total_amount,
        released_amount: 0,
        status: 1,
        milestones,
        vault: coin::into_balance(payment),
    };

    event::emit(EscrowCreated {
        escrow_id: object::id(&escrow),
        client: escrow.client,
        freelancer,
        total_amount,
    });
    transfer::share_object(escrow);
}

public fun submit_evidence(
    escrow: &mut Escrow,
    milestone_index: u64,
    walrus_blob_id: vector<u8>,
    content_hash: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(tx_context::sender(ctx) == escrow.freelancer, E_NOT_FREELANCER);
    assert!(escrow.status == 1, E_BAD_STATUS);
    let milestone = vector::borrow_mut(&mut escrow.milestones, milestone_index);
    milestone.status = 1;

    event::emit(EvidenceSubmitted {
        escrow_id: object::id(escrow),
        milestone_index,
        walrus_blob_id,
    });
    let _evidence = Evidence { milestone_index, walrus_blob_id: vector[], content_hash, submitted_at_ms: clock::timestamp_ms(clock) };
}

public fun record_review(
    escrow: &Escrow,
    milestone_index: u64,
    score: u8,
    recommendation: u8,
    review_blob_id: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
): Review {
    let review = Review {
        milestone_index,
        agent: tx_context::sender(ctx),
        score,
        recommendation,
        review_blob_id,
        created_at_ms: clock::timestamp_ms(clock),
    };
    event::emit(ReviewRecorded { escrow_id: object::id(escrow), milestone_index, score, recommendation });
    review
}

public fun release_milestone(
    escrow: &mut Escrow,
    milestone_index: u64,
    ctx: &mut TxContext,
) {
    assert!(tx_context::sender(ctx) == escrow.client, E_NOT_CLIENT);
    assert!(escrow.status == 1, E_BAD_STATUS);
    let milestone = vector::borrow_mut(&mut escrow.milestones, milestone_index);
    assert!(milestone.status == 1, E_BAD_MILESTONE);

    milestone.status = 2;
    escrow.released_amount = escrow.released_amount + milestone.amount;
    let payout = coin::from_balance(balance::split(&mut escrow.vault, milestone.amount), ctx);
    transfer::public_transfer(payout, escrow.freelancer);
    event::emit(MilestoneReleased {
        escrow_id: object::id(escrow),
        milestone_index,
        amount: milestone.amount,
        freelancer: escrow.freelancer,
    });
}
