import { describe, it, expect } from 'vitest';
import { fixSubgraphLabels, sanitizeMermaidSource } from '../utils/mermaidDownload';

describe('fixSubgraphLabels', () => {
  it('quotes a subgraph label with parentheses', () => {
    const input = 'subgraph API Ecosystem (Deep Ocean)';
    expect(fixSubgraphLabels(input)).toBe('subgraph "API Ecosystem (Deep Ocean)"');
  });

  it('leaves an already-quoted label alone', () => {
    const input = 'subgraph "API Ecosystem (Deep Ocean)"';
    expect(fixSubgraphLabels(input)).toBe(input);
  });

  it('leaves a simple identifier alone', () => {
    const input = 'subgraph myGraph';
    expect(fixSubgraphLabels(input)).toBe(input);
  });

  it('quotes a bracket-style title with parentheses', () => {
    const input = 'subgraph sg1 [My Graph (v2)]';
    expect(fixSubgraphLabels(input)).toBe('subgraph sg1 ["My Graph (v2)"]');
  });

  it('leaves a bracket-style title without special chars alone', () => {
    const input = 'subgraph sg1 [My Graph]';
    expect(fixSubgraphLabels(input)).toBe(input);
  });

  it('handles indented subgraph lines', () => {
    const input = '  subgraph Infra Layer (AWS)';
    expect(fixSubgraphLabels(input)).toBe('  subgraph "Infra Layer (AWS)"');
  });

  it('only affects subgraph lines in multi-line source', () => {
    const input = `flowchart TD
  subgraph API Ecosystem (Deep Ocean)
    A --> B
  end`;
    const result = fixSubgraphLabels(input);
    expect(result).toContain('subgraph "API Ecosystem (Deep Ocean)"');
    expect(result).toContain('A --> B');
  });
});

describe('sanitizeMermaidSource', () => {
  it('fixes subgraph labels as part of full sanitization', () => {
    const input = `flowchart TD
  subgraph API Ecosystem (Deep Ocean)
    A[Start] --> B(End)
  end`;
    const result = sanitizeMermaidSource(input);
    expect(result).toContain('subgraph "API Ecosystem (Deep Ocean)"');
  });
});
