import { useGitHub } from '../context/GitHubContext';

export function useGitHubAuth() {
  const { isAuthenticated, user, login, logout } = useGitHub();
  return { isAuthenticated, user, login, logout };
}
