# TODO List for Milestone 5

- [x] task-1: SecretProvider interface + multi-provider resolver + env provider
- [x] task-2: Azure Key Vault adapter with retry logic
- [x] task-3: Async loadConfig with secret resolution + config schema updates
- [x] task-4: Env var blacklist in claude-code.ts
- [x] task-5: Generic secret proxy server
- [x] task-6: Update config.example.json + package.json dev script
- [x] task-7: Integration tests for secret resolution and proxy
- [x] task-8: Fix double secret resolution in loadConfig (bug from review)
- [x] task-9: Fix release readiness issues (BLOCKER-1, WARNING-2, WARNING-4, NOTE-3)
- [x] task-10: Rewrite proxy routing to use x-assurgent-upstream header
- [x] task-11: Update all proxy tests for header-based routing
- [x] task-12: Update config.example.json and Config type for new proxy whitelist
- [x] task-13: Refactor createProviders for user-chosen instance names with type discriminator
- [x] task-14: Update tests for multi-provider createProviders and resolver
- [x] task-15: Update Config type, loadConfig, and config.example.json for new provider format
- [x] task-16: Update README.md secrets documentation for multi-provider format
