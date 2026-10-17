/**
 * Showcase re-export shim for the Kumiki motion primitives.
 *
 * The implementation is the single source of truth in
 * `registry/motion/*`; this module only re-exports it for the showcase pages
 * and Storybook, exactly like the `src/media/*` and `src/infographic/*` shims.
 */

export * from "../../registry/motion";
