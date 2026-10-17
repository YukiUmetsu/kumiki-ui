import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Tabs } from "../ui/tabs";
import { Surface } from "../ui/surface-card";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { FormSummary } from "../ui/form-summary";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** One step in a guided form. */
export interface GuidedFormStep {
  /** Stable, unique identity for the step. */
  id: string;
  /** Short step label; also the accessible name of the step's tab. */
  label: string;
  /** Optional one-line explanation shown beneath the step heading. */
  description?: string;
}

/** One validation failure, keyed to the field element that owns it. */
export interface GuidedFormError {
  /** `id` of the field element the summary navigates to and no field marks itself. */
  fieldId: string;
  /** Visible field label, shown in the summary entry. */
  label: string;
  /** Validation message for that field. */
  message: string;
}

/** Handed to `renderStep` so the consumer can render one step's fields. */
export interface GuidedFormStepApi {
  /** The step being rendered. */
  step: GuidedFormStep;
  /** Zero-based index of the step being rendered. */
  index: number;
  /** Current form values. */
  values: Record<string, unknown>;
  /** Merge one field value into the form values through `onChange`. */
  setValue: (fieldId: string, value: unknown) => void;
  /** Validation failures for the active step; always `[]` for hidden steps. */
  errors: GuidedFormError[];
  /** Convenience lookup of the message for a single field. */
  errorFor: (fieldId: string) => string | undefined;
}

/**
 * Consumer-overridable copy. Every key has a neutral English default; long and
 * CJK strings pass through unchanged.
 */
export interface GuidedFormLabels {
  /** Accessible name of the step navigation. @default "Steps" */
  steps: string;
  /** Previous-step action. @default "Previous" */
  previous: string;
  /** Next-step action. @default "Next" */
  next: string;
  /** Final submit action. @default "Submit" */
  submit: string;
  /** Explicit draft-save action; rendered only when `onSaveDraft` is set. @default "Save draft" */
  saveDraft: string;
  /** Accessible name of the primary action while submitting. @default "Submitting…" */
  submitting: string;
  /** Notice shown after a stored draft is restored. @default "Your draft has been restored." */
  draftRestored: string;
  /** Notice shown after an explicit draft save. @default "Draft saved." */
  draftSaved: string;
  /** Heading of the per-step error summary. @default "Please fix the following errors" */
  errorSummaryTitle: string;
  /** Title of the submit-failure notice. @default "Could not submit the form." */
  submitErrorTitle: string;
  /** Body of the submit-failure notice when the rejection carries no message. @default "Something went wrong. Retry when you are ready." */
  submitErrorMessage: string;
  /** Retry action inside the submit-failure notice. @default "Retry" */
  retry: string;
  /** Notice shown after a successful submit. @default "Completed." */
  completed: string;
}

export interface GuidedFormProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange" | "onSubmit"> {
  /** Steps in order. At least one is required. */
  steps: GuidedFormStep[];
  /** Controlled index of the active step. */
  activeStep: number;
  /** Called with the next step index when forward navigation is allowed. */
  onStepChange: (index: number) => void;
  /** Controlled form values, keyed by field id. */
  values: Record<string, unknown>;
  /** Called with the full next values object on every field change. */
  onChange: (values: Record<string, unknown>) => void;
  /** Renders one step's body. The consumer owns the fields and their `id`s. */
  renderStep: (step: GuidedFormStep, api: GuidedFormStepApi) => ReactNode;
  /**
   * Returns this step's validation failures. Run before forward navigation and
   * before submit; an empty array means the step is valid.
   */
  validate: (stepId: string, values: Record<string, unknown>) => GuidedFormError[];
  /** Persists the form. Resolve for success; reject to show a retryable error. */
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  /** Called when the user explicitly saves a draft. Omit to hide the action. */
  onSaveDraft?: (values: Record<string, unknown>) => void;
  /**
   * `localStorage` key for the draft. When set, the draft is persisted on change
   * and restored once on mount; it is removed after a successful submit.
   */
  storageKey?: string;
  /** Called once with a stored draft that was found on mount. */
  onRestoreDraft?: (draft: Record<string, unknown>) => void;
  /** Partial copy overrides merged over the neutral defaults. */
  labels?: Partial<GuidedFormLabels>;
  /** Extra classes merged onto the root element. */
  className?: string;
}

const DEFAULT_LABELS: GuidedFormLabels = {
  steps: "Steps",
  previous: "Previous",
  next: "Next",
  submit: "Submit",
  saveDraft: "Save draft",
  submitting: "Submitting…",
  draftRestored: "Your draft has been restored.",
  draftSaved: "Draft saved.",
  errorSummaryTitle: "Please fix the following errors",
  submitErrorTitle: "Could not submit the form.",
  submitErrorMessage: "Something went wrong. Retry when you are ready.",
  retry: "Retry",
  completed: "Completed.",
};

const DRAFT_PERSIST_DELAY = 300;
const DRAFT_SAVED_NOTICE_DURATION = 3000;

const PANEL_INNER_CLASSES = "flex flex-col gap-6";
const HEADER_CLASSES = "flex flex-col gap-1";
const STEP_HEADING_CLASSES =
  "font-serif text-subheading font-normal tracking-heading text-foreground focus:outline-none";
const STEP_DESCRIPTION_CLASSES = "text-sm text-muted-foreground";
const BODY_CLASSES = "flex flex-col gap-6";
const ACTIONS_CLASSES =
  "flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between";
const ACTIONS_TRAILING_CLASSES =
  "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, quota). Draft persistence is a
    // convenience, so a failure must never break the form.
  }
}

function clearStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // See writeStorage.
  }
}

/**
 * A multi-step form with predictable progress, per-step validation and
 * save/restore.
 *
 * The pattern owns the shell (step navigation, per-step error summary, action
 * footer and status notices) while the consumer owns the data: `steps`,
 * `values`, `renderStep`, `validate`, `onSubmit` and draft handling are all
 * supplied from outside, so no domain, route or service is baked in.
 *
 * Step navigation reuses `Tabs` (compact labels, `aria-label="Steps"`) with a
 * single `Surface` body. Only the active step's `Tabs.Panel` is mounted, so
 * hidden steps are never in the DOM and can never be reached by keyboard or
 * assistive technology; changing step moves focus to the new step heading.
 *
 * The primary action validates the active step: when it fails, progression is
 * blocked and a `FormSummary` (`role="alert"`) appears at the top of the step
 * and receives focus; its entries focus the offending fields. Forward step
 * changes run the same validation, so later steps cannot be reached while the
 * current one is invalid. Submit reports progress through `Button isLoading`,
 * surfaces failures with a retryable `Alert variant="danger"` while keeping the
 * fields editable, and shows a success notice when it resolves.
 *
 * With `storageKey` the draft is written to `localStorage` (debounced) and
 * restored once on mount; it is cleared on a successful submit. An unsaved
 * `beforeunload` guard is armed while the form is dirty, since the pattern does
 * not own routing or navigation. Enter is never hijacked: the body is a native
 * `<form>` whose only submit control is the primary action.
 */
const GuidedForm = forwardRef<HTMLDivElement, GuidedFormProps>(function GuidedForm(
  {
    steps,
    activeStep,
    onStepChange,
    values,
    onChange,
    renderStep,
    validate,
    onSubmit,
    onSaveDraft,
    storageKey,
    onRestoreDraft,
    labels,
    className,
    ...props
  },
  ref
) {
  const reducedMotion = useReducedMotion() ?? false;
  const copy = useMemo<GuidedFormLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  const [stepErrors, setStepErrors] = useState<GuidedFormError[]>([]);
  const [status, setStatus] = useState<"idle" | "pending" | "error" | "success">("idle");
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const focusSummaryRef = useRef(false);
  const baselineRef = useRef<string>(JSON.stringify(values));
  const firstStepRenderRef = useRef(true);
  const restoredRef = useRef(false);
  const skipFirstPersistRef = useRef(true);

  const stepCount = steps.length;
  const activeIndex = Math.min(Math.max(activeStep, 0), Math.max(stepCount - 1, 0));
  const activeStepConfig = steps[activeIndex];
  const isLastStep = activeIndex >= stepCount - 1;
  const isPending = status === "pending";
  const isDirty = status !== "success" && JSON.stringify(values) !== baselineRef.current;

  // Restore a stored draft exactly once. Declared before the persistence effect
  // so a restored draft can never be overwritten by the initial values.
  useEffect(() => {
    if (restoredRef.current || !storageKey) return;
    restoredRef.current = true;
    const raw = readStorage(storageKey);
    if (raw == null || raw === "") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return;
    const draft = parsed as Record<string, unknown>;
    if (Object.keys(draft).length === 0) return;
    setDraftRestored(true);
    onRestoreDraft?.(draft);
  }, [storageKey, onRestoreDraft]);

  // Persist the draft (debounced) on every change after the first commit.
  useEffect(() => {
    if (!storageKey) return;
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      writeStorage(storageKey, JSON.stringify(values));
    }, DRAFT_PERSIST_DELAY);
    return () => window.clearTimeout(handle);
  }, [values, storageKey]);

  // Move focus to the active step heading when the step changes (not on mount).
  useEffect(() => {
    if (firstStepRenderRef.current) {
      firstStepRenderRef.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [activeIndex]);

  // After a failed validation, focus the summary so the failure is announced.
  useEffect(() => {
    if (!focusSummaryRef.current || stepErrors.length === 0) return;
    focusSummaryRef.current = false;
    summaryRef.current?.focus();
  }, [stepErrors]);

  // Exit guard: warn before the tab/window closes while there are unsaved edits.
  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Clear the transient "Draft saved." notice.
  useEffect(() => {
    if (!draftSaved) return;
    const handle = window.setTimeout(() => setDraftSaved(false), DRAFT_SAVED_NOTICE_DURATION);
    return () => window.clearTimeout(handle);
  }, [draftSaved]);

  const setValue = useCallback<GuidedFormStepApi["setValue"]>(
    (fieldId, value) => {
      onChange({ ...values, [fieldId]: value });
    },
    [onChange, values]
  );

  function blockOnErrors(errors: GuidedFormError[]): boolean {
    if (errors.length === 0) return false;
    focusSummaryRef.current = true;
    setStepErrors(errors);
    return true;
  }

  function goToStep(target: number) {
    if (target < 0 || target >= stepCount || target === activeIndex) return;
    if (target > activeIndex) {
      const errors = validate(activeStepConfig.id, values);
      if (blockOnErrors(errors)) return;
    }
    setStepErrors([]);
    onStepChange(target);
  }

  async function runSubmit() {
    setStatus("pending");
    setSubmitErrorMessage(null);
    try {
      await onSubmit(values);
      setStatus("success");
      setDraftRestored(false);
      if (storageKey) clearStorage(storageKey);
    } catch (error) {
      setStatus("error");
      setSubmitErrorMessage(
        error instanceof Error && error.message !== "" ? error.message : null
      );
    }
  }

  function handlePrimary() {
    const errors = validate(activeStepConfig.id, values);
    if (blockOnErrors(errors)) return;
    setStepErrors([]);
    if (isLastStep) void runSubmit();
    else onStepChange(activeIndex + 1);
  }

  function handleSaveDraft() {
    onSaveDraft?.(values);
    if (storageKey) writeStorage(storageKey, JSON.stringify(values));
    setDraftSaved(true);
  }

  /**
   * Builds the panel body for one step. Hidden steps receive empty errors and
   * are never mounted by `Tabs.Panel`, so their fields stay unreachable.
   */
  function renderPanel(step: GuidedFormStep, index: number): ReactNode {
    const isActive = index === activeIndex;
    const api: GuidedFormStepApi = {
      step,
      index,
      values,
      setValue,
      errors: isActive ? stepErrors : [],
      errorFor: (fieldId) =>
        isActive ? stepErrors.find((error) => error.fieldId === fieldId)?.message : undefined,
    };

    return (
      <motion.div
        key={step.id}
        data-part="step-body"
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        className={PANEL_INNER_CLASSES}
      >
        <div className={HEADER_CLASSES}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            data-part="step-heading"
            className={STEP_HEADING_CLASSES}
          >
            {step.label}
          </h3>
          {step.description != null && step.description !== "" ? (
            <p data-part="step-description" className={STEP_DESCRIPTION_CLASSES}>
              {step.description}
            </p>
          ) : null}
        </div>
        <FormSummary
          ref={summaryRef}
          tabIndex={-1}
          errors={api.errors}
          live="assertive"
          title={copy.errorSummaryTitle}
          data-part="error-summary"
          className="focus:outline-none"
        />
        {renderStep(step, api)}
      </motion.div>
    );
  }

  const stepList = (
    <Tabs.List aria-label={copy.steps}>
      {steps.map((step, index) => (
        <Tabs.Tab key={step.id} value={index}>
          {step.label}
        </Tabs.Tab>
      ))}
    </Tabs.List>
  );

  const footer = (
    <div className={ACTIONS_CLASSES}>
      <Button
        type="button"
        variant="outline"
        data-part="previous"
        className="w-full sm:w-auto"
        disabled={activeIndex === 0 || isPending}
        onClick={() => goToStep(activeIndex - 1)}
      >
        {copy.previous}
      </Button>
      <div className={ACTIONS_TRAILING_CLASSES}>
        {onSaveDraft ? (
          <Button
            type="button"
            variant="subtle"
            data-part="save-draft"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={handleSaveDraft}
          >
            {copy.saveDraft}
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          data-part="primary"
          className="w-full sm:w-auto"
          isLoading={isPending}
          loadingLabel={copy.submitting}
        >
          {isLastStep ? copy.submit : copy.next}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      data-km-guided-form=""
      data-part="root"
      data-status={status}
      data-dirty={isDirty ? "" : undefined}
      data-step={activeIndex}
      aria-busy={isPending || undefined}
      className={joinClasses("w-full", className)}
      {...props}
    >
      <Tabs
        activeIndex={activeIndex}
        onChange={(next) => {
          if (next != null) goToStep(next);
        }}
        label={copy.steps}
      >
        <form
          noValidate
          data-part="form"
          onSubmit={(event) => {
            event.preventDefault();
            handlePrimary();
          }}
        >
          <Surface
            variant="solid"
            className="w-full"
            header={stepList}
            footer={footer}
          >
            <div className={BODY_CLASSES}>
              {status === "success" ? (
                <Alert
                  variant="success"
                  live="polite"
                  title={copy.completed}
                  data-part="success"
                />
              ) : null}
              {status === "error" ? (
                <Alert
                  variant="danger"
                  live="assertive"
                  title={copy.submitErrorTitle}
                  data-part="submit-error"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void runSubmit()}
                    >
                      {copy.retry}
                    </Button>
                  }
                >
                  {submitErrorMessage ?? copy.submitErrorMessage}
                </Alert>
              ) : null}
              {draftRestored ? (
                <Alert variant="info" live="polite" data-part="draft-restored">
                  {copy.draftRestored}
                </Alert>
              ) : null}
              {draftSaved ? (
                <Alert variant="success" live="polite" data-part="draft-saved">
                  {copy.draftSaved}
                </Alert>
              ) : null}

              {steps.map((step, index) => (
                <Tabs.Panel key={step.id} value={index} className="mt-0 focus-visible:outline-none">
                  {renderPanel(step, index)}
                </Tabs.Panel>
              ))}
            </div>
          </Surface>
        </form>
      </Tabs>
    </div>
  );
});

GuidedForm.displayName = "GuidedForm";

export { GuidedForm };
export default GuidedForm;
