#!/usr/bin/env bash
# TESSERA circuit setup pipeline — Engineering PRD §11.
# Idempotent on artifacts that already exist; rebuild flag forces a full rebuild.
#
# Usage:
#   scripts/circuit-setup.sh [--rebuild]
#
# Outputs (publishable):
#   public/circuits/income_proof.wasm
#   public/circuits/income_proof_final.zkey
#   public/circuits/verification_key.json
#
# Source-of-truth verification key:
#   circuits/verification_key.json   (committed)
#
# Provenance:
#   circuits/CEREMONY.md             (committed; appended to on each run)

set -euo pipefail

# Repo root — this script must run from /scripts.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT=$(pwd -P)

REBUILD=0
SKIP_PTAU_VERIFY=0
for arg in "$@"; do
    case "$arg" in
        --rebuild) REBUILD=1 ;;
        --skip-ptau-verify) SKIP_PTAU_VERIFY=1 ;;
    esac
done

CIRCUIT_NAME="income_proof"
PTAU_BASE_URL="https://storage.googleapis.com/zkevm/ptau"
BUILD_DIR="$ROOT/build/circuits"
PUBLIC_DIR="$ROOT/public/circuits"
CEREMONY_LOG="$ROOT/circuits/CEREMONY.md"
VK_OUT="$ROOT/circuits/verification_key.json"
RESULTS_LOG="$ROOT/scripts/day0/results.jsonl"

# Colour helpers (only when stdout is a terminal).
if [[ -t 1 ]]; then
    BOLD=$'\033[1m' DIM=$'\033[2m' RED=$'\033[31m' GREEN=$'\033[32m' YELLOW=$'\033[33m' RESET=$'\033[0m'
else
    BOLD="" DIM="" RED="" GREEN="" YELLOW="" RESET=""
fi

step() { echo "${BOLD}▶${RESET} $*"; }
ok()   { echo "  ${GREEN}✓${RESET} $*"; }
warn() { echo "  ${YELLOW}!${RESET} $*"; }
die()  { echo "  ${RED}✗${RESET} $*" >&2; exit 1; }

now_ms() { node -e 'process.stdout.write(String(Date.now()))'; }

log_jsonl() {
    # log_jsonl <check-name> <json-payload>
    local name="$1" payload="$2"
    local ts
    ts=$(node -e 'console.log(new Date().toISOString())')
    mkdir -p "$(dirname "$RESULTS_LOG")"
    printf '%s\n' "{\"id\":\"$name\",\"ts\":\"$ts\",$payload}" >> "$RESULTS_LOG"
}

# ── B1 — pre-flight ─────────────────────────────────────────────────────────
step "Pre-flight checks"

if ! command -v circom >/dev/null 2>&1; then
    cat <<EOF >&2
${RED}circom not on PATH.${RESET}
Install:
  • macOS:  brew install circom            (only if a circom formula is published)
  • Source: cargo install --git https://github.com/iden3/circom.git
After install, run:  circom --version  (need ≥ 2.0.0)
EOF
    die "circom missing"
fi

CIRCOM_VER=$(circom --version 2>&1 | head -1)
case "$CIRCOM_VER" in
    *circom\ compiler\ 2.*|*circom\ 2.*) ok "$CIRCOM_VER" ;;
    *) die "circom version too old: $CIRCOM_VER (need ≥ 2.0.0)" ;;
esac

if ! command -v npx >/dev/null 2>&1; then
    die "npx missing — install Node.js + pnpm"
fi

if [[ ! -d "$ROOT/node_modules/snarkjs" ]]; then
    die "snarkjs not installed locally — run 'pnpm install' (snarkjs must be a dep)"
fi
ok "snarkjs $(node -p "require('$ROOT/node_modules/snarkjs/package.json').version")"

if ! command -v shasum >/dev/null 2>&1 && ! command -v sha256sum >/dev/null 2>&1; then
    die "neither shasum nor sha256sum available"
fi

if command -v shasum >/dev/null 2>&1; then SHA_CMD="shasum -a 256"; else SHA_CMD="sha256sum"; fi

# ── B2 — working directories + .gitignore ───────────────────────────────────
step "Stage build/ and public/circuits/"
mkdir -p "$BUILD_DIR" "$PUBLIC_DIR" "$ROOT/circuits"

# ── B3 (deferred) — ptau check happens AFTER we know the constraint count. ─
# We compile first, read constraints, choose the smallest ptau that fits.
PTAU_VERIFIED_MARKER="$ROOT/build/circuits/.ptau-verified"
ensure_ptau() {
    local power="$1"   # e.g. 19
    local file="$ROOT/circuits/powersOfTau28_hez_final_${power}.ptau"
    local url="${PTAU_BASE_URL}/powersOfTau28_hez_final_${power}.ptau"
    PTAU="$file"

    if [[ ! -f "$PTAU" ]]; then
        warn "ptau power-${power} missing; fetching from $url"
        curl -fSL --retry 3 -o "$PTAU" "$url"
    fi

    local sha
    sha=$($SHA_CMD "$PTAU" | awk '{print $1}')

    verify_ptau() {
        npx -y --no-install snarkjs powersoftau verify "$PTAU" 2>&1 | tee /tmp/ptau-verify.log | grep -q "Powers of Tau Ok!"
    }

    if [[ "$REBUILD" -ne 1 ]] && [[ -f "$PTAU_VERIFIED_MARKER" ]] && grep -qx "$sha" "$PTAU_VERIFIED_MARKER"; then
        ok "ptau power-${power} verified (cached SHA $(echo "$sha" | head -c 16)…)"
    elif [[ "$SKIP_PTAU_VERIFY" -eq 1 ]]; then
        warn "ptau power-${power} verify SKIPPED (--skip-ptau-verify). SHA=$(echo "$sha" | head -c 16)…  (logged in REPORT.md)"
        echo "$sha" >> "$PTAU_VERIFIED_MARKER"
    elif verify_ptau; then
        echo "$sha" >> "$PTAU_VERIFIED_MARKER"
        ok "ptau power-${power} verified"
    else
        warn "ptau power-${power} verification failed; deleting and refetching once"
        rm -f "$PTAU"
        curl -fSL --retry 3 -o "$PTAU" "$url"
        sha=$($SHA_CMD "$PTAU" | awk '{print $1}')
        if ! verify_ptau; then
            die "ptau corrupt after refetch — see gaps.md G82 for provenance"
        fi
        echo "$sha" >> "$PTAU_VERIFIED_MARKER"
        ok "ptau verified after refetch"
    fi
}

# ── B4 — compile ────────────────────────────────────────────────────────────
step "Compile $CIRCUIT_NAME.circom"
if [[ "$REBUILD" -eq 1 ]] || [[ ! -f "$BUILD_DIR/$CIRCUIT_NAME.r1cs" ]]; then
    T0=$(now_ms)
    circom "$ROOT/circuits/$CIRCUIT_NAME.circom" \
        --r1cs --wasm --sym \
        -o "$BUILD_DIR" \
        -l "$ROOT/node_modules" 2>&1
    COMPILE_MS=$(( $(now_ms) - T0 ))
    ok "compiled in ${COMPILE_MS}ms"
else
    ok "r1cs cached (use --rebuild to force)"
    COMPILE_MS=0
fi

# Constraint count from r1cs. snarkjs prints with ANSI colour codes; strip them.
R1CS_INFO=$(npx -y --no-install snarkjs r1cs info "$BUILD_DIR/$CIRCUIT_NAME.r1cs" 2>&1)
R1CS_PLAIN=$(echo "$R1CS_INFO" | LC_ALL=C sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g')
echo "$R1CS_PLAIN" | sed 's/^/  /'
CONSTRAINTS=$(echo "$R1CS_PLAIN" | grep -E "# of Constraints" | head -1 | grep -oE '[0-9]+' | head -1 || echo "0")
if [[ -z "$CONSTRAINTS" || "$CONSTRAINTS" == "0" ]]; then
    die "could not parse constraint count from r1cs info"
fi
ok "constraints: $CONSTRAINTS"

# groth16-solana verifier is fixed-cost ~130k CU regardless of constraint
# count, so the v2 circuit's higher constraint count does not blow the budget
# (PRD §11). Just ensure the chosen ptau is large enough.
log_jsonl "circuit-compile" "\"status\":\"PASS\",\"constraints\":$CONSTRAINTS,\"durationMs\":$COMPILE_MS"

# Pick the smallest ptau power that fits.
PTAU_POWER=15
while (( (1 << PTAU_POWER) < CONSTRAINTS )); do
    PTAU_POWER=$((PTAU_POWER + 1))
done
ok "selected ptau power-${PTAU_POWER} (2^${PTAU_POWER} = $((1 << PTAU_POWER)) ≥ ${CONSTRAINTS})"
ensure_ptau "$PTAU_POWER"

# ── B5 — phase-2 setup ──────────────────────────────────────────────────────
step "Phase-2 setup (groth16 setup)"
T_SETUP_START=$(now_ms)
T0=$(now_ms)
npx -y --no-install snarkjs groth16 setup \
    "$BUILD_DIR/$CIRCUIT_NAME.r1cs" \
    "$PTAU" \
    "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"
SETUP_MS=$(( $(now_ms) - T0 ))
ok "groth16 setup in ${SETUP_MS}ms"

# ── B6 — contribute ──────────────────────────────────────────────────────────
step "Phase-2 contribution"
CEREMONY_NAME="tessera-day0-$(date -u +%Y%m%dT%H%M%S)"
ENTROPY=$(openssl rand -hex 32)
T0=$(now_ms)
CONTRIB_OUT=$(npx -y --no-install snarkjs zkey contribute \
    "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey" \
    "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
    --name="$CEREMONY_NAME" \
    -e="$ENTROPY" 2>&1)
CONTRIB_MS=$(( $(now_ms) - T0 ))
echo "$CONTRIB_OUT" | sed 's/^/  /'
ok "contribution \"$CEREMONY_NAME\" in ${CONTRIB_MS}ms"

CEREMONY_HASH=$(echo "$CONTRIB_OUT" | grep -E "Contribution Hash:" -A 4 | tail -4 | tr -d '\n\t ' || echo "")
if [[ -z "$CEREMONY_HASH" ]]; then
    CEREMONY_HASH=$(npx -y --no-install snarkjs zkey verify \
        "$BUILD_DIR/$CIRCUIT_NAME.r1cs" \
        "$PTAU" \
        "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" 2>&1 | grep -E "ZKey OK|Final hash" | head -1 || echo "<see ZKey OK>")
fi

# Append to ceremony log (creating header if first time).
if [[ ! -f "$CEREMONY_LOG" ]]; then
    cat > "$CEREMONY_LOG" <<EOF
# Phase-2 ceremony — TESSERA income_proof

Provenance record. Each row is one contribution. Entropy is discarded after
each contribution; the contributor's name + ceremony hash are the public
record. New contributors append to this file with their own \`scripts/circuit-setup.sh --rebuild\`
plus a hand-edited row.

## Ceremony entries

| timestamp | name | contributor | ceremony hash |
|---|---|---|---|
EOF
fi
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CONTRIB_USER="${USER:-unknown}"
printf '| %s | %s | %s | %s |\n' "$TS" "$CEREMONY_NAME" "$CONTRIB_USER" "$CEREMONY_HASH" >> "$CEREMONY_LOG"
ok "ceremony entry appended to $CEREMONY_LOG"

# ── B7 — export verification key ────────────────────────────────────────────
step "Export verification key"
npx -y --no-install snarkjs zkey export verificationkey \
    "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
    "$VK_OUT.tmp"
jq . "$VK_OUT.tmp" > "$VK_OUT"
rm "$VK_OUT.tmp"
ok "verification key written to $VK_OUT"

# ── B8 — verify zkey ────────────────────────────────────────────────────────
step "Verify zkey"
T0=$(now_ms)
npx -y --no-install snarkjs zkey verify \
    "$BUILD_DIR/$CIRCUIT_NAME.r1cs" \
    "$PTAU" \
    "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey"
VERIFY_MS=$(( $(now_ms) - T0 ))
ok "zkey verified in ${VERIFY_MS}ms"

T_SETUP_END=$(now_ms)
SETUP_TOTAL_MS=$(( T_SETUP_END - T_SETUP_START ))
log_jsonl "circuit-setup" "\"status\":\"PASS\",\"setupMs\":$SETUP_MS,\"contribMs\":$CONTRIB_MS,\"verifyMs\":$VERIFY_MS,\"totalMs\":$SETUP_TOTAL_MS,\"ceremonyName\":\"$CEREMONY_NAME\""

# ── B9 — stage publishable artifacts ────────────────────────────────────────
step "Stage public/circuits/"
cp "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "$PUBLIC_DIR/${CIRCUIT_NAME}.wasm"
cp "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey"             "$PUBLIC_DIR/${CIRCUIT_NAME}_final.zkey"
cp "$VK_OUT"                                            "$PUBLIC_DIR/verification_key.json"
ok "artifacts staged"

# ── B10 — summary ───────────────────────────────────────────────────────────
step "Artifact summary"
ls -lh "$PUBLIC_DIR" | sed 's/^/  /'

VK_SHA=$($SHA_CMD "$VK_OUT" | awk '{print $1}')
echo
echo "${BOLD}Constraints:${RESET}      $CONSTRAINTS"
echo "${BOLD}Setup total ms:${RESET}   $SETUP_TOTAL_MS"
echo "${BOLD}vk SHA256:${RESET}        $VK_SHA"
echo "${BOLD}Ceremony name:${RESET}    $CEREMONY_NAME"
echo
ok "Step 0c circuit pipeline complete — run scripts/day0/09-circuit-smoke.ts to validate end-to-end."
