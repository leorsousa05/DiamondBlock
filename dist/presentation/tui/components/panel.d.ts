import type { Widgets } from 'neo-blessed';
export interface PanelOptions {
    parent: Widgets.Node;
    title?: string;
    width?: string | number;
    height?: string | number;
    left?: string | number;
    top?: string | number;
    focused?: boolean;
}
export declare function createPanel(options: PanelOptions): Widgets.BoxElement;
//# sourceMappingURL=panel.d.ts.map