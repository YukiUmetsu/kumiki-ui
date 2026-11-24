import { serveInkCels } from "./ink-paint";
import { INK_BOOK } from "./ink-subjects";

serveInkCels(self as unknown as Parameters<typeof serveInkCels>[0], INK_BOOK);
