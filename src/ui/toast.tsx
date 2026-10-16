// Showcase alias for the distributable component. The canonical implementation
// lives in registry/ui so the published artifact is the single source of truth.
export { Toast, ToastProvider, useToast } from "../../registry/ui/toast";
export type {
  ToastApi,
  ToastActionVariant,
  ToastData,
  ToastItemProps,
  ToastOptions,
  ToastPosition,
  ToastProps,
  ToastProviderProps,
  ToastType,
} from "../../registry/ui/toast";
export { default } from "../../registry/ui/toast";
