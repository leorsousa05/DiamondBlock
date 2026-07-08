import type { Widgets } from 'neo-blessed';
import type { Container } from '../../container.js';
import type { TuiApplication } from './tui_application.js';
export interface TuiScreenContext {
    app: TuiApplication;
    container: Container;
    screen: Widgets.Screen;
}
export declare abstract class TuiScreen {
    protected readonly context: TuiScreenContext;
    readonly root: Widgets.BoxElement;
    private _params;
    constructor(context: TuiScreenContext);
    abstract get name(): string;
    abstract mount(): void;
    abstract unmount(): void;
    abstract render(): void;
    show(): void;
    hide(): void;
    setParams(params: Record<string, unknown>): void;
    protected get params(): Record<string, unknown>;
    protected clear(): void;
    protected createRoot(): Widgets.BoxElement;
    handleGlobalKey(_key: string): boolean;
}
//# sourceMappingURL=tui_screen.d.ts.map