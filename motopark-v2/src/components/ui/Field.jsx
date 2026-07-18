import { useId } from 'react';
import styles from './Field.module.css';

/**
 * Field — DS primitive: label + control + optional hint + optional error.
 * Context-free, props-only (docs/11 §2 layer 7).
 *
 * WHY this exists: checkout, auth and account each hand-rolled their own form
 * fields, and they had drifted — three different inline paddings, `height` vs
 * `min-height`, two different focus treatments, and error text that only one of
 * them rendered per-field. A customer spends eight seconds on the hero and four
 * minutes typing into these, so this is where "premium" is actually felt.
 *
 * More importantly, none of the three linked errors to their control. This
 * component always sets `aria-invalid` and points `aria-describedby` at the hint
 * and error, so a screen reader announces "Pincode, invalid entry, enter a valid
 * 6-digit pincode" instead of silently rejecting the form.
 *
 * Usage — the control is rendered for you:
 *   <Field label="Full name" value={v} onChange={fn} autoComplete="name" />
 *   <Field label="Address" as="textarea" rows={3} error={errors.address} />
 *   <Field label="State" as="select" error={errors.state}>
 *     <option value="">Select state</option>
 *   </Field>
 *
 * Props:
 *   label            visible label text (required — no placeholder-only fields)
 *   as               'input' (default) | 'textarea' | 'select'
 *   error            string; renders the message, sets aria-invalid + red border
 *   hint             string; help text, announced before the error
 *   controlClassName extra class on the control itself (e.g. the OTP code style)
 *   id               override the generated id
 *   ...rest          forwarded to the control (type, value, onChange, maxLength…)
 */
export default function Field({
  label,
  as: Comp = 'input',
  error,
  hint,
  className = '',
  controlClassName = '',
  id,
  children,
  ...rest
}) {
  const reactId = useId();
  const controlId = id || `f-${reactId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-err` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const controlCls = [styles.control, error ? styles.invalid : '', controlClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {/* Explicit htmlFor rather than wrapping the control: a wrapping <label>
          would swallow the error text into the accessible name. */}
      <label className={styles.label} htmlFor={controlId}>
        {label}
      </label>

      {hint && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}

      <Comp
        id={controlId}
        className={controlCls}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Comp>

      {/* role="alert" so a validation failure is announced when it appears,
          not only when the field is next focused. */}
      {error && (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
