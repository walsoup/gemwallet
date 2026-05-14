# Design System Strategy: Financial Empathy & The Mindful Vault

## 1. Overview & Creative North Star: "The Velvet Sanctuary"
This design system moves away from the aggressive, high-frequency aesthetic typical of fintech and crypto. Our Creative North Star is **The Velvet Sanctuary**. We are building a space that feels immersive, deep, and intentional—shifting the user's relationship with money from "stressful tracking" to "calm stewardship" within a focused, dark environment.

By adopting a dark-mode foundation, we prioritize focus and visual comfort. The interface shouldn't feel like a dense grid of data; it should feel like a premium, private vault where information is presented with balanced hierarchy and a sense of sophisticated quiet.

## 2. Color & Atmosphere
The palette is rooted in a deep, obsidian-neutral base (#1C1919), utilizing the coral primary (#FF6B6B) to provide warm, energetic highlights that pop against the dark environment without causing eye strain.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. We define boundaries through **tonal elevation** only.
- A card should not have a border; it should be a `surface-container-low` object sitting on a `surface` background.
- Use `surface-container-lowest` for the deepest background blacks and `surface-container-highest` for high-interaction touchpoints that need to "advance" toward the user.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of heavy, matte-finished cardstock in a dimly lit room. 
- **Layer 0 (Background):** Our primary neutral base (#1C1919).
- **Layer 1 (Main Content Area):** `surface-container-low`.
- **Layer 2 (Interactive Elements):** `surface-container-high`.
This nesting creates a tactile sense of depth through value shifts rather than lines.

### Signature Textures & Glows
- **The Financial Hearth:** Use the `primary_container` (#FF6B6B) as a soft, blurred background glow (60-100px blur) behind major balance figures. In dark mode, this creates a "radiant" effect that feels premium and warm.
- **Glassmorphism:** Floating elements, such as bottom navigation bars or modal headers, must use a semi-transparent `surface_variant` with a 20px backdrop-blur. This maintains the sense of depth while allowing the deep background colors to bleed through.

## 3. Typography: Editorial Authority
We use typography to bridge the gap between technical precision and human warmth.

- **Display & Headlines (Space Grotesk):** This is our "technical" voice. Use it for large numbers and section headers. To soften its nature, use `medium` weight and decrease letter-spacing by -2% for a tighter, premium look against the dark backdrop.
- **Body & Titles (Be Vietnam Pro):** This is our "human" voice. It provides the warmth. Use `body-lg` for instructional text to ensure the app feels helpful and legible in low-light conditions.
- **Scale Contrast:** Create hierarchy by pairing a `display-lg` balance figure with a `label-sm` descriptive tag. This contrast is the hallmark of high-end digital design.

## 4. Elevation & Depth: Tonal Layering
Traditional dropshadows are nearly invisible in dark mode. This system uses **Value-Based Physics**.

- **The Layering Principle:** Achieve lift by increasing the lightness of the surface. A `surface-container-highest` card looks "closer" because it is slightly lighter than the `surface-container` below it.
- **Inner Glows:** For floating CTAs, instead of a shadow, a 1px inner stroke of `outline-variant` at low opacity can simulate a "rim light" effect.
- **Ambient Shadows:** If used, shadows must be deep and large, acting more as a "void" around the element: `0px 20px 40px rgba(0, 0, 0, 0.4)`.

## 5. Components & Primitives

### Buttons: The "Soft-Touch" CTA
- **Primary:** Background `primary_container` (#FF6B6B) with `on_primary_container` text. Use moderate (`roundedness: 2`) corner radius. 
- **States:** On hover, increase the saturation of the coral or add a subtle outer bloom effect to simulate the button "lighting up."
- **Anatomy:** Balanced padding to give the button a clean, functional presence.

### Input Fields: Recessed Comfort
- **Structure:** Inputs should be `surface-container-lowest` (the darkest tier) with a "recessed" feel. 
- **Focus State:** Instead of a thick border, use a 1px `primary` ghost border (40% opacity) and a soft outer glow of the coral color to indicate the active state.

### Cards: The "Container-First" Approach
- **Constraint:** Forbid the use of divider lines inside cards. 
- **Separation:** Use vertical white space from our normal spacing scale (level 2) or subtle background shifts between the card header and card body.
- **Corner Radius:** Use moderate rounding (level 2) to reinforce the approachable but professional brand personality.

### Progress & Wellness Indicators
- **Style:** Use thick, rounded strokes for progress bars. Use a gradient transition from `primary` to `primary_container` to indicate growth, appearing like a neon filament in the dark UI.

## 6. Do’s and Don’ts

### Do
- **Do** maintain a clean, balanced layout with consistent spacing (scale level 2).
- **Do** lean into the "Warm Coral" as a navigational lighthouse—it provides the necessary contrast in a dark environment.
- **Do** use `Be Vietnam Pro` for any text longer than four words to ensure readability and reduce the "vibration" often found in dark-mode sans-serifs.

### Don't
- **Don't** use pure white text (#FFFFFF). Use `on_surface_variant` or a slightly off-white to reduce eye fatigue.
- **Don't** use "Crypto-green" or "Alert-red." Use the Coral for "positive" and a muted `error` tone for "attention required."
- **Don't** use sharp corners. Every corner must have a moderate radius to maintain the "Sanctuary" vibe.
