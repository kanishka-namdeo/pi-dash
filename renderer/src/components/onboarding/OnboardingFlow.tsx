import type { ScreenName } from '../../types';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { WelcomeScreen } from './WelcomeScreen';
import { ScanningScreen } from './ScanningScreen';
import { ResultsScreen } from './ResultsScreen';
import { ManualAddScreen } from './ManualAddScreen';
import { NoAgentsScreen } from './NoAgentsScreen';
import { ReadyScreen } from './ReadyScreen';

const SCREEN_COMPONENTS: Record<ScreenName, React.ComponentType<any>> = {
  welcome: WelcomeScreen,
  scanning: ScanningScreen,
  results: ResultsScreen,
  'manual-add': ManualAddScreen,
  'no-agents': NoAgentsScreen,
  ready: ReadyScreen,
};

export function OnboardingFlow() {
  const state = useOnboardingState();
  const Screen = SCREEN_COMPONENTS[state.currentScreen];

  if (!Screen) {
    return null;
  }

  return <Screen {...state} onNavigate={state.navigateTo} />;
}
