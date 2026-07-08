import { z } from 'zod';
export declare function resolveSearchScope(input: {
    scope?: string;
    project_id?: string;
}): string | undefined;
export declare const searchMemoryInputSchema: z.ZodObject<{
    query: z.ZodString;
    scope: z.ZodOptional<z.ZodString>;
    project_id: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    scope?: string | undefined;
    project_id?: string | undefined;
    limit?: number | undefined;
}, {
    query: string;
    scope?: string | undefined;
    project_id?: string | undefined;
    limit?: number | undefined;
}>;
export declare const saveMemoryInputSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    type: z.ZodEnum<["user", "project", "knowledge", "distilled"]>;
    scope: z.ZodOptional<z.ZodString>;
    project_id: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "user" | "project" | "knowledge" | "distilled";
    title: string;
    content: string;
    scope?: string | undefined;
    source?: string | undefined;
    tags?: string[] | undefined;
    confidence?: number | undefined;
    project_id?: string | undefined;
}, {
    type: "user" | "project" | "knowledge" | "distilled";
    title: string;
    content: string;
    scope?: string | undefined;
    source?: string | undefined;
    tags?: string[] | undefined;
    confidence?: number | undefined;
    project_id?: string | undefined;
}>;
export declare const updateMemoryInputSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["user", "project", "knowledge", "distilled"]>>;
    scope: z.ZodOptional<z.ZodString>;
    project_id: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    append: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type?: "user" | "project" | "knowledge" | "distilled" | undefined;
    scope?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
    confidence?: number | undefined;
    project_id?: string | undefined;
    append?: boolean | undefined;
}, {
    id: string;
    type?: "user" | "project" | "knowledge" | "distilled" | undefined;
    scope?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
    confidence?: number | undefined;
    project_id?: string | undefined;
    append?: boolean | undefined;
}>;
export declare function startMcpServer(): Promise<void>;
//# sourceMappingURL=server.d.ts.map