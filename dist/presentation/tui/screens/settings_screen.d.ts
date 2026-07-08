import { TuiScreen } from '../tui_screen.js';
export declare class SettingsScreen extends TuiScreen {
    private form;
    private config;
    get name(): string;
    mount(): Promise<void>;
    unmount(): void;
    render(): void;
    handleGlobalKey(key: string): boolean;
    private attachKeys;
    private save;
}
//# sourceMappingURL=settings_screen.d.ts.map