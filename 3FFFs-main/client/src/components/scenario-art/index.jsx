import BecIllustration from './BecIllustration.jsx'
import SyntheticIdIllustration from './SyntheticIdIllustration.jsx'
import SimSwapIllustration from './SimSwapIllustration.jsx'

/**
 * Maps scenario IDs to their matching illustration component.
 * To add a new scenario illustration:
 *   1. Create a new file in this folder (matching the editorial style)
 *   2. Import and register here
 */
export const SCENARIO_ART = {
  'SC001': BecIllustration,
  'SC002': SyntheticIdIllustration,
  'SC003': SimSwapIllustration,
}

/**
 * Helper: get the illustration component for a scenario ID, or null.
 */
export function getScenarioArt(scenarioId) {
  return SCENARIO_ART[scenarioId] || null
}
