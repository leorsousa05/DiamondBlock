export interface UserProfile {
    name?: string;
    preferences: Record<string, string>;
    rules: string[];
}
export interface ProjectProfile {
    id: string;
    name: string;
    description?: string;
    decisions: string[];
}
export declare function createUserProfile(partial?: Partial<UserProfile>): UserProfile;
export declare function createProjectProfile(id: string, partial?: Partial<ProjectProfile>): ProjectProfile;
//# sourceMappingURL=profile.d.ts.map