# Contract: Config Resolution

## `getAssurgentHome()` helper

Returns the resolved ASSURGENT_HOME path.

```typescript
export function getAssurgentHome(): string {
  return process.env.ASSURGENT_HOME ?? path.join(os.homedir(), ".assurgent");
}
```

## `loadConfig(configPath?: string)` resolution

1. If `configPath` is provided, use it directly.
2. Otherwise, resolve `path.join(getAssurgentHome(), "config.json")`.

If the resolved path does not exist, throw:
```
Config file not found: <resolved-path>
Run "assurgent init" to create one, or set ASSURGENT_HOME to point to an existing config directory.
```

## State path

Session state lives at `path.join(getAssurgentHome(), "state")`. No longer derived from `workspacePath`.

## `assurgent init` behavior

1. Resolve target: `path.join(getAssurgentHome(), "config.json")`.
2. If target exists, print: `Config already exists at <path>. Edit it directly or delete it to re-initialize.` and exit 1.
3. If target does not exist:
   - Create the ASSURGENT_HOME directory (recursive).
   - Copy `config.example.json` from the package (located via `import.meta.dirname`).
   - Print: `Created config at <path>. Edit it with your settings, then run "assurgent".`
   - Exit 0.

## CLI structure

```
assurgent              # start the bot
assurgent init         # scaffold config
assurgent --help       # show help
assurgent --version    # show version
```
