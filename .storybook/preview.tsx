import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'

// The stories are the design system's documentation, so they must render with
// the design system's own CSS — the same entry point the showcase app uses.
import '../src/styles/global.css'
// Use the same actual font files in canvas previews and browser MP4 exports.
import '../src/styles/showcase-font.css'

type ThemeFrameProps = {
  appearance: string
  density: string
  children: ReactNode
}

/**
 * Kumiki UI keys its themes off attributes on the document element
 * (`data-km-appearance`, `data-km-density`) — the mechanism `src/main.tsx` uses.
 * Storybook's canvas is its own document, so the frame mirrors the toolbar
 * selection onto `document.documentElement`, which drives `color-scheme`, the
 * `body` canvas colour and every semantic token.
 *
 * The attributes are also rendered on the wrapper so the first paint (and static
 * builds, before effects run) already carries the right theme.
 */
function KumikiThemeFrame({ appearance, density, children }: ThemeFrameProps) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.kmAppearance = appearance
    root.dataset.kmDensity = density
  }, [appearance, density])

  return (
    <div data-km-appearance={appearance} data-km-density={density}>
      {children}
    </div>
  )
}

const withKumikiTheme: Decorator = (Story, context) => (
  <KumikiThemeFrame
    appearance={context.globals.appearance ?? 'light'}
    density={context.globals.density ?? 'comfortable'}
  >
    <Story />
  </KumikiThemeFrame>
)

const preview: Preview = {
  decorators: [withKumikiTheme],

  initialGlobals: {
    appearance: 'light',
    density: 'comfortable',
  },

  globalTypes: {
    appearance: {
      description: 'Colour appearance',
      toolbar: {
        title: 'Appearance',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Control density',
      toolbar: {
        title: 'Density',
        items: [
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'compact', title: 'Compact' },
          { value: 'spacious', title: 'Spacious' },
        ],
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    // Sidebar sections follow the purpose groups, so the catalog and sidebar agree.
    options: {
      storySort: {
        method: 'alphabetical',
        // Must match CATALOG_GROUP_TITLES; `npm run catalog:check` enforces it.
        order: [
          'Start here',
          'Actions',
          'Form fields',
          'Overlays and notifications',
          'Navigation and layout',
          'Status and feedback',
          'Data display',
          'Application patterns',
          'Media design surfaces',
          'Infographics and charts',
          'Annotation and measurement',
          'Motion engine',
          'Cameras',
          '3D asset toolkit',
          'Asset motion and states',
          'Explainer scenes',
          'Video production',
          'Illustration toolkit',
          'Finance, business and technology',
          'Home',
          'Privacy and files',
          'Showcases',
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
}

export default preview
