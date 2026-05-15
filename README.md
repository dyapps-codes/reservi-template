# Private App Template

Starter template for private applications with authentication, password recovery, protected routes, and an admin users panel.

## Setup

Create `.env` from `.env.example`:

```env
VITE_APP_NAME=Private App
VITE_DYPAI_URL=https://YOUR_PROJECT_ID.dypai.dev
```

Run the app:

```bash
npm install
npm run dev
```

## Structure

- `AGENTS.md` explains the template structure for automated code changes.
- `src/lib/dypai.ts` creates the DYPAI SDK client.
- `src/lib/app-config.ts` centralizes app name and route paths.
- `src/config/navigation.ts` centralizes sidebar items, route titles, and breadcrumbs.
- `src/App.tsx` defines public, private, and admin routes.
- `src/components/layout/AppLayout.tsx` renders the private shell.
- `src/components/layout/Sidebar.tsx` controls navigation.
- `src/components/layout/AuthLayout.tsx` is shared by login and password flows.
- `src/pages/admin/AdminUsers.tsx` manages users and roles through the SDK.

## Auth

Public routes:

- `/login`
- `/forgot-password`
- `/reset-password`

Private routes are wrapped with `ProtectedRoute`. Guests are redirected to `/login`.

Password recovery is configured in `src/lib/dypai.ts`:

```ts
redirects: {
  passwordRecovery: appConfig.passwordRecoveryPath,
  signIn: appConfig.homePath,
}
```

## Admin

The admin users screen lives at:

```txt
/admin/users
```

It uses:

- `client.users.list()`
- `client.users.create()`
- `client.users.update()`
- `client.users.delete()`
- `client.roles.list()`

Roles are loaded from the app's real `system.roles` table. Do not hardcode role names in the UI.

Backend permissions should control access:

- `manage_users` for user operations.
- `manage_roles` for role operations.
- `manage_system` for system-level operations.

The UI is a convenience layer. The backend remains the source of truth for authorization.

## Adding Routes

Add private pages inside the protected layout in `src/App.tsx`:

```tsx
<Route path="/workspace" element={<Workspace />} />
```

Then add navigation items and route titles in `src/config/navigation.ts`.

## Styling

This template uses Tailwind CSS and shared UI components under `src/components/ui`.

Use the existing tokens and components before adding new patterns:

- `Card` for grouped content.
- `Dialog` for create/edit forms.
- `AlertDialog` for destructive confirmation.
- `Table` for structured admin data.
- `Select` for role and option fields.
- `Badge` for status and role indicators.
- `Button`, `Input`, `DropdownMenu`, and `Toast` for common actions.

Keep private app screens dense, clear, and task-oriented.
