# Private App Template Instructions

This template is prepared for building private authenticated apps. Keep the structure predictable so future automated edits can find the right place quickly.

## Main Edit Points

- App name and route defaults live in `src/lib/app-config.ts`.
- SDK setup and auth redirects live in `src/lib/dypai.ts`.
- Public and protected route wiring lives in `src/App.tsx`.
- Private app shell layout lives in `src/components/layout/AppLayout.tsx`.
- Sidebar UI lives in `src/components/layout/Sidebar.tsx`.
- Navigation items, page titles, and breadcrumbs live in `src/config/navigation.ts`.
- Admin user management lives in `src/pages/admin/AdminUsers.tsx`.

## Layout

The current private shell uses a sidebar. If the app needs a top header, tab bar, or another navigation model, keep `src/App.tsx` routes intact and replace the shell component used around the private routes.

Do not scatter navigation definitions across layout components. Add or remove app sections in `src/config/navigation.ts`, then let the shell render from that config.

## Branding

Do not hardcode a product or company name inside components. Use `appConfig.name` for visible app branding and `VITE_APP_NAME` for per-app configuration.

The static `index.html` can only show a neutral loading fallback because Vite runtime config is not available there before the app loads.

## Auth And Roles

Public auth pages are:

- `/login`
- `/forgot-password`
- `/reset-password`

Private routes must stay wrapped with `ProtectedRoute`.

Admin-only UI can be hidden by role in the frontend, but permissions must be enforced by the backend. Do not hardcode role lists for management screens; load real roles through the SDK.

## Adding A Private Page

1. Add the route inside the protected `AppLayout` section in `src/App.tsx`.
2. Add the sidebar item and page title in `src/config/navigation.ts`.
3. Add any role restriction with `ProtectedRoute` when the page is not for every authenticated user.

## Admin Users

The admin users panel should keep using SDK modules for user and role management. Keep create/edit inside dialogs, use confirmation for destructive actions, and avoid allowing users to delete themselves from the UI.
