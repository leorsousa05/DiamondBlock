export interface TokenEstimate {
    tokens: number;
    method: 'approximate';
}
export interface TokenEstimator {
    estimate(text: string): TokenEstimate;
}
//# sourceMappingURL=token_estimator.d.ts.map