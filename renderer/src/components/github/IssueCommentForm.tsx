import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { MessageCircle } from 'lucide-react';

interface Props {
  owner: string;
  repo: string;
  issueNumber: number;
  onCommentAdded?: () => void;
}

export function IssueCommentForm({ owner, repo, issueNumber, onCommentAdded }: Props) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await window.api.agentGitHub.commentIssue(owner, repo, issueNumber, body);
      setBody('');
      onCommentAdded?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        rows={4}
        className="rounded-md bg-[#0a0a0a] border-[#2a2a2a] resize-none"
      />
      <Button
        onClick={handleSubmit}
        disabled={!body || submitting}
        className="rounded-md"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        {submitting ? 'Posting...' : 'Post Comment'}
      </Button>
    </div>
  );
}
