import { forwardRef, useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Field } from "../ui/field-input";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";
import { TextareaField } from "../ui/textarea";
import { Surface } from "../ui/surface-card";

function joinClasses(...values: Array<string | undefined | false | null>): string {
  return values.filter(Boolean).join(" ");
}

/** Control that renders one editable setting. */
export type SettingsFieldType = "text" | "textarea" | "select" | "switch" | "checkbox";

/** One selectable option for a `select` field. */
export interface SettingsFieldOption {
  /** Value stored in `values` and reported through `onChange`. Must be unique. */
  value: string;
  /** Visible option text. */
  label: ReactNode;
}

/** Declarative description of one editable setting. */
export interface SettingsField {
  /** Stable identity. Doubles as the control `id` and the key in `values`/`errors`. */
  id: string;
  /** Visible label; also the accessible name of the control. */
  label: ReactNode;
  /** Which control to render for this field. */
  type: SettingsFieldType;
  /** Options for a `select` field, in display order. Ignored by other types. */
  options?: SettingsFieldOption[];
  /** Persistent descriptive text shown beneath the control. */
  description?: ReactNode;
  /** Supplemental hint shown beneath the control while there is no error. */
  hint?: ReactNode;
  /** Placeholder for `text` and `textarea` (and `select` while nothing is chosen). */
  placeholder?: string;
  /** Mark the control as required. @default false */
  required?: boolean;
}

/** Consumer-overridable copy for the built-in actions and statuses. */
export interface SettingsSectionLabels {
  /** Primary action label. @default "Save" */
  save?: ReactNode;
  /** Secondary action label. @default "Reset" */
  reset?: ReactNode;
  /**
   * Accessible name announced while the primary action is loading and used as
   * the button's `loadingLabel`. @default "Saving…"
   */
  saving?: string;
  /** Label of the retry action inside the section error alert. @default "Retry" */
  retry?: ReactNode;
  /** Title of the section error alert. @default "Settings could not be saved." */
  errorTitle?: ReactNode;
}

export interface SettingsSectionProps
  extends Omit<HTMLAttributes<HTMLFormElement>, "onChange" | "title"> {
  /** Section heading. Rendered as the region's accessible name. */
  title: ReactNode;
  /** Optional supporting sentence shown beneath the heading. */
  description?: ReactNode;
  /** Settings to render, in order. The consumer owns the catalogue. */
  fields: SettingsField[];
  /** Current values, keyed by `SettingsField.id`. The consumer owns this state. */
  values: Record<string, unknown>;
  /**
   * Called with the next `values` and the recomputed dirty flag on every field
   * edit. `dirty` is `true` when `values` differs from the last-saved snapshot.
   */
  onChange: (values: Record<string, unknown>, dirty: boolean) => void;
  /**
   * Persist `values`. Return a promise to drive the pending/saved cycle: the
   * snapshot is updated and the saved status shown once it resolves. A sync
   * return is treated as an immediate successful save.
   */
  onSave: (values: Record<string, unknown>) => Promise<void> | void;
  /** Restore the consumer's last-saved values when the user resets. */
  onReset: () => void;
  /**
   * Per-field validation messages keyed by `SettingsField.id`. Each entry is
   * rendered as the control's inline error.
   */
  errors?: Record<string, ReactNode>;
  /** Section-level failure message. Rendered in a danger `Alert` with a retry action. */
  error?: ReactNode | null;
  /** Success message shown after a save resolves. @default "Settings saved." */
  savedMessage?: ReactNode;
  /**
   * Report an in-flight save owned by the consumer. Disables every control and
   * shows the primary action as loading. @default false
   */
  pending?: boolean;
  /**
   * Called when the section error's retry action is pressed. Defaults to running
   * `onSave` again with the current values.
   */
  onRetry?: () => void;
  /** Overridable action labels and status copy. */
  labels?: SettingsSectionLabels;
  /** Extra classes merged onto the root `<form>` (consumer classes win). */
  className?: string;
}

const DEFAULT_SAVED_MESSAGE = "Settings saved.";
const DEFAULT_ERROR_TITLE = "Settings could not be saved.";

/**
 * Stable, order-independent serialization used only for dirty comparison. Values
 * are expected to be JSON-serializable primitives (the settings data contract),
 * so nested key order is not a concern.
 */
function serializeValues(values: Record<string, unknown>): string {
  const keys = Object.keys(values).sort();
  return JSON.stringify(keys.map((key) => [key, values[key]]));
}

function hasContent(node: ReactNode): boolean {
  return node != null && node !== "";
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/**
 * Renders the description / hint / error block for controls whose primitives do
 * not own that copy (select, switch, checkbox). Descriptions stay associated in
 * every state; the error replaces the hint and carries `role="alert"`.
 */
function FieldMessages({
  description,
  hint,
  error,
  className,
}: {
  description?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}) {
  const showDescription = hasContent(description);
  const hasError = hasContent(error);
  const hasHint = hasContent(hint);
  if (!showDescription && !hasError && !hasHint) return null;

  return (
    <div className={joinClasses("flex flex-col gap-1", className)}>
      {showDescription ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {hasError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hasHint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Data-driven settings section: a header, a set of preference controls and a
 * footer action pair, with honest pristine / dirty / pending / saved / error
 * states.
 *
 * The component is fully controlled. It renders exactly the `fields` it is
 * given against `values`, calls `onChange(values, dirty)` on every edit, and
 * treats the values it has successfully saved as the dirty baseline. `dirty` is
 * recomputed from that last-saved snapshot, so Save and Reset stay disabled
 * until something actually changed. Submitting (`Enter` inside any control, or
 * the Save button) runs `onSave`; while a save is in flight every control is
 * disabled and the primary action shows its loading state, and once it resolves
 * the baseline moves forward and a polite inline status confirms the save —
 * no toast provider is required. A `beforeunload` guard is attached while dirty
 * and removed on cleanup.
 *
 * Per-field validation is surfaced inline through the underlying `Field`/control
 * (from the `errors` map) and a section-level failure is shown as a danger
 * `Alert` with a retry action (`onRetry`, or `onSave` again by default). All
 * colours, radii, spacing and motion come from semantic tokens; long and CJK
 * copy wraps instead of clipping; the entrance motion of the status and alert
 * regions is suppressed under `prefers-reduced-motion`. `ref`, `className` and
 * arbitrary form props (`aria-*`, `data-*`) are forwarded to the root form.
 */
const SettingsSection = forwardRef<HTMLFormElement, SettingsSectionProps>(
  function SettingsSection(
    {
      title,
      description,
      fields,
      values,
      onChange,
      onSave,
      onReset,
      errors,
      error = null,
      savedMessage,
      pending = false,
      onRetry,
      labels,
      className,
      ...props
    },
    ref
  ) {
    const titleId = useId();
    const reducedMotion = useReducedMotion();

    const [snapshot, setSnapshot] = useState<Record<string, unknown>>(() => ({ ...values }));
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

    const dirty = useMemo(
      () => serializeValues(values) !== serializeValues(snapshot),
      [values, snapshot]
    );

    const isBusy = pending || saveState === "saving";
    const hasError = hasContent(error);
    const showSaved = saveState === "saved" && !dirty && !hasError;

    const emitChange = useCallback(
      (nextValues: Record<string, unknown>) => {
        const nextDirty =
          serializeValues(nextValues) !== serializeValues(snapshot);
        setSaveState((current) => (current === "saved" && nextDirty ? "idle" : current));
        onChange(nextValues, nextDirty);
      },
      [onChange, snapshot]
    );

    const setFieldValue = useCallback(
      (fieldId: string, value: unknown) => {
        emitChange({ ...values, [fieldId]: value });
      },
      [emitChange, values]
    );

    const runSave = useCallback(
      async (force: boolean) => {
        if (isBusy) return;
        if (!force && !dirty) return;
        const payload = { ...values };
        setSaveState("saving");
        try {
          await onSave(payload);
          setSnapshot(payload);
          setSaveState("saved");
        } catch {
          // The consumer owns the failure message and passes it back as `error`;
          // here we only stop pretending a save is in flight.
          setSaveState("idle");
        }
      },
      [dirty, isBusy, onSave, values]
    );

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void runSave(false);
      },
      [runSave]
    );

    const handleRetry = useCallback(() => {
      if (onRetry) {
        onRetry();
        return;
      }
      void runSave(true);
    }, [onRetry, runSave]);

    // Warn before leaving the tab while there are unsaved changes. The listener
    // is removed on unmount or as soon as the form is pristine again.
    useEffect(() => {
      if (!dirty) return;
      const guard = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", guard);
      return () => window.removeEventListener("beforeunload", guard);
    }, [dirty]);

    const state = hasError
      ? "error"
      : isBusy
        ? "pending"
        : showSaved
          ? "saved"
          : dirty
            ? "dirty"
            : "pristine";

    const saveLabel = labels?.save ?? "Save";
    const resetLabel = labels?.reset ?? "Reset";
    const savingLabel = labels?.saving ?? "Saving…";
    const retryLabel = labels?.retry ?? "Retry";
    const errorTitle = labels?.errorTitle ?? DEFAULT_ERROR_TITLE;

    function renderField(field: SettingsField): ReactNode {
      const fieldError = errors?.[field.id];
      const disabled = isBusy;
      const value = values[field.id];

      let control: ReactNode;

      if (field.type === "textarea") {
        // `TextareaField` exposes a single supporting slot; the description and
        // hint are composed into it so both survive while there is no error.
        const supporting =
          hasContent(field.description) && hasContent(field.hint) ? (
            <>
              <span className="block">{field.description}</span>
              <span className="block">{field.hint}</span>
            </>
          ) : (
            (field.description ?? field.hint)
          );

        control = (
          <TextareaField
            id={field.id}
            label={field.label}
            value={typeof value === "string" ? value : value == null ? "" : String(value)}
            onChange={(event) => setFieldValue(field.id, event.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={fieldError}
            hint={supporting}
            autoResize
          />
        );
      } else if (field.type === "select") {
        control = (
          <div className="flex flex-col gap-1.5">
            <Select
              id={field.id}
              label={field.label}
              options={field.options ?? []}
              value={
                typeof value === "string" ? value : value == null ? null : String(value)
              }
              onValueChange={(next) => setFieldValue(field.id, next ?? "")}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
            />
            <FieldMessages
              description={field.description}
              hint={field.hint}
              error={fieldError}
            />
          </div>
        );
      } else if (field.type === "switch") {
        control = (
          <div className="flex flex-col gap-1.5">
            <Switch
              id={field.id}
              label={field.label}
              description={field.description}
              checked={Boolean(value)}
              onCheckedChange={(checked) => setFieldValue(field.id, checked)}
              required={field.required}
              disabled={disabled}
            />
            <FieldMessages
              hint={field.hint}
              error={fieldError}
              className="ps-14"
            />
          </div>
        );
      } else if (field.type === "checkbox") {
        control = (
          <div className="flex flex-col gap-1.5">
            <Checkbox
              id={field.id}
              label={field.label}
              description={field.description}
              checked={Boolean(value)}
              onCheckedChange={(checked) => setFieldValue(field.id, checked)}
              required={field.required}
              disabled={disabled}
            />
            <FieldMessages hint={field.hint} error={fieldError} className="ps-7" />
          </div>
        );
      } else {
        control = (
          <Field
            id={field.id}
            label={field.label}
            value={typeof value === "string" ? value : value == null ? "" : String(value)}
            onChange={(event) => setFieldValue(field.id, event.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={fieldError}
            hint={field.hint}
            description={field.description}
          />
        );
      }

      return (
        <div key={field.id} data-part="field" data-field-id={field.id} data-field-type={field.type}>
          {control}
        </div>
      );
    }

    return (
      <form
        ref={ref}
        noValidate
        aria-labelledby={titleId}
        data-km-settings-section=""
        data-state={state}
        data-dirty={dirty ? "true" : "false"}
        data-pending={isBusy ? "true" : "false"}
        data-saved={showSaved ? "true" : "false"}
        onSubmit={handleSubmit}
        className={joinClasses("w-full", className)}
        {...props}
      >
        <Surface
          header={
            <div className="flex flex-col gap-1">
              <h2
                id={titleId}
                data-part="title"
                className="font-serif text-heading font-normal tracking-heading text-foreground"
              >
                {title}
              </h2>
              {hasContent(description) ? (
                <p data-part="description" className="max-w-prose font-sans text-body text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          }
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <AnimatePresence initial={false}>
                  {showSaved ? (
                    <motion.span
                      key="saved"
                      role="status"
                      data-part="saved-status"
                      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-status-success"
                    >
                      <CheckIcon className="size-4" />
                      {savedMessage ?? DEFAULT_SAVED_MESSAGE}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={onReset}
                  disabled={!dirty || isBusy}
                >
                  {resetLabel}
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  isLoading={isBusy}
                  loadingLabel={savingLabel}
                  disabled={!dirty || isBusy}
                >
                  {saveLabel}
                </Button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <AnimatePresence initial={false}>
              {hasError ? (
                <motion.div
                  key="error"
                  initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Alert
                    variant="danger"
                    live="polite"
                    title={errorTitle}
                    action={
                      <Button variant="outline" size="sm" onClick={handleRetry}>
                        {retryLabel}
                      </Button>
                    }
                  >
                    {error}
                  </Alert>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {fields.length === 0 ? (
              <p data-part="empty" className="text-sm text-muted-foreground">
                No settings to configure.
              </p>
            ) : (
              fields.map(renderField)
            )}
          </div>
        </Surface>
      </form>
    );
  }
);

SettingsSection.displayName = "SettingsSection";

export { SettingsSection };
export default SettingsSection;
