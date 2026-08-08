import { useProjectSetupState } from '../../hooks/useProjectSetupState';
import type { ScreenName } from '../../types/project-setup';
import { ProjectSelectionScreen } from './screens/ProjectSelectionScreen';
import { ProjectSelectionGitHubConnectedScreen } from './screens/ProjectSelectionGitHubConnectedScreen';
import { RecentProjectsScreen } from './screens/RecentProjectsScreen';
import { RecentProjectsEmptyScreen } from './screens/RecentProjectsEmptyScreen';
import { RecentProjectsLoadingScreen } from './screens/RecentProjectsLoadingScreen';
import { ProjectAlreadyAddedScreen } from './screens/ProjectAlreadyAddedScreen';
import { CloneRepositoryScreen } from './screens/CloneRepositoryScreen';
import { CloneRepositoryValidationErrorScreen } from './screens/CloneRepositoryValidationErrorScreen';
import { CloningProgressScreen } from './screens/CloningProgressScreen';
import { CloneErrorScreen } from './screens/CloneErrorScreen';
import { CloneErrorDestinationExistsScreen } from './screens/CloneErrorDestinationExistsScreen';
import { GitHubRepoPickerScreen } from './screens/GitHubRepoPickerScreen';
import { ProjectLoadingScreen } from './screens/ProjectLoadingScreen';
import { ScanningForAgentsScreen } from './screens/ScanningForAgentsScreen';
import { SelectAgentsScreen } from './screens/SelectAgentsScreen';
import { NotAGitRepositoryScreen } from './screens/NotAGitRepositoryScreen';
import { NoAgentsFoundScreen } from './screens/NoAgentsFoundScreen';

const SCREEN_COMPONENTS: Record<ScreenName, React.ComponentType<any>> = {
  'project-selection': ProjectSelectionScreen,
  'project-selection-github-connected': ProjectSelectionGitHubConnectedScreen,
  'recent-projects': RecentProjectsScreen,
  'recent-projects-empty': RecentProjectsEmptyScreen,
  'recent-projects-loading': RecentProjectsLoadingScreen,
  'project-already-added': ProjectAlreadyAddedScreen,
  'clone-repository': CloneRepositoryScreen,
  'clone-repository-validation-error': CloneRepositoryValidationErrorScreen,
  'cloning-progress': CloningProgressScreen,
  'clone-error': CloneErrorScreen,
  'clone-error-destination-exists': CloneErrorDestinationExistsScreen,
  'github-repo-picker': GitHubRepoPickerScreen,
  'project-loading': ProjectLoadingScreen,
  'scanning-for-agents': ScanningForAgentsScreen,
  'select-agents': SelectAgentsScreen,
  'not-a-git-repository': NotAGitRepositoryScreen,
  'no-agents-found': NoAgentsFoundScreen,
};

interface ProjectSetupFlowProps {
  flowMode?: 'full' | 'condensed';
  onComplete?: () => void;
}

export function ProjectSetupFlow({ flowMode = 'full', onComplete }: ProjectSetupFlowProps) {
  const state = useProjectSetupState(flowMode);
  const Screen = SCREEN_COMPONENTS[state.currentScreen];

  if (!Screen) return null;

  return <Screen {...state} onComplete={onComplete} />;
}
