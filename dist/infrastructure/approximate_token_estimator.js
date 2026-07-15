export class ApproximateTokenEstimator {
    estimate(text) {
        const normalized = text.trim();
        if (normalized.length === 0) {
            return { tokens: 0, method: 'approximate' };
        }
        const wordLikeTokens = normalized.split(/\s+/).length;
        const characterEstimate = Math.ceil(normalized.length / 4);
        return {
            tokens: Math.max(wordLikeTokens, characterEstimate),
            method: 'approximate',
        };
    }
}
//# sourceMappingURL=approximate_token_estimator.js.map