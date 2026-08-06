import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Comment {
  user: string;
  body: string;
}

interface Props {
  owner: string;
  repo: string;
  prNumber: number;
}

export function PRFeedbackPanel({ owner, repo, prNumber }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [prNumber]);

  async function loadFeedback() {
    setLoading(true);
    const data = await window.api.agentGitHub.readFeedback(owner, repo, prNumber);
    setComments(data);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading feedback...</div>;
  }

  if (comments.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No feedback yet</div>;
  }

  return (
    <div className="space-y-3 p-3">
      <div className="text-sm font-semibold">PR Feedback</div>
      {comments.map((comment, i) => (
        <div key={i} className="rounded-md bg-[#0a0a0a] p-3 border border-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{comment.user}</span>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.body}</div>
        </div>
      ))}
    </div>
  );
}
