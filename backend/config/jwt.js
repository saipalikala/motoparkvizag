/**
 * The single source of the JWT signing secret.
 *
 * Previously four customer-facing call sites read the secret as
 * `process.env.JWT_SECRET || "motopark_user_secret"`. That fallback is
 * committed to this repository, so an unset JWT_SECRET meant every customer
 * token was signed with a publicly known string — anyone who could read the
 * source could mint a session for any user id. The admin paths had no fallback
 * and failed instead, so the two halves of the same auth system disagreed about
 * how to fail.
 *
 * There is no default. If the secret is missing, signing and verification both
 * throw: sign paths surface a 500, verify paths are already inside try/catch
 * and degrade to 401 / guest. Auth fails closed rather than accepting forged
 * tokens.
 *
 * Deliberately NOT a boot-time crash: this backend is shared with the live V1
 * storefront, so a hard exit on a missing var would take the shop down rather
 * than just its auth. server.js logs a loud startup warning instead. Once
 * JWT_SECRET is confirmed set in every environment, promoting that warning to a
 * refuse-to-boot is a reasonable hardening step.
 */
export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens — see backend/.env.example.",
    );
  }
  return secret;
}

/** True when the secret is configured. For startup diagnostics only. */
export function hasJwtSecret() {
  return Boolean(process.env.JWT_SECRET);
}
