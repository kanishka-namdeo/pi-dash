import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentCard } from '../AgentCard';

describe('AgentCard', () => {
  it('renders agent name and description', () => {
    render(
      <AgentCard
        name="Cursor"
        description="AI-first code editor"
        icon="cursor"
        gradient="from-cyan-500 to-blue-600"
        url="https://cursor.sh"
      />
    );
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('AI-first code editor')).toBeInTheDocument();
  });

  it('has download link', () => {
    render(
      <AgentCard
        name="Cursor"
        description="AI-first code editor"
        icon="cursor"
        gradient="from-cyan-500 to-blue-600"
        url="https://cursor.sh"
      />
    );
    const link = screen.getByRole('link', { name: /download/i });
    expect(link).toHaveAttribute('href', 'https://cursor.sh');
  });
});
