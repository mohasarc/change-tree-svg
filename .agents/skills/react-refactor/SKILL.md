---
name: react-refactor
description: Knowledge reference for porting procedural UI (legacy EJS templates, TypeScript controllers, and global SCSS) to React components in the Colonist codebase. Use this skill whenever the user asks to refactor, port, migrate, convert, rewrite, rebuild, modernize, or React-ify any UI that currently lives in code/client/web, code/client/mobile, or code/client/shared. This teaches where legacy code lives, where React code goes, the shape of a good component, and how to wire a React component into an existing EJS page.
---

# React refactor knowledge

This skill is a pure knowledge reference. It tells you where things live in the Colonist codebase and how React components should look. It does not plan the work, prescribe commit boundaries, or walk through a step-by-step process. Planning and splitting work is owned by a separate workflow skill. This skill answers "where is it?" and "how should it look?" for whatever step the workflow skill has handed you.

## Read the React guide first

Before writing any React code, read these:

- `docs/3. roles/5. development/development_process/react/README.md`: index
- `docs/3. roles/5. development/development_process/react/folder-structure.md`: package layout, component anatomy
- `docs/3. roles/5. development/development_process/react/component-design.md`: presentational, container, core rules with real examples
- `docs/3. roles/5. development/development_process/react/scss-conventions.md`: style patterns, token imports, breakpoints
- `docs/3. roles/5. development/development_process/react/data-sharing.md`: context, state, Storybook decorator rules

Those docs describe how React components should look and be organized. This skill covers the refactor-specific information that is not in the guide: what legacy code looks like, where it lives, and the mechanics of swapping it out for a React component.

## Where legacy procedural code lives

A single refactor usually touches most of the layers below. Before starting, grep for a representative identifier (a controller class name, a CSS selector, a DOM `id`) across `code/client/` and `code/shared/` to find every site.

| Layer | Path |
| ----- | ---- |
| Web EJS templates | `code/client/web/views/pages/**/*.ejs` |
| Mobile EJS templates | `code/client/mobile/views/pages/**/*.ejs` |
| Web controllers (`UIW*`) | `code/client/web/scripts/**/` |
| Mobile controllers (`UIM*`) | `code/client/mobile/scripts/**/` |
| Shared controllers and helpers | `code/client/shared/scripts/**/` |
| Web global SCSS | `code/client/web/css/**/*.scss` |
| Mobile global SCSS | `code/client/mobile/css/**/*.scss` |
| Shared SCSS design tokens | `code/client/shared/css/settings/*.scss` |
| Shared data interfaces | `code/shared/**/*Interfaces.ts` |

Concrete anchor examples (useful for grepping a real refactor target):

- `code/client/web/scripts/ui_leaderboard/UIWLeaderboardController.ts`: a web controller that mounts multiple React components via `mountUIReactComponent`.
- `code/client/mobile/scripts/ui_html/main_page/body/leaderboard/UIMLeaderboardController.ts`: the mobile equivalent.
- `code/client/shared/scripts/more/mountMorePage.ts`: a minimal one-shot mount helper used by shared flows.
- `code/client/web/views/pages/ejs_content/content_leaderboard.ejs`: an EJS template that hosts several React mount points.
- `code/shared/leaderboard_data/LeaderboardInterfaces.ts`: an example of plain data shapes that replaced class-based domain types at the React boundary.

## Where React code goes

Three React packages in the monorepo:

- **`packages/ui/`** (`@colonist/ui`): the foundational design system. Primitives (`Button`, `Dialog`, `Tooltip`), the `T` component and `t()` function, context providers (`DefaultUIContextProvider`, `UIGlobalContext`), and the SCSS token forwarders. Everything else depends on this.
- **`packages/ui-platform/`** (`@colonist/ui-platform`): platform-side components for the Colonist web and mobile experience. **Most refactor work lands here.**
- **`packages/ui-game/`** (`@colonist/ui-game`): game-side components (dice, player panels, in-game UI).

Inside `packages/ui-platform/src/`:

- `common/` holds domain-agnostic reusable building blocks (`Table`, `TableTabs`, `SearchPlayer`, `TextInput`). Any feature can consume them.
- `core/<Feature>/` holds feature-tied components grouped by page or domain (`Leaderboards/`, `MorePage/`). Feature folders are plural, inner component folders are singular.

`core/` can import from `common/` and `@colonist/ui`. The reverse never happens.

## Component anatomy

```
SeasonProgress/
├── ProgressBar/                # sub-component, same anatomy
├── ProgressDate/
├── SeasonProgress.tsx
├── SeasonProgress.module.scss
├── SeasonProgress.stories.tsx
└── index.ts                    # export * from './SeasonProgress.tsx'
```

The `index.ts` is always `.ts` (no JSX) and just re-exports the main component:

```ts
export * from './SeasonProgress.tsx'
```

When a component has a Container/Presentational split, the folder is named for the container and only the container is exported:

```
MorePage/
├── MoreMenuItem/
├── MorePage.tsx              # presentational, NOT exported
├── MorePage.module.scss
├── MorePage.stories.tsx
├── MorePageContainer.tsx     # container, owns state and callbacks
└── index.ts                  # export * from './MorePageContainer.tsx'
```

**Lint-enforced rules** (see `@colonist/eslint-config/react-ui.json`):

- `React.FC` is banned. Type components as plain arrow functions: `const X = (props: XProps) => ...`.
- Named exports only. No `export default`.
- `eslint-plugin-i18next` forbids literal JSX strings. User-facing text goes through `<T id='strings:...' />`.
- `t()` must never be called at module scope. Call it inside render functions or hooks only, because `clientI18n` initializes asynchronously.

## The `mountUIReactComponent` helper

This is how React gets into an EJS page. File: `code/client/shared/scripts/ui_platform/mountUIReactComponent.tsx`.

Signature:

```ts
mountUIReactComponent<T extends object>(
  containerId: string,
  Component: (props: T) => React.ReactNode,
): UIReactComponentView<T>
```

What it does:

- Looks up the DOM element by `containerId`. Throws if not found.
- Creates a React root and wraps every render in `DefaultUIContextProvider`, so any component using `useUIGlobalContext()` works out of the box.
- Returns `{render, unmount}`. `unmount` is rarely called in practice. Mount once per page and call `render(props)` whenever the data changes.

The type alias `UIReactComponentViewOf<typeof Component>` extracts the props type off the component so the returned view is fully type-checked.

### Canonical controller pattern

```ts
// code/client/web/scripts/ui_leaderboard/UIWLeaderboardController.ts
import {SeasonProgress} from '@colonist/ui-platform'
import {
  type UIReactComponentViewOf,
  mountUIReactComponent,
} from '../../../shared/scripts/ui_platform/mountUIReactComponent.tsx'

export class UIWLeaderboardController {
  private readonly seasonProgressView: UIReactComponentViewOf<typeof SeasonProgress>

  constructor() {
    this.seasonProgressView = mountUIReactComponent('leaderboard_season_progress', SeasonProgress)
    void this.fetchNewTabs()
  }

  private renderSeasonProgress(seasonData: RankedSeasonData) {
    this.seasonProgressView.render({
      startDate: new Date(seasonData.startDate),
      endDate: new Date(seasonData.endDate),
      size: 'md',
    })
  }
}
```

- Mount in the constructor. Store the view as `private readonly`.
- Call `.render(props)` from every code path that mutates the relevant data.
- Import the React component by package name (`@colonist/ui-platform`), never by a relative path into the package.
- Import `mountUIReactComponent` via a relative path from `code/client/shared/scripts/ui_platform/mountUIReactComponent.tsx`.

### One React component serves both web and mobile

The same React component usually serves both platforms. `UIWLeaderboardController` mounts `SeasonProgress` with `size: 'md'`; `UIMLeaderboardController` mounts the same component with `size: 'sm'`. Platform differences are handled via props and media queries, not via separate components.

### Simple one-shot mount

For components that never need to re-render (static pages, mount-and-forget), mount and render in one call:

```ts
// code/client/shared/scripts/more/mountMorePage.ts
mountUIReactComponent(containerId, MorePageContainer).render({
  onNavigate: (path) => navigateToPage(path, false, true),
  // ...
})
```

### The EJS side

Collapse the old markup to a single mount point:

```html
<div class="..." id="leaderboard_season_progress"></div>
```

The `id` is what the controller passes to `mountUIReactComponent`. Do not carry over legacy classes from the old markup unless you need them for parent layout (flex context, grid cell placement); those layout styles live in the React component's own `.module.scss` now.

## Porting styles

**Default: copy the legacy SCSS verbatim into the component's `.module.scss` and only adapt what the new environment requires.** Do not redesign while porting. Visual changes belong in a separate PR that changes nothing structural.

Minimum required adaptations when copying:

1. **Global selectors become camelCase local identifiers** scoped inside the module. `.leaderboard_season_progress_bar_container` becomes `.progressBarContainer`.

2. **`@import` becomes `@use`** with namespace aliases for the shared tokens:
   ```scss
   @use '@colonist/ui/palette' as colors;
   @use '@colonist/ui/variables' as variables;
   ```

3. **Raw hex colors become palette lookups.** `#8a7356` becomes `colors.$color-primary-700`. The palette forwards from `code/client/shared/css/settings/_palette.scss`, so every token the old SCSS used has an equivalent.

4. **Raw pixel values for spacing, sizing, and borders become variable lookups** from `variables`: `variables.$border-radius-sm`, etc.

5. **Variant and state classes become modifier classes on the same container**, selected dynamically via `styles[variant]` or via a `clsx` class object for booleans:
   ```scss
   .progressBarContainer {
     &.sm { height: 0.125rem; }
     &.md { height: 0.5rem; }
   }
   ```
   ```tsx
   clsx(styles.progressBarContainer, styles[size], className)
   clsx(styles.pageTabItem, {[styles.active]: isActive, [styles.disabled]: isDisabled})
   ```

6. **Selectors that depend on a parent element** (`.sidebar .link`) become scoped inside the component's own module. If parent styling is structural and needs to stay, pass it through `className`.

7. **Hard-coded breakpoints become variable references**: `variables.$breakpoint-width-md`, `$breakpoint-width-lg`, `$breakpoint-width-xl`.

**Delete the legacy SCSS when the port is complete.** Leaving the old rules "just in case" creates two sources of truth. Grep the old selectors across the codebase before removing to confirm nothing else depends on them.

## Data at the React boundary

React components should not consume class-based domain types with deserialization logic. When porting, replace class types with plain data shapes:

```ts
// Before (class with deserialize())
interface LeaderboardData {
  activeSeasonData: RankedSeasonState | undefined
}

// After (plain data)
interface LeaderboardData {
  activeSeasonData: {startDate: Date; endDate: Date} | undefined
}
```

Update the network layer, the deserialization call sites, and the shared interface (`code/shared/**/*Interfaces.ts`) in the same change. The React component consumes only primitives and plain objects.

## i18n at a glance

- `T` component from `@colonist/ui` for JSX text: `<T id='strings:leaderboardPage.seasonEndsIn' />`.
- `t()` function from `@colonist/ui` for prop values (placeholder, alt, aria-label, or when building data arrays inside hooks): `placeholder={t('strings:popups.searchPlayer.title')}`.
- `TranslationObject` prop type for components that accept a translatable label as a prop: `label: TranslationObject`, rendered as `<T id={label} />` inside the component.
- Never call `t()` at module scope.

See `docs/3. roles/5. development/development_process/react/component-design.md` for the full rules and the lint rule names that enforce them.

## Storybook at a glance

Storybook is at `apps/storybook/` (not inside a package). Stories are co-located with components as `<Component>.stories.tsx`. The global preview does NOT wrap stories in `DefaultUIContextProvider`; components that use `useUIGlobalContext()` must add a per-story decorator.

Standard story shape:

```tsx
const meta: Meta<SeasonProgressProps> = {
  title: 'UI-Platform/Core/Leaderboards/SeasonProgress',
  component: SeasonProgress,
  render: (args) => { /* coerce props if needed */ },
  argTypes: {
    className: {control: false},
    // ...
  },
}
export default meta
type Story = StoryObj<SeasonProgressProps>

export const Base: Story = { args: { /* happy path */ } }
export const EmptyState: Story = { args: { /* nullable inputs */ } }
```

- Title prefix: `UI-Platform/<Common|Core>/<Folder>/<Component>`.
- `Meta<ComponentProps>` and `StoryObj<ComponentProps>` typed against the props interface, not `typeof Component`.
- Centralize prop coercion (e.g. `Date` from Storybook's `date` control arrives as a number) in `meta.render`, not per-story.
- Always ship an empty-state story alongside the happy path.
- Use `TimeUtils.adjustDateByDays(...)` from `@colonist/utils` for date data. Never write `new Date(Date.now() - ...)` math.
- Hide `className` from controls: `className: {control: false}`.

## Helpers and utilities you will reach for

- **`@colonist/utils`**: `TimeUtils`, `DurationConverter`, date math helpers. Used in both components and stories.
- **`@static/images/...`**: path alias for assets in `code/client/static/images/`. Icons are typed as URL strings (`import('@colonist/types').ImageURL`), not React components.
- **`clsx`**: class name composition. Available as a `catalog:` dev dep; add it to a package's `package.json` if missing.
- **`mountUIReactComponent`**: the only way React gets into EJS. Do not roll your own `createRoot` calls.

## Out of scope for this skill

This skill describes the knowledge needed to perform a React port. It does NOT prescribe:

- How to split the work into commits or PRs.
- What order to write files in.
- How to stage changes or when to push.

A separate workflow skill owns planning and commit strategy. This skill focuses on "where things are and how they should look." The two compose: the workflow skill decides what to do next, and this skill tells you how to do it correctly.
