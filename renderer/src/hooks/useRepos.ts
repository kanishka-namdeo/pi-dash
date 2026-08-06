import { useGitHub } from '../context/GitHubContext';

export function useRepos() {
  const { repos, activeRepo, addRepo, removeRepo, setActiveRepo } = useGitHub();
  return { repos, activeRepo, addRepo, removeRepo, setActiveRepo };
}
