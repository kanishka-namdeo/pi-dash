import { agentConfigToAgent } from './agentMapper';
import type { AgentConfig } from '../../../src/shared/types';
import type { Agent } from '@/types/dashboard';

// Simple test to verify the mapping function works
function test() {
  const testCases: Array<{ config: AgentConfig; expected: Partial<Agent> }> = [
    {
      config: {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        source: 'detected',
      },
      expected: {
        id: 'claude',
        name: 'Claude Code',
        short: 'CL',
        color: '#1e3a5f',
        textColor: '#60a5fa',
        status: 'idle',
        progress: 0,
      },
    },
    {
      config: {
        id: 'unknown-agent',
        name: 'Unknown Agent',
        icon: 'bot',
        path: '/usr/local/bin/unknown',
        source: 'manual',
      },
      expected: {
        id: 'unknown-agent',
        name: 'Unknown Agent',
        short: 'UN',
        status: 'idle',
        progress: 0,
      },
    },
  ];

  testCases.forEach(({ config, expected }, i) => {
    const result = agentConfigToAgent(config);
    console.log(`\nTest ${i + 1}: ${config.name}`);
    console.log('Input:', config);
    console.log('Output:', result);

    // Verify expected properties
    Object.entries(expected).forEach(([key, value]) => {
      const actual = result[key as keyof Agent];
      if (actual !== value) {
        console.error(`❌ FAIL: Expected ${key} to be ${value}, got ${actual}`);
        process.exit(1);
      }
    });

    console.log('✓ PASS');
  });

  console.log('\n✓ All tests passed!');
}

test();
