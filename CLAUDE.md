# Coin Dash: Lab 3 working notes

This is a Phaser 3 browser game with no build step. Open `index.html` (or serve the folder) to play.
Tuning lives in `settings.js`, behaviour lives in `game.js`, and `vendor/` is the pinned Phaser release, which must not be edited.

## Lab setup

- Solo lab: one person (Eitan Cohen), one laptop (label `eitan-laptop`), with about 4 agents running in parallel. There is no partner.
- Lab start: 2026-10-28T20:51:32+02:00 (Israel Standard Time). Ask for the end time when the report is written.
- The final report is one laptop's JSON from `/lab-report`. Write it under `reports/`, which Git ignores.

## Running several agents at once

- One agent per git worktree and branch. Never share a working folder with another agent.
  Create one with: `git worktree add ../coin-dash-<feature> -b feature/<feature> main`.
- Work, commit and push only on your own branch. Do not edit, commit to, rebase or delete another agent's worktree or branch.
- Do not push to `main` unless you were explicitly given the job of merging.
  The merger brings a branch up to date with the latest `main`, resolves any conflicts, checks the game still loads and plays, and then merges and pushes.
- Expect conflicts in `game.js` and `settings.js`, because most features touch them. Keep each change small and focused.
  Add new settings as new keys rather than reformatting existing lines, and do not make unrelated cleanups.
- Check your work by opening the game in a browser. There are no tests.

## Git

- Agents handle branches, commits, merges and pushes without asking. The user reviews with `git diff`.
  After each step, report the branch and commit hashes.
- Ask first before force-pushing, rewriting pushed history, or deleting a branch that has unmerged work.
