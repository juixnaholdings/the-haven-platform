# Design System Strategy: The Digital Vestry

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Vestry."** 

In a physical vestry, there is a sense of quiet preparation, order, and sacred utility. This system avoids the "tech-startup" aesthetic in favor of a high-end editorial experience that feels permanent and intentional. We achieve this by blending "Clerical Minimalism"—a philosophy of removing the unnecessary to focus on the mission—with sophisticated, layered surfaces.

This design system breaks the "template" look by rejecting rigid borders. Instead, we use **intentional white space, soft tonal shifts, and asymmetrical content grouping** to guide the eye. It is high-density for administrative efficiency, yet "breathable" through the use of an expansive warm-neutral palette.

---

## 2. Colors & Surface Philosophy
The palette is rooted in an "Alabaster and Ink" contrast. Warm neutrals provide the soul, while Deep Royal Blue (`primary`) provides the authority.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To separate a sidebar from a main content area, or a table from a header, use background color shifts. 
- *Application:* Place a `surface_container_low` sidebar against a `surface` main stage. The human eye perceives the change in luminosity as a boundary more naturally than a 1px line.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper sheets. 
- **Base Layer:** `surface` (#fcf9f3)
- **Secondary Workspaces:** `surface_container_low` (#f6f3ed)
- **Primary Action Cards:** `surface_container_lowest` (#ffffff) for maximum "pop" and perceived cleanliness.
- **Interactive Elements:** `surface_container_high` (#ebe8e2) for hovered states.

### The "Glass & Gradient" Rule
To prevent the dashboard from feeling "flat," use semi-transparent `surface_container_lowest` with a `backdrop-blur` (12px–20px) for floating elements like dropdowns or mobile navigation. For primary call-to-actions, use a subtle linear gradient from `primary` (#002045) to `primary_container` (#1a365d) at a 135-degree angle to add "visual weight" and depth.

---

## 3. Typography: The Editorial Voice
We utilize **Inter** not as a system font, but as a precision tool. The hierarchy is designed to mimic a high-end ledger or an ecclesiastical program.

*   **Display & Headlines:** Use `display-sm` and `headline-md` sparingly to announce major sections. These should have a slight tracking (letter-spacing) reduction of -0.02em to feel more "custom."
*   **Titles:** `title-lg` and `title-md` are the workhorses for card headers. They should be paired with `primary` color tokens to denote importance.
*   **Body & Labels:** `body-md` is the standard for data. Use `label-sm` in `on_surface_variant` (#43474e) for metadata. 

The contrast between the warm background and the crisp Inter glyphs creates a "printed" feel that enhances readability during long administrative sessions.

---

## 4. Elevation & Depth
We eschew traditional "material" shadows in favor of **Ambient Tonalism.**

*   **The Layering Principle:** Depth is achieved through stacking. A "floating" profile summary card should be `surface_container_lowest` sitting on a `surface_container_low` background.
*   **Ambient Shadows:** If a card requires a "lift" (e.g., a modal or a dragged item), use a shadow with a 24px blur, 4% opacity, using the `on_surface` color (#1c1c18) as the tint. It should look like a soft glow of light, not a dark drop-shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline_variant` (#c4c6cf) at **15% opacity**. This creates a "suggestion" of a line that disappears into the background upon quick glance.

---

## 5. Component Guidelines

### Buttons & Chips
*   **Primary Button:** `primary` background with `on_primary` text. Use `xl` (1.5rem) roundedness to create a friendly, approachable touchpoint.
*   **Secondary/Ghost:** No background. Use `primary` text with a `surface_container_high` background only on hover.
*   **Chips:** Use `secondary_container` (#d9e3f8) with `on_secondary_container` text. These should be `full` rounded (pills).

### Data Tables & Lists
*   **No Dividers:** Forbid the use of horizontal lines between rows. Use `spacing.4` (0.9rem) of vertical padding and a `surface_container_low` background on every second row (zebra striping) at 40% opacity for legibility.
*   **Leading Elements:** Use circular avatars or `primary_fixed` icons to anchor the start of each row.

### Multi-Step Forms
*   **Steppers:** Use a "Vertical Progress" layout in the sidebar using `surface_container_low`. 
*   **Input Fields:** Use `surface_container_lowest` with a `lg` (1rem) corner radius. The label should be `label-md` and always float above the input to maintain high-density breathing room.

### Profile Summaries
*   Utilize "Signature Textures." A profile header might use a soft gradient of `primary_fixed` to `surface` to create a dignified backdrop for user avatars.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `spacing.10` and `spacing.12` for outer page margins to ensure the "editorial" feel.
*   **Do** use `on_tertiary_container` for "Warning" or "Special Note" text—the warm gold/brown provides a soft alternative to harsh reds.
*   **Do** nest cards within containers using the `lg` (1rem) to `xl` (1.5rem) radius scale.

### Don’t:
*   **Don’t** use pure black (#000000) for text. Always use `on_surface` (#1c1c18) to maintain the "warm" clerical tone.
*   **Don’t** use 1px solid borders to separate navigation from content.
*   **Don’t** use standard "Blue" links. Every interactive element should stem from the `primary` or `secondary` token sets.
*   **Don’t** crowd the interface. If a layout feels tight, increase the `spacing` token rather than shrinking the font.