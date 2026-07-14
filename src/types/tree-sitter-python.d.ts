import type { Language } from 'tree-sitter';

declare module 'tree-sitter-python' {
  const language: Language;
  export default language;
}
