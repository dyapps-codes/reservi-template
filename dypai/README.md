# dypai/

Declarative snapshot of your DYPAI project's backend.

## Layout

- `endpoints/` — one YAML per endpoint (the workflow definition).
  Subfolders represent endpoint groups, e.g. `endpoints/Admin/foo.yaml` → group "Admin".
- `sql/` — SQL queries extracted from `dypai_database` nodes when longer than 1500 chars.
- `prompts/` — system prompts extracted from `agent` nodes when longer than 800 chars.
- `code/` — JavaScript / Python extracted from `javascript_code` / `python_code` nodes when longer than 500 chars.
- `migrations/` — numbered SQL migrations (`NNNN_description.sql`). Apply with `run_migration`; tracked in `system.applied_migrations` so re-runs are no-ops.

## Workflow

1. `dypai_pull` to snapshot the remote state into this folder
2. Edit YAML, SQL, prompts, code with your editor or AI agent
3. `dypai_diff` to preview changes
4. `dypai_push` to apply to the remote

Paths inside YAML (e.g. `query_file: sql/create_invoice.sql`) are always relative
to this folder's root, regardless of where the YAML lives.

## Schema changes

For DDL (CREATE / ALTER / DROP) and structural DML, author a migration file:

    dypai/migrations/NNNN_description.sql

Then apply with the `run_migration` MCP tool:

    run_migration({ migration_file: "dypai/migrations/0001_add_orders.sql" })

The tool tracks applied migrations in `system.applied_migrations` so re-runs
are safe no-ops. For ad-hoc queries and one-off writes, `execute_sql` is fine.
`execute_sql` and `run_migration` both refuse to modify `auth`, `storage`,
`system` schemas — those are DYPAI-managed.

## Reference examples

When the project has no endpoints yet, `dypai_pull` writes three reference
files (all with the `.disabled` suffix so `dypai_push` ignores them):

  - `endpoints/_example.yaml.disabled`        full workflow tour
  - `endpoints/_example-tool.yaml.disabled`   endpoint marked `tool: true`
  - `endpoints/_example-agent.yaml.disabled`  endpoint with an agent node using the tool

Read them to learn the canonical YAML format (placeholders, branching, error
handling, agent tools). Copy + adapt:

  cp endpoints/_example.yaml.disabled       endpoints/my-feature.yaml
  cp endpoints/_example-tool.yaml.disabled  endpoints/search-products.yaml
  cp endpoints/_example-agent.yaml.disabled endpoints/chat.yaml
