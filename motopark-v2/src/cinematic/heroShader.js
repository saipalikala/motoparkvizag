/**
 * GLSL for the decorative hero layer. Amendment 1 (A).
 *
 * ## Why there is no photograph in here
 *
 * The brief asked for "subtle depth displacement of the hero photograph".
 * That is not implementable under Amendment 1 condition 2, which states the
 * static hero image "remains the LCP element permanently":
 *
 * - A WebGL canvas cannot sample the DOM painted behind it. Displacing the
 *   photo would mean uploading it as a texture and drawing it *in* the canvas.
 * - The real `<img>` would then have to be hidden, or it would show through
 *   undisplaced underneath — and hiding it destroys the LCP element that Phase 0
 *   spent its entire budget getting right.
 * - It would also cost a ~1600x900 RGBA upload (~5.8 MB VRAM) and a second
 *   decode, post-LCP, against a 0 ms TBT baseline.
 *
 * Amendment 1 already provides the sanctioned route for moving the photograph:
 * **(B) scroll-linked opacity/transform on the hero media layer**, which is a
 * capped CSS transform on the DOM element and a separate, later step.
 *
 * What this shader does instead is add *atmospheric* depth over the photo —
 * a slow luminance haze that darkens and lifts different regions over time.
 * It reads as depth without moving, sampling or touching the LCP element.
 *
 * ## Cost shape
 *
 * One fullscreen pass, no textures, no attribute buffers (the triangle is
 * generated from `gl_VertexID`), no per-frame allocations. Everything is a
 * handful of ALU ops per fragment. The expensive thing a shader like this can
 * do is dependent texture reads and loops — there are none.
 */

/**
 * Fullscreen triangle with zero vertex data.
 *
 * A buffer-less triangle (drawArrays with count 3) avoids a vertex buffer, an
 * attribute binding and a VAO entirely. A triangle rather than a quad because a
 * quad's diagonal makes GPUs shade the seam fragments twice.
 */
export const VERT = `#version 300 es
void main() {
  // (-1,-1), (3,-1), (-1,3) — covers the viewport, clipped to it.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Build the fragment source with only the requested effects compiled in.
 *
 * `#ifdef` rather than multiplying terms by a zero uniform: a zeroed term still
 * costs its ALU work, so a "disabled" effect would still show up in a
 * measurement. Each incremental benchmark in docs/13 §5e was taken with the
 * later effects genuinely absent from the compiled program.
 */
export function buildFrag({ grain = true, sweep = true, haze = true } = {}) {
  // `#version` must be the very first line of a GLSL ES 3.00 shader — the
  // defines go immediately after it, never before.
  const defines = [
    grain ? '#define FX_GRAIN 1' : '',
    sweep ? '#define FX_SWEEP 1' : '',
    haze ? '#define FX_HAZE 1' : '',
  ].filter(Boolean);
  return `#version 300 es\n${defines.join('\n')}\n${FRAG_BODY}`;
}

const FRAG_BODY = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform float u_intensity;   // master fade-in, 0..1

out vec4 fragColor;

// Cheap hash. No texture read, no sin() dependency chain.
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

#ifdef FX_HAZE
// Value noise — used only for the low-frequency haze, at one octave.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
#endif

void main() {
  vec2 uv  = gl_FragCoord.xy / u_res;
  float t  = u_time;
  float lum = 0.0;

#ifdef FX_GRAIN
  // ── Film grain ─────────────────────────────────────────────
  // Signed, so it lightens and darkens rather than washing grey.
  // Time is quantised to ~24 fps: film grain resamples on frame
  // boundaries, and at 60 fps it reads as fizzing digital noise.
  float gt    = floor(t * 24.0);
  float grain = hash(gl_FragCoord.xy + gt * 17.0) - 0.5;
  lum += grain * 0.045;
#endif

#ifdef FX_SWEEP
  // ── Slow light sweep ───────────────────────────────────────
  // A soft diagonal band crossing roughly every 19 s. Deliberately
  // not a loop: one exp() on a dot product.
  float axis     = dot(uv, normalize(vec2(1.0, 0.45)));
  float sweepPos = fract(t * 0.0525);            // ~19 s period
  float d        = axis - (sweepPos * 2.2 - 0.6);
  lum += exp(-d * d * 26.0) * 0.85 * 0.050;
#endif

#ifdef FX_HAZE
  // ── Atmospheric depth haze ─────────────────────────────────
  // One octave of very low-frequency noise, drifting. This is the
  // "depth" substitute — see the module header for why the photo
  // itself is not displaced.
  lum += (vnoise(uv * 1.7 + vec2(t * 0.013, t * -0.008)) - 0.5) * 0.055;
#endif

  // ── Composite ──────────────────────────────────────────────
  // Weighted so the photograph stays the subject. The hero scrim is
  // painted over this layer, so contrast for the headline is
  // guaranteed regardless of what happens here.
  lum *= u_intensity;

  // Lighten where positive, darken where negative, via alpha only.
  // Keeps the layer neutral in hue — it must not tint the photo.
  fragColor = vec4(vec3(step(0.0, lum)), abs(lum));
}`;

/**
 * How many dust motes. Each is one GL_POINT, so cost scales with
 * MOTE_COUNT x pointSize² fragments — a few tens of thousands total, versus the
 * ~3.5 M fragments a fullscreen pass touches. Keeping them a separate points
 * draw rather than a loop inside the fullscreen shader is the single biggest
 * efficiency decision in this file: an N-mote loop would multiply the *whole
 * screen* by N distance tests to light a few hundred pixels.
 */
export const MOTE_COUNT = 14;

/**
 * Motes are positioned procedurally from `gl_VertexID` — no attribute buffer,
 * no per-frame CPU work, nothing to upload. The CPU cost per frame is one
 * `drawArrays` call.
 */
export const MOTE_VERT = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_res;
uniform float u_intensity;

out float v_alpha;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

void main() {
  float i = float(gl_VertexID);

  float sx    = hash11(i * 1.7);
  float sy    = hash11(i * 3.1 + 7.0);
  float speed = 0.006 + hash11(i * 5.3) * 0.010;   // slow upward drift
  float phase = hash11(i * 9.1) * 6.283;

  float y = fract(sy + u_time * speed);
  float x = fract(sx + sin(u_time * 0.05 + phase) * 0.02);

  gl_Position  = vec4(vec2(x, y) * 2.0 - 1.0, 0.0, 1.0);
  // Scaled against the backing-store height so motes keep their apparent size
  // across DPRs and viewport heights.
  gl_PointSize = (6.0 + hash11(i * 11.7) * 14.0) * (u_res.y / 900.0);

  // Fade in at the bottom and out at the top so they never pop at the wrap.
  v_alpha = (0.22 + hash11(i * 13.3) * 0.30)
          * u_intensity
          * smoothstep(0.0, 0.14, y)
          * (1.0 - smoothstep(0.82, 1.0, y));
}`;

export const MOTE_FRAG = `#version 300 es
precision mediump float;

in  float v_alpha;
out vec4  fragColor;

void main() {
  vec2  d = gl_PointCoord - 0.5;
  float r = dot(d, d);                        // squared distance — no sqrt
  float a = smoothstep(0.25, 0.0, r) * v_alpha;
  // Warm dust, additively blended against the navy hero.
  fragColor = vec4(1.0, 0.97, 0.92, a);
}`;
