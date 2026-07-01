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

export function createUserProfile(partial: Partial<UserProfile> = {}): UserProfile {
  return {
    name: partial.name,
    preferences: partial.preferences ?? {},
    rules: partial.rules ?? [],
  };
}

export function createProjectProfile(id: string, partial: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id,
    name: partial.name ?? id,
    description: partial.description,
    decisions: partial.decisions ?? [],
  };
}
