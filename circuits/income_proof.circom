pragma circom 2.0.0;

// TESSERA income_proof v2 — full Merkle + nullifier binding
// see gaps.md G92 for the design rationale; PRD §11 estimate (~180k)
// is the target; this version aims for that floor.
//
// SECURITY-LOAD-BEARING constraints (do not relax):
//   - isValid binarity (Constraint 1)
//   - gte.out === 1 (Constraint 4)
//   - Merkle inclusion per UTXO (Constraint 5)
//   - Nullifier uniqueness check (Constraint 6)
//   - Timestamp range per UTXO (Constraint 7)
//
// Tree depth source: @umbra-privacy/sdk MAX_LEAVES_PER_TREE = 2^20
// (node_modules/@umbra-privacy/sdk/dist/index.js).

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

// --- helper: hash a (left, right) pair conditionally on path bit ---
template HashLevel() {
    signal input current;
    signal input sibling;
    signal input pathBit;          // 0 = sibling on right; 1 = sibling on left
    signal output out;

    // pathBit must be binary.
    pathBit * (pathBit - 1) === 0;

    // left  = pathBit==0 ? current : sibling
    // right = pathBit==0 ? sibling : current
    signal left;
    signal right;
    left  <== current + pathBit * (sibling - current);
    right <== sibling + pathBit * (current - sibling);

    component h = Poseidon(2);
    h.inputs[0] <== left;
    h.inputs[1] <== right;
    out <== h.out;
}

// --- helper: depth-D Merkle inclusion ---
template MerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output root;

    component levels[depth];
    signal hashes[depth + 1];
    hashes[0] <== leaf;
    for (var i = 0; i < depth; i++) {
        levels[i] = HashLevel();
        levels[i].current  <== hashes[i];
        levels[i].sibling  <== pathElements[i];
        levels[i].pathBit  <== pathIndices[i];
        hashes[i + 1] <== levels[i].out;
    }
    root <== hashes[depth];
}

template IncomeProof(N, DEPTH) {
    // ── Private signals ────────────────────────────────────────────────────
    signal input amounts[N];
    signal input isValid[N];
    signal input nonces[N];
    signal input timestamps[N];
    signal input pathElements[N][DEPTH];
    signal input pathIndices[N][DEPTH];
    signal input employerSecret;
    signal input utxoSecrets[N];

    // ── Public signals ─────────────────────────────────────────────────────
    signal input threshold;
    signal input startTs;
    signal input endTs;
    signal input merkleRoot;
    signal input employerCommitment;
    signal input nullifierHash[N];
    signal input dateRangeHash;

    signal output validProof;

    // ── Constraint 1: isValid binarity (VeilPay-bug guard) ─────────────────
    signal isValidSquared[N];
    for (var i = 0; i < N; i++) {
        isValidSquared[i] <== isValid[i] * isValid[i];
        isValidSquared[i] === isValid[i];
    }

    // ── Constraint 2: filtered accumulation ────────────────────────────────
    signal filteredAmounts[N];
    signal runningSum[N + 1];
    runningSum[0] <== 0;
    for (var i = 0; i < N; i++) {
        filteredAmounts[i] <== amounts[i] * isValid[i];
        runningSum[i + 1] <== runningSum[i] + filteredAmounts[i];
    }

    // ── Constraint 3: date-range hash binding ──────────────────────────────
    component dateRangeHasher = Poseidon(2);
    dateRangeHasher.inputs[0] <== startTs;
    dateRangeHasher.inputs[1] <== endTs;
    dateRangeHash === dateRangeHasher.out;

    // ── Constraint 4: threshold check ──────────────────────────────────────
    component gte = GreaterEqThan(64);
    gte.in[0] <== runningSum[N];
    gte.in[1] <== threshold;
    gte.out === 1;

    // ── Constraint 5: per-UTXO Merkle inclusion ────────────────────────────
    component innerHash[N];
    component leafHash[N];
    component merkle[N];
    signal leaf[N];
    signal computedRoot[N];
    signal rootDelta[N];
    signal isMatch[N];
    for (var i = 0; i < N; i++) {
        innerHash[i] = Poseidon(2);
        innerHash[i].inputs[0] <== amounts[i];
        innerHash[i].inputs[1] <== nonces[i];

        leafHash[i] = Poseidon(2);
        leafHash[i].inputs[0] <== innerHash[i].out;
        leafHash[i].inputs[1] <== utxoSecrets[i];
        leaf[i] <== leafHash[i].out;

        merkle[i] = MerkleProof(DEPTH);
        merkle[i].leaf <== leaf[i];
        for (var d = 0; d < DEPTH; d++) {
            merkle[i].pathElements[d] <== pathElements[i][d];
            merkle[i].pathIndices[d]  <== pathIndices[i][d];
        }
        computedRoot[i] <== merkle[i].root;

        // When isValid==1: computed root MUST equal merkleRoot.
        // When isValid==0: constraint trivially satisfied.
        rootDelta[i] <== computedRoot[i] - merkleRoot;
        isMatch[i]   <== rootDelta[i] * isValid[i];
        isMatch[i]   === 0;
    }

    // ── Constraint 6: per-UTXO nullifier ───────────────────────────────────
    component nullifier[N];
    signal nullifierExpected[N];
    for (var i = 0; i < N; i++) {
        nullifier[i] = Poseidon(2);
        nullifier[i].inputs[0] <== nonces[i];
        nullifier[i].inputs[1] <== utxoSecrets[i];
        // Real slots emit nullifier; padding slots emit 0.
        nullifierExpected[i] <== nullifier[i].out * isValid[i];
        nullifierHash[i] === nullifierExpected[i];
    }

    // ── Constraint 7: per-UTXO timestamp range ─────────────────────────────
    component lowerCheck[N];
    component upperCheck[N];
    signal lowerOk[N];
    signal upperOk[N];
    for (var i = 0; i < N; i++) {
        lowerCheck[i] = GreaterEqThan(40);
        lowerCheck[i].in[0] <== timestamps[i];
        lowerCheck[i].in[1] <== startTs;
        // (lowerCheck.out - 1) * isValid === 0
        // True branch (isValid==1): lowerCheck.out must be 1, so (1-1)*1 = 0 ✓
        // False branch (isValid==0): multiplier zeros the term.
        lowerOk[i] <== (lowerCheck[i].out - 1) * isValid[i];
        lowerOk[i] === 0;

        upperCheck[i] = GreaterEqThan(40);
        upperCheck[i].in[0] <== endTs;
        upperCheck[i].in[1] <== timestamps[i];
        upperOk[i] <== (upperCheck[i].out - 1) * isValid[i];
        upperOk[i] === 0;
    }

    // ── Constraint 8: employer commitment binding ──────────────────────────
    component employerHasher = Poseidon(2);
    employerHasher.inputs[0] <== employerSecret;
    employerHasher.inputs[1] <== runningSum[N];
    employerCommitment === employerHasher.out;

    // ── Constraint 9: output ───────────────────────────────────────────────
    validProof <== gte.out;
}

component main {
    public [
        threshold,
        startTs, endTs,
        merkleRoot,
        employerCommitment,
        nullifierHash,
        dateRangeHash
    ]
} = IncomeProof(32, 20);
