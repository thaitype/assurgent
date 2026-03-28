# Milestone 7: Config from ASSURGENT_HOME

## Objective

Move config and state storage from the current working directory to a dedicated home directory (`~/.assurgent/` by default), controlled by the `ASSURGENT_HOME` env var. Add an `assurgent init` subcommand to scaffold the config file.

## Key Requirements

1. **Home directory** -- `~/.assurgent/` by default, overridable via `ASSURGENT_HOME` env var.
2. **Directory layout**:
   ```
   $ASSURGENT_HOME/
   ├── config.json
   └── state/
       └── sessions.json
   ```
3. **`loadConfig` resolution order** -- explicit `configPath` arg > `$ASSURGENT_HOME/config.json` > `~/.assurgent/config.json`.
4. **`assurgent init` subcommand** -- copies bundled `config.example.json` to `$ASSURGENT_HOME/config.json`. Refuses if config already exists.
5. **Error on missing config** -- message tells user to run `assurgent init` or set `ASSURGENT_HOME`.
6. **State path** -- session state moves to `$ASSURGENT_HOME/state/` (no longer inside `workspacePath`).
7. **Clean break** -- no backward compatibility with cwd-based `config.json`.
8. **No `.env` support** -- remove `.env` references from CLI help text.
9. **`workspacePath`** -- remains a required field in config (no default).
10. **Template source** -- `assurgent init` uses `import.meta.dirname` to locate the bundled `config.example.json`.

## Non-Goals

- Migrating existing config files automatically.
- Interactive prompts during `assurgent init`.
- Changing config.json schema (only where it is loaded from changes).
