import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGitHub } from '../context/GitHubContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Plus, RefreshCw, Search, Circle, CircleDot } from 'lucide-react';
import type { GitHubIssue } from '../../../src/shared/github-types';

export function IssuesPage() {
  const navigate = useNavigate();
  const { issues, activeRepo, refresh } = useGitHub();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `#${issue.number}`.includes(searchQuery)
  );

  const selected = selectedNumber != null ? issues.find(i => i.number === selectedNumber) ?? null : null;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="h-14 border-b border-[#2a2a2a] px-6 flex items-center gap-4 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold text-[#e5e5e5]">GitHub Issues</h1>
        {activeRepo && (
          <div className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm text-[#a3a3a3]">
            {activeRepo.fullName}
          </div>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => {/* TODO: navigate to new issue page */}}>
          <Plus className="h-4 w-4 mr-1" />
          New Issue
        </Button>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Issue list */}
        <div className="w-96 border-r border-[#2a2a2a] flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-[#2a2a2a]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1a1a1a] border-[#2a2a2a]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#737373]">
                {issues.length === 0 ? 'No issues' : 'No matching issues'}
              </div>
            ) : (
              filtered.map(issue => (
                <IssueRow
                  key={issue.number}
                  issue={issue}
                  isSelected={selectedNumber === issue.number}
                  onSelect={() => setSelectedNumber(issue.number)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="flex-1 overflow-auto">
          {selected ? (
            <IssueDetail issue={selected} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[#737373]">
              Select an issue to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue, isSelected, onSelect }: {
  issue: GitHubIssue;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#1a1a1a] transition-colors ${
        isSelected ? 'bg-[#1a1a1a]' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {issue.state === 'open' ? (
          <CircleDot className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 mt-0.5 text-rose-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#e5e5e5] truncate">
            #{issue.number} {issue.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {issue.labels.map(label => (
              <span
                key={label.name}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
              >
                {label.name}
              </span>
            ))}
            {issue.assignee && (
              <span className="text-xs text-[#737373]">
                {issue.assignee.login}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueDetail({ issue }: { issue: GitHubIssue }) {
  return (
    <div className="p-6 max-w-3xl">
      {/* Title + state */}
      <div className="flex items-start gap-3 mb-4">
        {issue.state === 'open' ? (
          <CircleDot className="h-5 w-5 mt-1 text-emerald-500 flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 mt-1 text-rose-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-[#e5e5e5]">
            #{issue.number} {issue.title}
          </h2>
          <div className="text-xs text-[#737373] mt-1">
            opened by {issue.author.login} on {new Date(issue.createdAt).toLocaleDateString()}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          issue.state === 'open'
            ? 'bg-emerald-500/20 text-emerald-500'
            : 'bg-rose-500/20 text-rose-500'
        }`}>
          {issue.state}
        </span>
      </div>

      {/* Labels + assignee */}
      {(issue.labels.length > 0 || issue.assignee) && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {issue.labels.map(label => (
            <span
              key={label.name}
              className="px-2.5 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
            >
              {label.name}
            </span>
          ))}
          {issue.assignee && (
            <span className="text-xs text-[#a3a3a3]">
              Assigned to <span className="text-[#e5e5e5]">{issue.assignee.login}</span>
            </span>
          )}
        </div>
      )}

      {/* Body */}
      {issue.body && (
        <div className="mb-8 p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
          <div className="text-sm text-[#d4d4d4] whitespace-pre-wrap">{issue.body}</div>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="text-sm font-medium text-[#a3a3a3] mb-3">
          {issue.comments.length} comment{issue.comments.length !== 1 ? 's' : ''}
        </h3>
        {issue.comments.length === 0 ? (
          <div className="text-sm text-[#737373]">No comments yet</div>
        ) : (
          <div className="space-y-3">
            {issue.comments.map(comment => (
              <div key={comment.id} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[#e5e5e5]">{comment.author.login}</span>
                  <span className="text-xs text-[#737373]">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-[#d4d4d4] whitespace-pre-wrap">{comment.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
