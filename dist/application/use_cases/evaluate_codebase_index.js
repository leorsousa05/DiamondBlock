import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Scope } from '../../domain/scope.js';
import { CodebaseIndexer } from '../../infrastructure/codebase_indexer.js';
export class EvaluateCodebaseIndexUseCase {
    options;
    constructor(options) {
        this.options = options;
    }
    async execute(input) {
        const projectId = Scope.normalizeProjectId(input.projectId);
        const limit = input.limit ?? 5;
        const queries = input.queries ?? [];
        const indexer = new CodebaseIndexer({
            scanner: this.options.scanner,
            pipeline: this.options.pipeline,
            indexRepository: this.options.indexRepository,
            codebaseChunkRepository: this.options.codebaseChunkRepository,
            vectorIndex: this.options.vectorIndex,
            embeddingProvider: this.options.embeddingProvider,
        });
        await indexer.index(projectId, input.rootPath, { force: input.force });
        const manifest = await this.options.indexRepository.load(projectId);
        if (!manifest) {
            throw new Error(`No codebase index found for project ${projectId}`);
        }
        const chunks = await this.loadChunks(projectId);
        const queryResults = [];
        for (const query of queries) {
            queryResults.push(await this.evaluateQuery(query, chunks, input.rootPath, projectId, limit));
        }
        return {
            projectId,
            fixtureName: input.fixtureName ?? 'custom',
            generatedAt: new Date(),
            totals: {
                filesIndexed: Object.keys(manifest.files).length,
                chunksIndexed: chunks.length,
                symbolsIndexed: chunks.reduce((sum, chunk) => sum + (chunk.metadata?.symbolIds.length ?? 0), 0),
                relationsIndexed: chunks.reduce((sum, chunk) => sum + (chunk.metadata?.relationCount ?? 0), 0),
            },
            queries: queryResults,
            parserModes: this.countParserModes(chunks),
            tokenSavings: this.summarizeTokenSavings(queryResults),
        };
    }
    async loadChunks(projectId) {
        const chunks = await this.options.codebaseChunkRepository.list({ projectId, limit: 10000 });
        if (chunks.length === 0) {
            throw new Error(`No indexed chunks found for project ${projectId}`);
        }
        return chunks;
    }
    async evaluateQuery(query, allChunks, rootPath, projectId, defaultLimit) {
        const limit = query.limit ?? defaultLimit;
        const embedding = await this.options.embeddingProvider.embed(query.query);
        const results = await this.options.vectorIndex.search(embedding, limit, { scope: `project/${projectId}` });
        const returnedChunks = (await Promise.all(results.map((result) => this.options.codebaseChunkRepository.findById(result.id)))).filter((chunk) => Boolean(chunk));
        const returnedFiles = [...new Set(returnedChunks.map((chunk) => chunk.filePath))];
        const retrievedText = returnedChunks.map((chunk) => chunk.content).join('\n\n');
        const baselineText = await this.readBaselineText(rootPath, query.expectedFiles, allChunks);
        const retrievedTokenEstimate = this.options.tokenEstimator.estimate(retrievedText).tokens;
        const baselineTokenEstimate = this.options.tokenEstimator.estimate(baselineText).tokens;
        return {
            queryId: query.id,
            query: query.query,
            expectedFiles: query.expectedFiles,
            expectedSymbols: query.expectedSymbols ?? [],
            returnedChunkIds: results.map((result) => result.id),
            returnedFiles,
            hitTop1: this.hasHit(returnedChunks.slice(0, 1), query),
            hitTop3: this.hasHit(returnedChunks.slice(0, 3), query),
            hitTop5: this.hasHit(returnedChunks.slice(0, 5), query),
            retrievedTokenEstimate,
            baselineTokenEstimate,
            tokenReductionPercent: this.reductionPercent(retrievedTokenEstimate, baselineTokenEstimate),
        };
    }
    async readBaselineText(rootPath, expectedFiles, allChunks) {
        const files = expectedFiles.length > 0 ? expectedFiles : [...new Set(allChunks.map((chunk) => chunk.filePath))];
        const contents = [];
        for (const file of files) {
            try {
                contents.push(await readFile(join(rootPath, file), 'utf-8'));
            }
            catch {
                const matchingChunks = allChunks.filter((chunk) => chunk.filePath === file);
                contents.push(matchingChunks.map((chunk) => chunk.content).join('\n'));
            }
        }
        return contents.join('\n\n');
    }
    hasHit(chunks, query) {
        const symbols = query.expectedSymbols ?? [];
        return chunks.some((chunk) => query.expectedFiles.includes(chunk.filePath) ||
            symbols.some((symbol) => chunk.content.includes(symbol) || chunk.title.includes(symbol)));
    }
    countParserModes(chunks) {
        return chunks.reduce((counts, chunk) => {
            const mode = chunk.metadata?.parsingMode;
            if (mode === 'ast' || mode === 'simplified' || mode === 'fallback') {
                counts[mode] += 1;
            }
            return counts;
        }, { ast: 0, simplified: 0, fallback: 0 });
    }
    summarizeTokenSavings(results) {
        const reductions = results.map((result) => result.tokenReductionPercent);
        if (reductions.length === 0) {
            return { method: 'approximate', averageReductionPercent: 0, minReductionPercent: 0, maxReductionPercent: 0 };
        }
        return {
            method: 'approximate',
            averageReductionPercent: reductions.reduce((sum, value) => sum + value, 0) / reductions.length,
            minReductionPercent: Math.min(...reductions),
            maxReductionPercent: Math.max(...reductions),
        };
    }
    reductionPercent(retrievedTokens, baselineTokens) {
        if (baselineTokens === 0)
            return 0;
        return Math.max(0, Math.min(100, ((baselineTokens - retrievedTokens) / baselineTokens) * 100));
    }
}
//# sourceMappingURL=evaluate_codebase_index.js.map