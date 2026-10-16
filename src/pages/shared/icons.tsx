/**
 * Showcase icon set.
 *
 * Hand-drawn on a 20-unit grid with a single shared outline weight so the set
 * stays optically even at `size-5`. Strokes are deliberately lighter than the
 * 2px default (which reads heavy at small sizes) and use round caps/joins to
 * match the control language. `IconCheck` is the one exception: it sits inside
 * a filled checkbox and needs slightly more presence. `IconMore` is a filled
 * glyph (no stroke).
 *
 * Every icon takes only a `className` (defaulting to `size-5`) and is
 * `aria-hidden`, so it never competes with the label it accompanies.
 */

/** Shared outline weight for the set. */
const STROKE = 1.75;

export function IconUser({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 19v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
    </svg>
  );
}

export function IconMail({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="5" width="16" height="10" rx="2" />
      <path d="m2 7 8 5 8-5" />
    </svg>
  );
}

export function IconBell({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 8a5 5 0 0 1 10 0c0 5.5 2 7 2 7H3s2-1.5 2-7" />
      <path d="M9.27 18a1.5 1.5 0 0 0 1.46-1" />
    </svg>
  );
}

export function IconUsers({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8" cy="7" r="4" />
      <path d="M18.5 19v-2a4 4 0 0 0-2.7-3.9" />
      <path d="M14.5 3a4 4 0 0 1 0 8" />
    </svg>
  );
}

export function IconCreditCard({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="M2 9h16" />
    </svg>
  );
}

export function IconInfo({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7h.01" />
      <path d="M10 13v-3" />
    </svg>
  );
}

export function IconMore({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="6" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="14" r="1.5" />
    </svg>
  );
}

export function IconTrash({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h14" />
      <path d="M8 6V4a2 2 0 0 1 4 0v2" />
      <path d="M17 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6" />
    </svg>
  );
}

export function IconCheck({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m4 10 4 4 8-8" />
    </svg>
  );
}

export function IconLink({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.5 11.5a3.5 3.5 0 0 0 5-5l-3-3a3.5 3.5 0 0 0-5 5" />
      <path d="M11.5 8.5a3.5 3.5 0 0 0-5 5l3 3a3.5 3.5 0 0 0 5-5" />
    </svg>
  );
}

export function IconPlus({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  );
}
