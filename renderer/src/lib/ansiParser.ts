export type StyledSpan = {
  text: string;
  bold?: boolean;
  color?: string;
};

export function parseAnsi(input: string): StyledSpan[] {
  return [{ text: input }];
}
