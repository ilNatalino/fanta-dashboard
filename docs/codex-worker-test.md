# Codex Worker Test

This document was created automatically by the local Codex worker.

## Workflow

The development workflow is:

1. A GitHub Issue is created.
2. The `codex:queued` label starts the worker.
3. Codex implements the requested changes locally.
4. The worker creates a dedicated Git branch.
5. The worker pushes the branch to GitHub.
6. A Pull Request is automatically created.
7. The Pull Request must be manually reviewed before merge.

## Purpose

This file exists only to verify that the local Codex worker can successfully
modify the repository and create a Pull Request.
