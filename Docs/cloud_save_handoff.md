# Cloud Save Handoff

## Scope

This document captures the current state of the Plot Twist save-system migration so the work can continue in a later chat without re-discovery.

The goal of the migration is:

1. Allow guest play before wallet connection.
2. Keep guest progress local on the current device.
3. Move connected-wallet progress to Supabase-backed cloud save.
4. Preserve a clear migration path from guest farm to wallet farm.
5. Eventually harden wallet ownership verification.

## What Has Been Done

### 1. Guest mode and wallet mode were separated

The game no longer treats all saves as one local profile.

Implemented:

1. Guest/local save key split in `js/constants.js`.
2. Guest saves now persist under `GUEST_SAVE_KEY`.
3. Wallet saves use a wallet-specific local cache key based on address.

Added constants:

1. `GUEST_SAVE_KEY`
2. `WALLET_SAVE_CACHE_PREFIX`
3. `CLOUD_SAVE_SCHEMA_VERSION`

### 2. Supabase cloud save client was added

New file:

1. `js/cloud-save.js`

Implemented there:

1. Shared Supabase client creation using the existing Supabase config.
2. `fetchCloudSave(walletAddress)` calling RPC `get_game_save`.
3. `upsertCloudSave(...)` calling RPC `upsert_game_save`.
4. Wallet-specific cache key helper.

### 3. Game-state persistence was refactored

Main file changed:

1. `js/game-state.js`

Implemented:

1. `buildSaveData()` to serialize the current farm state consistently.
2. `applySaveData()` to hydrate game state from a saved snapshot.
3. Local guest snapshot read/write helpers.
4. Wallet cache read/write helpers.
5. A persistence-profile concept:
   - `guest`
   - `wallet`
6. `getPersistenceSummary()` for UI display.
7. Queued cloud-save writes via Supabase RPC.

Current behavior:

1. If the player is not connected, `saveGame()` writes guest progress locally.
2. If the player is connected, `saveGame()` writes to wallet cache and queues a cloud save.
3. `loadGame()` restores the guest-local farm by default on startup.

### 4. Guest-to-wallet migration flow was implemented

Implemented in `js/game-state.js` and `js/wallet.js`.

Key behavior:

1. On wallet connect, the game tries to load the wallet profile in this order:
   - if both cloud save and meaningful guest-local save exist and differ, show a one-time choice
   - otherwise prefer Supabase cloud save
   - then wallet-specific local cache
   - then current guest farm, if it has meaningful progress
   - then fresh wallet profile if no save exists
2. On wallet disconnect, the game restores the guest-local farm.

This means the player can start immediately in guest mode, then connect later without losing the current guest farm.

### 4a. One-time cloud vs local choice was added

This was added because the game URL is stable for all users on Metanet, so existing local saves should still be available after the update.

Implemented:

1. If both a cloud save and a meaningful guest-local save exist for the same wallet connect flow, the user gets a one-time choice.
2. Options are:
   - `Use Cloud Save`
   - `Use This Device Save`
3. The choice is remembered per wallet on that device via local storage, so the prompt does not keep appearing.
4. The prompt only appears when the two saves actually differ.

Current implementation detail:

1. The existing confirm modal is reused for this migration choice.

### 5. Header/UI status was updated

Files changed:

1. `index.html`
2. `js/rendering.js`
3. `styles.css`

Implemented:

1. Header now shows `Guest Mode` when not connected.
2. Header now shows save mode status such as:
   - `Local save only`
   - `Cloud save active`
   - `Cloud save starting`
   - `Cloud sync paused`

### 6. Tests were updated and passing

Test file changed:

1. `tests/save_load.test.js`

Validated:

1. Guest local roundtrip save/load.
2. Corrupted guest save recovery.
3. Personal best default behavior.
4. Personal best monotonic behavior.

Latest known test result:

1. `node tests/save_load.test.js` passed.

## Files Changed So Far

### Added

1. `js/cloud-save.js`
2. `Docs/cloud_save_handoff.md`

### Updated

1. `js/constants.js`
2. `js/game-state.js`
3. `js/wallet.js`
4. `js/rendering.js`
5. `index.html`
6. `styles.css`
7. `tests/save_load.test.js`
8. `js/game.js`
9. `js/marketplace.js`

### Added later during payment follow-up

1. `js/bsv-payments.js`

## Important Current Behavior

### Startup

1. The game starts by loading the guest-local profile.
2. If the Metanet SDK is available, wallet connect may then switch the active profile to the wallet profile.

### While disconnected

1. The player is treated as a guest.
2. Progress is stored locally only.
3. This is intentionally allowed for frictionless play.

### While connected

1. The player is switched to a wallet profile.
2. Progress is written to:
   - wallet-specific local cache
   - Supabase cloud save via RPC

### Disconnect flow

1. Disconnecting the wallet restores the guest-local farm.
2. The connected wallet farm remains cached locally and should still exist in Supabase if cloud save succeeded.

## Known Limitations

### 0. BSV payments required explicit broadcast after wallet approval

This issue was found after Metanet tested the game.

Problem:

1. The game handled `pay-response` success.
2. But it did not broadcast the returned `rawTxHex`.
3. That meant wallet approval happened, but the transaction was not actually sent to the network.

What was fixed:

1. Added `js/bsv-payments.js`.
2. Successful BSV payment flows now:
   - wait for `pay-response`
   - read `rawTxHex`
   - sign a Metanet broadcast request
   - call `https://api.metanet.ninja/data/api`
   - only grant seeds / unlocks / marketplace purchases after successful broadcast
3. `wallet.js` now retains `wallet.publicKeyHex` and `payload.genericUseSeed` from `connection-response` for broadcast signing.
4. `game.js` and `marketplace.js` now use the shared broadcasted-payment helper.

Remaining caution:

1. This depends on `genericUseSeed` being available in the Metanet connection payload as documented.
2. The new helper uses browser ESM imports from Noble crypto packages via CDN for secp256k1 signing.
3. Real end-to-end testing inside Metanet.page is still needed to confirm the API accepts the signature format in production.

### 1. Wallet ownership is not fully hardened yet

This is the biggest remaining issue.

Current state:

1. The implementation trusts the current Metanet wallet connection flow enough to select the wallet profile.
2. It does **not** yet implement a server-side signature verification challenge before allowing wallet-owned cloud persistence.

That means:

1. The save system is functionally separated into guest vs wallet profiles.
2. The Supabase RPC path works for persistence.
3. But the identity/security model is not yet complete.

### 2. Cloud save conflict resolution is basic

Current behavior prefers:

1. cloud save
2. then wallet cache
3. then current guest farm

What is missing:

1. explicit merge choice when both guest and cloud saves have meaningful but different progress
2. timestamp/version-based conflict UI
3. safer last-write-wins rules

### 3. Cloud-save feedback is lightweight

Current UI only shows simple status text in the header.

Not yet implemented:

1. last synced timestamp
2. retry indicator / retry button
3. explicit offline/fallback banner

### 4. Automated tests only cover local guest persistence right now

The existing tests do not yet mock Supabase RPC or wallet profile switching.

## What Needs To Be Done Next

## Priority 1: Harden wallet identity

Implement a real wallet-auth flow instead of trusting wallet address alone.

Recommended next step:

1. Add a signed challenge-response flow.
2. Server verifies the signature against the claimed public key/address.
3. Only after verification should the backend allow wallet-owned save/load.

Likely shape:

1. Client requests nonce/challenge.
2. Wallet signs canonical payload.
3. Verification endpoint checks signature.
4. Backend issues short-lived session/token or verified claim.
5. Save/load RPC uses that verified identity.

## Priority 2: Add explicit migration/merge UX

Right now the guest farm is auto-migrated when there is no wallet save.

Consider adding a confirm step such as:

1. `Use wallet cloud farm`
2. `Link current guest farm to wallet`

This becomes more important once real users have farms on multiple devices.

## Priority 3: Add wallet/cloud test coverage

Add tests for:

1. connecting wallet with existing cloud save
2. connecting wallet with only wallet cache
3. connecting wallet with only guest progress
4. disconnecting wallet restores guest farm
5. cloud-save failure falls back to local wallet cache without losing progress

## Priority 4: Improve save status UX

Potential additions:

1. last sync timestamp
2. pending sync spinner
3. cloud error banner
4. manual retry button

## Notes On Supabase Assumptions

This work assumes the following already exists in Supabase:

1. `game_saves` table
2. `game_save_history` table
3. RPC function `get_game_save`
4. RPC function `upsert_game_save`

The current client implementation uses those RPC names directly.

## Quick Continuation Summary

If continuing in another chat, the next useful prompt is roughly:

"Continue the Plot Twist cloud-save migration from `Docs/cloud_save_handoff.md`. The current game supports guest local saves and wallet cloud saves through Supabase RPC, but wallet ownership verification is not hardened yet. Implement the next step: secure wallet verification and safer save authorization."

## Verification State At Time Of Handoff

Checked and passing at handoff:

1. Edited files had no reported syntax errors.
2. `node tests/save_load.test.js` passed.

## Risk Summary

Current implementation is acceptable for continued development and internal testing, but not the final secure production model.

Specifically:

1. Persistence architecture is now much closer to the target design.
2. Guest-mode UX is supported.
3. Wallet/cloud profile switching works.
4. Security hardening remains the main unfinished part.