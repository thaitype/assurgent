# Task 6: Update config.example.json + package.json Dev Script

## Objective

Update the example config and dev script to reflect all milestone-5 changes.

## Scope

**Included:**
- Update `config.example.json` with multi-provider secrets, security blacklist, and proxy sections
- Update `package.json` dev script to use `--env-file .env`
- Add `.env.example` file documenting expected env vars

**Excluded:**
- All implementation code (done in tasks 1-5)

## Rules & Contracts to Follow

- `.chief/milestone-5/_contract/config-secret-ref.md` (config schema)

## Steps

1. Update `config.example.json`:
   - Add `secrets` block with multi-provider format (azure-keyvault + env examples).
   - Add `security.blacklistEnv` with recommended defaults.
   - Add `proxy` block example.
   - Update `botToken` to use `${{secretRef.telegramBotToken}}`.
2. Update `package.json`:
   - Change `dev` script to `bun run --env-file .env src/index.ts`.
3. Create `.env.example` with placeholder env vars (DEV_TOKEN, etc.).

## Acceptance Criteria

- `config.example.json` demonstrates multi-provider secrets, security blacklist, and proxy config.
- `package.json` dev script uses `--env-file .env`.
- `.env.example` exists with documented placeholders.

## Verification

```bash
# Verify JSON is valid
cd app && bun -e "JSON.parse(require('fs').readFileSync('config.example.json', 'utf8'))"
cd app && bun run lint
```

## Deliverables

- Updated `config.example.json`
- Updated `package.json`
- New `.env.example`
