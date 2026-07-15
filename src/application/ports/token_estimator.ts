export interface TokenEstimate {
  tokens: number;
  method: 'approximate';
}

export interface TokenEstimator {
  estimate(text: string): TokenEstimate;
}
