---
name: Ajaia Docs
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system powers an ultra-focused, collaborative productivity suite that bridges the structured flow of traditional document processing with the modular, lightweight agility of modern canvas tools. The target audience comprises product designers, software engineers, technical writers, and cross-functional teams who value uncompromised typographic clarity and rapid real-time interaction.

The emotional goal is tranquil productivity—an interface that feels lightweight, dependable, and unobtrusive. The design philosophy blends modern digital minimalism with tactile document realism: functional chrome recedes to the background, while the central document surface commands attention through refined contrast, subtle elevation, and crisp typographic alignment.

## Colors
The color architecture relies on a slate-tinted neutral foundation paired with an intentional hierarchy of functional accents:

- **Primary Canvas & Document**: The outer application frame utilizes a cool slate-neutral `#F8FAFC`, while active document paper surfaces stay pure `#FFFFFF` to ensure optical separation and reading comfort.
- **Borders & Dividers**: Structured dividers and component boundaries use `#E2E8F0`, shifting to `#CBD5E1` for hover and active state borders.
- **Primary Accent (`#4F46E5`)**: A focused indigo used for active tool selections, primary action triggers, text selection states, and link typography.
- **Secondary / Live Indicators (`#10B981`)**: Emerald green reserved for real-time multiplayer status, active cloud synchronizations, and verified approvals.
- **Tertiary / Warning (`#F59E0B`)**: Amber for transient alerts, unresolved comments, and offline network state warnings.
- **Multiplayer Palette**: Real-time collaborative presences utilize designated cursor and selection tints across violet (`#8B5CF6`), sky (`#0EA5E9`), rose (`#F43F5E`), and amber (`#F59E0B`), each paired with a 15% opacity tint for contextual document highlights.

## Typography
Typography is anchored by `Inter` across all document levels to provide high legibility at micro sizes and crisp structural rendering across varying screen densities.

- Document content headings (`display`, `headline-lg`, `headline-md`) prioritize negative tracking (`-0.015em` to `-0.02em`) to maintain editorial cohesion.
- Long-form content reading leverages `body-lg` at 16px with a generous 26px line height for optimal horizontal eye travel across wide containers.
- System chrome, sidebars, and control ribbons utilize `label-md` and `label-sm` with slightly boosted tracking to ensure button text, badges, and contextual metadata remain clear against neutral toolbars.
- Inline code blocks and syntax callouts exclusively switch to `JetBrains Mono` for precise columnar character alignment.

## Layout & Spacing
The layout model employs a centered, fixed-width document canvas wrapped inside a responsive fluid workbench:

- **Desktop (1024px and above)**: The main document is restricted to a maximum width of `850px`, centered within the viewport canvas, offset by fixed collapsible navigation panels (`260px` left panel, `320px` right collaboration inspector). Outer canvas margins use `margin-desktop` (`3rem`), with `gutter-desktop` (`1.5rem`) between panels.
- **Tablet (768px – 1023px)**: Side panels collapse into drawer overlays. Document canvas margins adapt to `margin-tablet` (`2rem`).
- **Mobile (Below 768px)**: Canvas background matches page surface (`#FFFFFF`) with edge-to-edge content; horizontal safety padding collapses to `margin` (`1rem`).
- **Vertical Rhythm**: Block elements (paragraphs, tables, embeds) maintain a strict `space-md` (`0.75rem`) vertical spacing cadence, expanding to `space-lg` (`1.25rem`) between disparate content modules and major headings.

## Elevation & Depth
Depth separates transient workbench tools from the persistent document workspace:

- **Level 0 (Application Base)**: Canvas background resting at `#F8FAFC`.
- **Level 1 (The Document Paper)**: Raised cleanly from the background using a layered ambient drop shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 8px 24px -4px rgba(15, 23, 42, 0.08)`. Outlined with a microscopic `1px` border of `#E2E8F0`.
- **Level 2 (Panels, Floating Menus & Slash Menus)**: Pinned toolbars, context formatting ribbons, and inline `/` command menus float above the content using `0 4px 12px -2px rgba(15, 23, 42, 0.1), 0 2px 6px -1px rgba(15, 23, 42, 0.06)` with a `1px` boundary of `#CBD5E1`.
- **Level 3 (Modal Dialogs & Command Palettes)**: High-priority system modals utilize an elevated shadow (`0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.04)`) over a backdrop overlay rendered in `#0F172A` at 35% opacity with an `8px` gaussian blur.

## Shapes
The shape philosophy favors crisp, structural precision that feels modern without visual noise:

- **Interactive Elements**: Buttons, toolbar controls, dropdown triggers, and text fields use a subtle `0.25rem` radius (roundedness level 1) to convey precision and tool-like utility.
- **Surfaces & Overlays**: Document paper edges, floating popovers, and dialogs step up to `0.5rem` (`rounded-lg`) to soften larger surface areas.
- **Collaborative Indicators**: Live presence indicators, user avatars, and status badges break the strict geometry with full circular shapes (`9999px`) to immediately denote human presence on the canvas.

## Components

### Buttons
- **Primary**: Solid `#4F46E5` background, `#FFFFFF` text, `0.25rem` radius, 36px standard height (`space-sm` vertical, `space-md` horizontal padding). Hover transitions to `#4338CA`.
- **Secondary/Subtle**: Transparent background, `#334155` text, border `1px` solid `#E2E8F0`. Hover triggers background `#F1F5F9`.
- **Icon / Toolbar Buttons**: 32x32px square targets, borderless by default. Hover reveals `#F1F5F9` background; active tool state is pinned with `#EEF2FF` fill and `#4F46E5` icon tint.

### Inputs & Slash Commands
- **Text Inputs**: Flat `#FFFFFF` fill with `1px` solid `#CBD5E1` border. Focused state replaces border with `#4F46E5` and a concentric `0 0 0 3px rgba(79, 70, 229, 0.12)` glow ring.
- **Floating Slash Menu**: Constrained to 300px max width. Each row contains an icon slot (20x20px), title (`label-md`), and trailing keyboard shortcut hint (`body-sm` in slate gray). Arrow selection sets background to `#F1F5F9`.

### Chips & Badges
- Compact capsules (`22px` height) with `1px` stroke. 
- Status variant (Live Sync) features an active pulsing 6px circular dot (`#10B981`) alongside 11px uppercase bold typography.

### Checkboxes & Toggle Lists
- Checkboxes use `16x16px` boxes with `0.25rem` corners and `#CBD5E1` borders. Checked state instantly fills with `#4F46E5` displaying a crisp white SVG checkmark. Adjacent task list item text strikes through with a transition to `#94A3B8`.

### Collaborative Presences & Cursors
- **Avatars**: 28px circles with a `2px` white border overlap in the top right header.
- **Cursors**: Vertical caret with trailing author nametag in the designated user accent color. Nametags render at `label-sm` (11px) with `2px 6px` padding and rounded corners.

### Modals & Dialogs
- Floating panels centered at `560px` max-width. Header contains clear category label and dismiss action. Content is bounded by crisp `#E2E8F0` separators, terminating in an action bar with right-aligned dismissive and assertive button pairs.