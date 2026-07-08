import { TuiScreen } from '../tui_screen.js';
export declare class SessionsScreen extends TuiScreen {
    private sessions;
    private list;
    get name(): string;
    mount(): Promise<void>;
    unmount(): void;
    render(): void;
    handleGlobalKey(key: string): boolean;
    private loadSessions;
    private distill;
}
//# sourceMappingURL=sessions_screen.d.ts.map