export interface CodebaseEvaluationQuery {
  id: string;
  query: string;
  expectedFiles: string[];
  expectedSymbols?: string[];
  limit: number;
}

export interface CodebaseEvaluationTotals {
  filesIndexed: number;
  chunksIndexed: number;
  symbolsIndexed: number;
  relationsIndexed: number;
}

export interface CodebaseEvaluationQueryResult {
  queryId: string;
  query: string;
  expectedFiles: string[];
  expectedSymbols: string[];
  returnedChunkIds: string[];
  returnedFiles: string[];
  hitTop1: boolean;
  hitTop3: boolean;
  hitTop5: boolean;
  retrievedTokenEstimate: number;
  baselineTokenEstimate: number;
  tokenReductionPercent: number;
}

export interface ParserModeDistribution {
  ast: number;
  simplified: number;
  fallback: number;
}

export interface TokenSavingsSummary {
  method: 'approximate';
  averageReductionPercent: number;
  minReductionPercent: number;
  maxReductionPercent: number;
}

export interface CodebaseEvaluationReport {
  projectId: string;
  fixtureName: string;
  generatedAt: Date;
  totals: CodebaseEvaluationTotals;
  queries: CodebaseEvaluationQueryResult[];
  parserModes: ParserModeDistribution;
  tokenSavings: TokenSavingsSummary;
}
