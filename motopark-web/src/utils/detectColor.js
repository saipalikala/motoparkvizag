/* ================================================
   detectColor.js  —  Smart Color Detection Utility
   Usage:
     import detectColor from "@/utils/detectColor";
     const hex = detectColor("Matte Black");          // → "#1a1a1a"
     const grad = detectColor("Black & Yellow");      // → "linear-gradient(90deg, #000000, #ffff00)"
     const none = detectColor("XYZ Unknown");         // → null  (keep existing picker value)
   ================================================ */

/* ── MASTER COLOR DICTIONARY ──
   Key: lowercase alias  →  Value: canonical HEX
   Add as many rows as you need; the lookup is O(1).                        */
const COLOR_MAP = {
    // ─── Neutrals ───
    white: "#ffffff",
    "off white": "#f8f5f0",
    offwhite: "#f8f5f0",
    ivory: "#fffff0",
    cream: "#fffdd0",
    beige: "#f5f0e8",
    linen: "#faf0e6",
    pearl: "#f0ece4",
    silver: "#c0c0c0",
    grey: "#808080",
    gray: "#808080",
    "light grey": "#d3d3d3",
    "light gray": "#d3d3d3",
    "dark grey": "#404040",
    "dark gray": "#404040",
    charcoal: "#36454f",
    slate: "#708090",
    black: "#000000",
    "matte black": "#1a1a1a",
    "glossy black": "#0a0a0a",
    "jet black": "#0d0d0d",

    // ─── Browns ───
    brown: "#8b4513",
    tan: "#d2b48c",
    khaki: "#c3b091",
    sand: "#c2b280",
    camel: "#c19a6b",
    mocha: "#6f4e37",
    chocolate: "#7b3f00",
    coffee: "#6f4e37",
    walnut: "#5c3317",
    sienna: "#a0522d",

    // ─── Reds ───
    red: "#ff0000",
    "dark red": "#8b0000",
    crimson: "#dc143c",
    scarlet: "#ff2400",
    maroon: "#800000",
    wine: "#722f37",
    burgundy: "#800020",
    cherry: "#9b111e",
    rose: "#ff007f",
    blush: "#ffb6c1",
    coral: "#ff6b6b",
    salmon: "#fa8072",
    tomato: "#ff6347",
    rust: "#b7410e",
    brick: "#cb4154",

    // ─── Oranges ───
    orange: "#ff6600",
    "dark orange": "#ff4500",
    amber: "#ffbf00",
    peach: "#ffcba4",
    apricot: "#fbceb1",
    tangerine: "#f28500",
    "fluorescent orange": "#ff5f00",

    // ─── Yellows ───
    yellow: "#ffff00",
    "light yellow": "#ffffe0",
    "dark yellow": "#9b870c",
    gold: "#ffd700",
    mustard: "#e1ad01",
    lemon: "#fff44f",
    "fluorescent yellow": "#ccff00",
    "neon yellow": "#dfff00",

    // ─── Greens ───
    green: "#008000",
    "light green": "#90ee90",
    "dark green": "#006400",
    lime: "#32cd32",
    "neon green": "#39ff14",
    "fluorescent green": "#39ff14",
    olive: "#808000",
    sage: "#bcb88a",
    mint: "#98ff98",
    teal: "#008080",
    emerald: "#50c878",
    forest: "#228b22",
    hunter: "#355e3b",
    army: "#4b5320",
    military: "#4b5320",
    camouflage: "#78866b",
    camo: "#78866b",

    // ─── Blues ───
    blue: "#0000ff",
    "light blue": "#add8e6",
    "dark blue": "#00008b",
    "sky blue": "#87ceeb",
    "royal blue": "#4169e1",
    cobalt: "#0047ab",
    navy: "#000080",
    "navy blue": "#000080",
    denim: "#1560bd",
    indigo: "#4b0082",
    "midnight blue": "#191970",
    cerulean: "#007ba7",
    aqua: "#00ffff",
    cyan: "#00ffff",
    "neon blue": "#1b03a3",

    // ─── Purples & Pinks ───
    purple: "#800080",
    violet: "#ee82ee",
    lavender: "#e6e6fa",
    lilac: "#c8a2c8",
    plum: "#dda0dd",
    mauve: "#e0b0ff",
    magenta: "#ff00ff",
    fuchsia: "#ff00ff",
    pink: "#ffc0cb",
    "hot pink": "#ff69b4",
    "neon pink": "#ff6ec7",
    "fluorescent pink": "#ff1493",
    "baby pink": "#f4c2c2",
};

/* ── TOKENIZER ──────────────────────────────────
   Splits input into candidate phrases (longest-match first)
   so "Navy Blue" matches before "Blue" alone.                              */
const SEPARATORS = /[\s&,+\/|]+/;

function tokenize(raw) {
    // produce phrases of 1–3 consecutive words (for multi-word colors like "sky blue")
    const words = raw.toLowerCase().trim().split(SEPARATORS).filter(Boolean);
    const candidates = [];

    for (let len = 3; len >= 1; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            candidates.push({ phrase: words.slice(i, i + len).join(" "), start: i, end: i + len });
        }
    }
    return candidates;
}

/* ── GREEDY MULTI-COLOR DETECTOR ───────────────
   Scans the name and collects every distinct color it finds,
   preferring longer matches. Returns ordered list of HEX values. */
function extractColors(raw) {
    const words = raw.toLowerCase().trim().split(SEPARATORS).filter(Boolean);
    const found = [];
    const usedIndices = new Set();

    // Try longest spans first (3 words → 2 → 1)
    for (let len = 3; len >= 1; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            // Skip if any word in this span was already consumed
            if ([...Array(len)].some((_, k) => usedIndices.has(i + k))) continue;

            const phrase = words.slice(i, i + len).join(" ");
            if (COLOR_MAP[phrase]) {
                found.push({ hex: COLOR_MAP[phrase], start: i, end: i + len });
                for (let k = i; k < i + len; k++) usedIndices.add(k);
            }
        }
    }

    // Deduplicate identical HEX values while preserving order
    const seen = new Set();
    return found
        .sort((a, b) => a.start - b.start)
        .map(c => c.hex)
        .filter(hex => { if (seen.has(hex)) return false; seen.add(hex); return true; });
}

/* ── PUBLIC API ─────────────────────────────────
   detectColor(name: string) → string | null
     • Single color  → "#rrggbb"
     • Multi-color   → "linear-gradient(90deg, #aaa, #bbb, …)"
     • No match      → null                                                 */
export default function detectColor(name) {
    if (!name || typeof name !== "string") return null;

    const colors = extractColors(name);

    if (colors.length === 0) return null;
    if (colors.length === 1) return colors[0];

    // Build gradient — hard stops give crisp banding for swatches
    const stops = colors.map((hex, i) => {
        const pct = Math.round((i / (colors.length - 1)) * 100);
        return `${hex} ${pct}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/* ── NAMED EXPORT — full dictionary (for autocomplete / testing) ── */
export { COLOR_MAP };