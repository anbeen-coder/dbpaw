# SettingsDialog Refactor Design

## Goal

Split `src/components/settings/SettingsDialog.tsx` into focused settings
components and hooks without changing visible UI, persisted settings, service
calls, translations, or runtime behavior.

## Current Problem

`SettingsDialog.tsx` is about 1100 lines and mixes several responsibilities:

- Dialog shell, navigation, and active section selection.
- Appearance, font, data-grid, and layout controls.
- Update-check state and side effects.
- AI provider form state, loading, saving, deletion, and API-key behavior.
- Shortcut rendering and reset confirmation.
- About content.

This makes future settings additions likely to grow the same file and makes
localized changes harder to review.

## Architecture

Keep `SettingsDialog.tsx` as the composition boundary. It will own the dialog
open state from props, the active settings section, and the props that bridge
application-level layout/data-grid settings back to the parent.

Move section rendering into sibling components under
`src/components/settings/`:

- `SettingsNav.tsx`: section list, icons, active styling, and selection.
- `GeneralSettingsSection.tsx`: language selector, theme/font controls,
  data-grid switches, and update controls.
- `LayoutSettingsSection.tsx`: sidebar layout select.
- `AIProviderSettingsSection.tsx`: AI provider form and configured-provider
  list.
- `ShortcutsSettingsSection.tsx`: existing shortcut reset and recorder UI.
- `AboutSection.tsx`: version, GitHub, license, and platform details.

Move non-trivial stateful logic into hooks under the same directory:

- `useUpdateSettings.ts`: `autoUpdate`, update task subscription, check/restart
  button behavior, and auto-update persistence.
- `useAIProviderSettings.ts`: provider loading, selected provider form state,
  save, clear API key, delete, and provider option presets.

The `McpSettings` component remains as-is and continues to be rendered by
`SettingsDialog`.

## Data Flow

`SettingsDialog` passes section-specific values and callbacks down explicitly.
No new context or global store is introduced.

General settings still use `useTheme()` and `saveSetting()` exactly as today.
The existing parent callbacks for sidebar layout and data-grid settings remain
the integration point for updating the rest of the app.

AI provider calls continue to go through `api.ai.providers`. No component calls
Tauri `invoke()` directly.

Shortcut settings continue to use `useShortcuts()` and `ShortcutRecorder`.
No component reads or writes the shortcut store key directly.

## Behavior Preservation

The refactor must preserve:

- The same section names and default active section when the dialog opens.
- The same form defaults, provider presets, validation, toasts, and deletion
  behavior.
- The same update button disabled states and restart behavior.
- The same persisted store keys:
  `autoUpdate`, `showColumnComments`, `showRowNumbers`,
  `showZebraStripes`, and `sidebarLayout`.
- The same translation keys and visual class names except where a tiny helper
  component removes duplicate markup without changing output.

## Error Handling

Existing user-facing error handling remains unchanged:

- Update check failures log the error and show
  `settings.updates.failedCheck`.
- AI provider load failures show `settings.aiProviders.loadFailed`.
- AI provider mutations use `errorMessage(e)` for toast descriptions.

## Testing And Verification

Because this is a TypeScript/React refactor with no Rust changes, verification
will focus on frontend checks:

- Run the relevant TypeScript/build or test command available in the project.
- Run focused tests if existing settings-related tests exist.
- Inspect `git diff` to ensure the change is structural and does not alter
  service boundaries or persisted keys.

No `cargo check` is required unless `.rs` files are modified.
