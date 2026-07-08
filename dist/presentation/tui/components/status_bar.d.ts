import type { Widgets } from 'neo-blessed';
export interface StatusBarOptions {
    parent: Widgets.Node;
    content?: string;
    noColor?: boolean;
}
export declare function createStatusBar(options: StatusBarOptions): Widgets.BoxElement;
//# sourceMappingURL=status_bar.d.ts.map