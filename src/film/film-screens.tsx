/** Live UI that film files can name in a `screen-demo` scene (`"source": { "kind": "ui", "ui": "<name>" }`). Add your own screens here;
 * in your own app, pass `renderScreen` to `FilmStage` instead. */
import type { ScreenUiContext } from "../../registry/video/screen-demo-react";
import { TasksScreen } from "../../registry/video/screen-demo-examples";

const SCREENS: Record<string, (context: ScreenUiContext) => React.ReactNode> = { tasks: context => <TasksScreen {...context} /> };
export const FILM_SCREENS = Object.keys(SCREENS);
export function renderFilmScreen(ui: string, context: ScreenUiContext) {
  const screen = SCREENS[ui];
  if (!screen) throw new Error(`No live screen is named "${ui}". Screens: ${FILM_SCREENS.join(", ")}.`);
  return screen(context);
}
