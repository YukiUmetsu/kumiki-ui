import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import type { MouseEvent, ReactNode } from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import type { ToastObject } from "@base-ui/react/toast";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";

/** Severity of a notification. */
export type ToastType = "info" | "success" | "warning" | "error" | "default";

/** Visual emphasis of the optional action button. */
export type ToastActionVariant = "primary" | "secondary" | "subtle" | "outline" | "destructive";

/** Where the stack of toasts is anchored in the viewport. */
export type ToastPosition =
  | "top-start"
  | "top-center"
  | "top-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end";

/**
 * Public description of a single notification, shared by the `<Toast>` renderer
 * and by `useToast().show(...)`.
 */
export interface ToastProps {
  /** Severity. Drives the live-region urgency and the leading status icon. @default "default" */
  type?: ToastType;
  /** Short, bold heading that labels the notification. */
  title?: ReactNode;
  /** Supporting body text. */
  message?: ReactNode;
  /**
   * Called when the action button is pressed. The toast is dismissed afterwards,
   * so a handler usually performs the work and closes the loop.
   */
  action?: () => void;
  /** Label for the optional action button. The action renders only when this is set. */
  actionLabel?: ReactNode;
  /** Visual emphasis of the action button. @default "outline" */
  actionVariant?: ToastActionVariant;
  /** Dismiss the toast when its body is pressed. @default false */
  dismissOnClick?: boolean;
  /**
   * Auto-dismiss delay in **seconds**. Takes precedence over `timeout`. `0` keeps
   * the toast until it is dismissed explicitly.
   */
  autoDismiss?: number;
  /** Auto-dismiss delay in **milliseconds**. `0` disables auto-dismiss. */
  timeout?: number;
  /** Called once the toast is dismissed, however that happened. */
  onDismiss?: () => void;
  /** Accessible name for the dismiss button. @default "Dismiss" */
  dismissLabel?: string;
  /** Extra classes merged onto the toast surface. */
  className?: string;
}

/** Options accepted by `useToast().show(...)`; `ToastProps` plus an optional identity. */
export interface ToastOptions extends ToastProps {
  /**
   * Stable identity used for deduplication. Re-showing the same `id` updates the
   * existing toast in place and refreshes its timer instead of stacking a copy.
   */
  id?: string;
}

/** Imperative notification API returned by `useToast()`. */
export interface ToastApi {
  /** Queue (or update) a toast and return its id. */
  show: (options: ToastOptions) => string;
  /** Dismiss one toast, or every toast when called without an id. */
  dismiss: (id?: string) => void;
  /** Dismiss every visible toast. */
  dismissAll: () => void;
}

export interface ToastProviderProps {
  /** Application content. Toasts render in a portal above it. */
  children?: ReactNode;
  /** Default auto-dismiss delay in milliseconds. `0` disables auto-dismiss. @default 5000 */
  timeout?: number;
  /** Maximum simultaneously visible toasts; older ones are hidden once exceeded. @default 3 */
  limit?: number;
  /** Viewport anchor. @default "bottom-end" */
  position?: ToastPosition;
  /** Accessible name for the toast region. @default "Notifications" */
  label?: string;
  /** Extra classes merged onto the viewport. */
  className?: string;
}

/** Toast payload: presentational options that are not Base UI toast fields. */
export interface ToastData {
  action?: () => void;
  actionLabel?: ReactNode;
  actionVariant?: ToastActionVariant;
  dismissOnClick?: boolean;
  dismissLabel?: string;
  className?: string;
}

/** Props of the single-notification renderer used by the built-in viewport. */
export type ToastItemProps = ToastProps & {
  /** Live toast instance from the manager. Supplied by the built-in viewport. */
  toast: ToastObject<ToastData>;
  /** Viewport anchor used to pick the slide direction. Supplied by the built-in viewport. */
  position?: ToastPosition;
};

const ToastContext = createContext<ToastApi | null>(null);

const SEVERITY_LABEL: Record<ToastType, string> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  error: "Error",
  default: "Notification",
};

/**
 * Restrained leading accent per severity. Severity is still conveyed by the
 * status icon and the live-region urgency, so this marker only reinforces it and
 * is never the sole signal. Colours mirror the icon mapping.
 */
const SEVERITY_MARKER: Record<ToastType, string> = {
  info: "before:bg-status-info",
  success: "before:bg-status-success",
  warning: "before:bg-status-warning",
  error: "before:bg-status-danger",
  default: "before:bg-muted-foreground",
};

const VIEWPORT_BASE =
  "fixed z-50 flex w-[min(22.5rem,calc(100vw-2rem))] gap-3 outline-none";

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-start": "top-4 start-4 flex-col-reverse",
  "top-center": "top-4 start-1/2 -translate-x-1/2 flex-col-reverse",
  "top-end": "top-4 end-4 flex-col-reverse",
  "bottom-start": "bottom-4 start-4 flex-col",
  "bottom-center": "bottom-4 start-1/2 -translate-x-1/2 flex-col",
  "bottom-end": "bottom-4 end-4 flex-col",
};

const ROOT_CLASSES = [
  "relative w-full select-none overflow-hidden rounded-sm border border-border bg-surface-floating p-3 text-foreground shadow-lg",
  "before:pointer-events-none before:absolute before:inset-y-0 before:start-0 before:w-1 before:content-['']",
  "data-[limited]:hidden",
].join(" ");

const ACTION_BASE = [
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-control border px-3",
  "text-sm whitespace-nowrap transition-colors",
  "active:opacity-90",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-floating",
].join(" ");

const ACTION_VARIANTS: Record<ToastActionVariant, string> = {
  primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
  subtle: "border-transparent bg-subtle text-subtle-foreground hover:bg-subtle/80",
  outline: "border-input bg-transparent text-foreground hover:bg-surface-subtle",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const DISMISS_CLASSES = [
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground",
  "transition-colors hover:bg-surface-subtle hover:text-foreground active:bg-surface-inset",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-floating",
].join(" ");

const MotionToastRoot = motion.create(ToastPrimitive.Root);

function joinClasses(...values: Array<string | undefined | false | null>): string {
  return values.filter(Boolean).join(" ");
}

function textOf(value: ReactNode): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

/**
 * Dedup signature for a notification. Returns `null` when the content is not
 * plain text (rich nodes have no stable equality), so those toasts always stack.
 */
function contentSignature(
  type: ToastType,
  title: ReactNode,
  message: ReactNode
): string | null {
  const parts: string[] = [];
  for (const value of [title, message]) {
    if (value == null || value === "") {
      parts.push("");
      continue;
    }
    const text = textOf(value);
    if (text == null) return null;
    parts.push(text);
  }
  if (parts[0] === "" && parts[1] === "") return null;
  return `${type}\u0000${parts[0]}\u0000${parts[1]}`;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "button, a, input, textarea, select, [role='button'], [data-base-ui-swipe-ignore]"
    ) !== null
  );
}

const SEVERITY_ICON_COLOR: Record<Exclude<ToastType, "default">, string> = {
  info: "text-status-info",
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-danger",
};

function SeverityIcon({ type }: { type: ToastType }) {
  if (type === "default") return null;
  const color = SEVERITY_ICON_COLOR[type];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={joinClasses("mt-0.5 size-4 shrink-0", color)}
    >
      {type === "info" ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25v4" />
          <path d="M8 4.75h.01" />
        </>
      ) : null}
      {type === "success" ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="m5.25 8.25 1.9 1.9 3.6-4.1" />
        </>
      ) : null}
      {type === "warning" ? (
        <>
          <path d="M8 2.5 14 13H2Z" />
          <path d="M8 6.5v3" />
          <path d="M8 11.4h.01" />
        </>
      ) : null}
      {type === "error" ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="m5.5 5.5 5 5" />
          <path d="m10.5 5.5-5 5" />
        </>
      ) : null}
    </svg>
  );
}

/**
 * A single tokenized notification.
 *
 * Renders inside the built-in viewport, so it is given the live toast object as
 * `toast`. Severity is conveyed by an icon **and** by the live-region urgency
 * (never by color alone): `error`/`warning` are announced assertively, the rest
 * politely. `autoDismiss`/`timeout` are honored by the toast manager, tapping the
 * body can dismiss when `dismissOnClick` is set, and the optional action button
 * runs its handler and then dismisses the toast. Focus is never moved to a toast
 * automatically.
 *
 * The toast enters and exits with a slide + fade driven by the viewport
 * position, wrapped in the viewport's `AnimatePresence` and suppressed under
 * reduced motion.
 */
export function Toast({
  toast,
  type = "default",
  title,
  message,
  action,
  actionLabel,
  actionVariant = "outline",
  dismissOnClick = false,
  dismissLabel = "Dismiss",
  onDismiss,
  className,
  position = "bottom-end",
}: ToastItemProps) {
  const reducedMotion = useReducedMotion();
  const hasTitle = title != null && title !== "";
  const fallbackLabel = SEVERITY_LABEL[type];
  const enterY = position.startsWith("top") ? -16 : 16;
  const transition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 350, damping: 28 };

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    if (isInteractiveTarget(event.target)) return;
    onDismiss?.();
  }

  function handleAction() {
    action?.();
    onDismiss?.();
  }

  return (
    <MotionToastRoot
      toast={toast}
      data-km-toast=""
      aria-label={hasTitle ? undefined : fallbackLabel}
      initial={{ opacity: 0, y: enterY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: enterY }}
      transition={transition}
      className={joinClasses(ROOT_CLASSES, SEVERITY_MARKER[type], className)}
    >
      <ToastPrimitive.Content
        className={joinClasses("flex items-start gap-3", dismissOnClick && "cursor-pointer")}
        onClick={dismissOnClick ? handleContentClick : undefined}
      >
        <SeverityIcon type={type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {hasTitle ? (
            <ToastPrimitive.Title className="font-serif text-base font-normal tracking-tight text-foreground">
              {title}
            </ToastPrimitive.Title>
          ) : null}
          {message != null && message !== "" ? (
            <ToastPrimitive.Description className="text-sm text-muted-foreground">
              {message}
            </ToastPrimitive.Description>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          {actionLabel != null && action ? (
            <button
              type="button"
              onClick={handleAction}
              className={joinClasses(ACTION_BASE, ACTION_VARIANTS[actionVariant])}
            >
              {actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={dismissLabel}
            onClick={() => onDismiss?.()}
            className={DISMISS_CLASSES}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="size-4"
            >
              <path d="m4.5 4.5 7 7" />
              <path d="m11.5 4.5-7 7" />
            </svg>
          </button>
        </div>
      </ToastPrimitive.Content>
    </MotionToastRoot>
  );
}

Toast.displayName = "Toast";

function ToastList({ api, position }: { api: ToastApi; position: ToastPosition }) {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();
  return (
    <AnimatePresence mode="popLayout">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          position={position}
          type={toast.type as ToastType | undefined}
          title={toast.title}
          message={toast.description}
          {...(toast.data ?? {})}
          onDismiss={() => api.dismiss(toast.id)}
        />
      ))}
    </AnimatePresence>
  );
}

function ToastHost({
  children,
  position,
  label,
  className,
}: Pick<ToastProviderProps, "children" | "position" | "label" | "className">) {
  const manager = ToastPrimitive.useToastManager<ToastData>();

  // Latest toasts, read inside `show` for content-based deduplication without
  // making the callback identity change on every render.
  const toastsRef = useRef(manager.toasts);
  toastsRef.current = manager.toasts;

  // Signature -> id, updated synchronously so several `show` calls in the same
  // tick deduplicate against each other before React re-renders.
  const signatureIdsRef = useRef(new Map<string, string>());
  const idCounterRef = useRef(0);

  const show = useCallback(
    (options: ToastOptions): string => {
      const {
        id,
        type = "default",
        title,
        message,
        autoDismiss,
        timeout,
        onDismiss,
        ...data
      } = options;

      const resolvedTimeout =
        autoDismiss != null ? Math.max(0, autoDismiss * 1000) : timeout;
      const priority = type === "error" || type === "warning" ? "high" : "low";

      let targetId = id;
      if (targetId == null) {
        const signature = contentSignature(type, title, message);
        if (signature != null) {
          const signatures = signatureIdsRef.current;
          targetId = signatures.get(signature);
          if (targetId == null) {
            idCounterRef.current += 1;
            targetId = `km-toast-${idCounterRef.current}`;
          }
          signatures.set(signature, targetId);
          // Keep the memo bounded over a long-lived session.
          if (signatures.size > 200) {
            const liveIds = new Set(toastsRef.current.map((toast) => toast.id));
            for (const [key, value] of signatures) {
              if (!liveIds.has(value)) signatures.delete(key);
            }
          }
        }
      }

      return manager.add({
        id: targetId,
        type,
        title,
        description: message,
        timeout: resolvedTimeout,
        priority,
        onClose: onDismiss,
        data,
      });
    },
    [manager]
  );

  const dismiss = useCallback((id?: string) => manager.close(id), [manager]);
  const dismissAll = useCallback(() => manager.close(), [manager]);

  const api = useMemo<ToastApi>(() => ({ show, dismiss, dismissAll }), [show, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          aria-label={label ?? "Notifications"}
          className={joinClasses(
            VIEWPORT_BASE,
            POSITION_CLASSES[position ?? "bottom-end"],
            className
          )}
        >
          <ToastList api={api} position={position ?? "bottom-end"} />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastContext.Provider>
  );
}

/**
 * Provides the toast system: a live-region viewport, a queue and the imperative
 * `useToast()` API.
 *
 * Mount it once near the root of the app. Notifications never take focus
 * automatically; keyboard users can jump to the region with <kbd>F6</kbd> and
 * reach each toast, its action and its dismiss button in order. Identical
 * notifications shown with the same text (or the same `id`) are deduplicated:
 * the existing toast is updated and its timer refreshed instead of stacking a
 * near-duplicate. Auto-dismiss timers pause while the pointer hovers the stack.
 */
export function ToastProvider({
  children,
  timeout = 5000,
  limit = 3,
  position = "bottom-end",
  label,
  className,
}: ToastProviderProps) {
  return (
    <ToastPrimitive.Provider timeout={timeout} limit={limit}>
      <ToastHost position={position} label={label} className={className}>
        {children}
      </ToastHost>
    </ToastPrimitive.Provider>
  );
}

/**
 * Imperative access to the toast queue. Must be called inside `<ToastProvider>`.
 *
 * ```tsx
 * const toast = useToast();
 * toast.show({ type: "success", title: "Saved", message: "Changes were stored." });
 * ```
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used within <ToastProvider>.");
  }
  return api;
}

export default Toast;
