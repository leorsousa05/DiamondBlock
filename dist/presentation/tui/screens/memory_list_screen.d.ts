import { TuiScreen } from '../tui_screen.js';
export declare class MemoryListScreen extends TuiScreen {
    private memories;
    private selectedMemory;
    private list;
    private preview;
    get name(): string;
    mount(): Promise<void>;
    unmount(): void;
    render(): void;
    handleGlobalKey(key: string): boolean;
    private loadMemories;
    private updatePreview;
    private deleteSelected;
}
//# sourceMappingURL=memory_list_screen.d.ts.map