import matter from 'gray-matter';
export function memoryToMarkdown(memory) {
    const frontmatter = {
        id: memory.id,
        type: memory.type,
        scope: memory.scope,
        created_at: memory.createdAt.toISOString(),
        updated_at: memory.updatedAt.toISOString(),
        source: memory.source,
        tags: memory.tags,
        confidence: memory.confidence,
        ...(memory.summary && { summary: memory.summary }),
        ...(memory.entities && memory.entities.length > 0 && { entities: memory.entities }),
    };
    const lines = [
        '---',
        stringifyFrontmatter(frontmatter),
        '---',
        '',
        `# ${memory.title}`,
        '',
        memory.content,
    ];
    return lines.join('\n');
}
export function memoryFromMarkdown(id, raw) {
    const parsed = matter(raw);
    const fm = parsed.data;
    const lines = parsed.content.split('\n');
    const titleIndex = lines.findIndex((line) => line.startsWith('# '));
    const title = titleIndex >= 0 ? lines[titleIndex].replace(/^#\s*/, '') : 'Untitled';
    const content = titleIndex >= 0
        ? lines.slice(titleIndex + 1).join('\n').trim()
        : parsed.content.trim();
    return {
        id: fm.id ?? id,
        type: (fm.type ?? 'knowledge'),
        scope: fm.scope ?? 'global',
        title,
        content,
        createdAt: parseDate(fm.created_at),
        updatedAt: parseDate(fm.updated_at),
        source: fm.source ?? 'manual',
        tags: fm.tags ?? [],
        confidence: fm.confidence ?? 1.0,
        ...(fm.summary !== undefined && { summary: fm.summary }),
        ...(fm.entities !== undefined && { entities: fm.entities }),
    };
}
export function sessionToMarkdown(session) {
    const frontmatter = {
        id: session.id,
        project_id: session.projectId,
        created_at: session.createdAt.toISOString(),
        processed: false,
    };
    const lines = [
        '---',
        stringifyFrontmatter(frontmatter),
        '---',
        '',
        '# Session Log',
        '',
        ...session.messages.map((m) => `## ${m.role} (${m.timestamp.toISOString()})\n\n${m.content}`),
    ];
    return lines.join('\n\n');
}
export function parseSessionFromMarkdown(id, raw) {
    const parsed = matter(raw);
    const fm = parsed.data;
    const content = parsed.content.replace(/^#\s*.*\n?/, '').trim();
    const messageBlocks = content
        .split(/\n## /)
        .map((b) => b.trim())
        .filter((b) => b.length > 0 && ['user', 'assistant', 'system'].includes(b.split(' ')[0]?.toLowerCase() ?? ''));
    const messages = messageBlocks.map((block) => {
        const [header, ...bodyParts] = block.split('\n\n');
        const role = header.split(' ')[0]?.toLowerCase() ?? 'unknown';
        const timestampMatch = header.match(/\(([^)]+)\)/);
        return {
            role,
            content: bodyParts.join('\n\n').trim(),
            timestamp: parseDate(timestampMatch?.[1]),
        };
    });
    return {
        id: fm.id ?? id,
        projectId: fm.project_id ?? 'unknown',
        createdAt: parseDate(fm.created_at),
        processed: fm.processed ?? false,
        messages,
    };
}
function stringifyFrontmatter(obj) {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
    if (entries.length === 0)
        return '';
    return entries
        .map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
        }
        return `${key}: ${value}`;
    })
        .join('\n');
}
function parseDate(value) {
    if (!value)
        return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
//# sourceMappingURL=markdown_serializer.js.map