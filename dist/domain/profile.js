export function createUserProfile(partial = {}) {
    return {
        name: partial.name,
        preferences: partial.preferences ?? {},
        rules: partial.rules ?? [],
    };
}
export function createProjectProfile(id, partial = {}) {
    return {
        id,
        name: partial.name ?? id,
        description: partial.description,
        decisions: partial.decisions ?? [],
    };
}
//# sourceMappingURL=profile.js.map