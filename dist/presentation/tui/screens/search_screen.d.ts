import { TuiScreen } from '../tui_screen.js';
export declare class SearchScreen extends TuiScreen {
    private query;
    private results;
    private input;
    private resultList;
    get name(): string;
    mount(): void;
    unmount(): void;
    render(): void;
    handleGlobalKey(key: string): boolean;
    private search;
}
//# sourceMappingURL=search_screen.d.ts.map