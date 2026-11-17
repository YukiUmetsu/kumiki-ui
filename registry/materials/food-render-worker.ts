/** The module worker that runs FOOD1's render jobs (see `food-render-jobs.ts`). */
import { serveRenderJobs } from "../anatomy/foundation-render";
import { FOOD_RUNNERS } from "./food-render-jobs";

serveRenderJobs(FOOD_RUNNERS);
