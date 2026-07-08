import type { Memory } from '../domain/memory.js';
import type { EnrichmentProvider, EnrichmentResult } from '../application/ports/enrichment_provider.js';
export interface LocalEnrichmentProviderOptions {
    stopWords?: Set<string>;
    techTerms?: Set<string>;
}
export declare class LocalEnrichmentProvider implements EnrichmentProvider {
    private readonly stopWords;
    private readonly techTerms;
    constructor(options?: LocalEnrichmentProviderOptions);
    enrich(memory: Memory): Promise<EnrichmentResult>;
}
//# sourceMappingURL=local_enrichment_provider.d.ts.map