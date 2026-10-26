// Showcase alias for the distributable component. The canonical implementation
// lives in registry/ui so the published artifact is the single source of truth.
export {
  Stepper,
  StepperCheckMark,
  DEFAULT_STEPPER_STATES,
  createCompletionChime,
  useStepperItem,
} from "../../registry/ui/stepper";
export type {
  CompletionChimeOptions,
  DefaultStepperStatus,
  StepperOrientation,
  StepperProps,
  StepperSize,
  StepperStates,
  StepperStateDefinition,
  StepperStatus,
  StepperStatusEvent,
  StepperStep,
  StepperTone,
  StepperItemState,
} from "../../registry/ui/stepper";
export { default } from "../../registry/ui/stepper";
