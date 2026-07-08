import { TuiScreen } from '../tui_screen.js';
export declare class MemoryEditScreen extends TuiScreen {
    private form;
    private mode;
    private memoryId?;
    get name(): string;
    mount(): Promise<void>;
    unmount(): void;
    render(): Promise<void>;
    handleGlobalKey(key: string): boolean;
    private attachKeys;
    private buildFields;
    private save;
}
//# sourceMappingURL=memory_edit_screen.d.ts.map