import type { Widgets } from 'neo-blessed';
export interface ModalOptions {
    parent: Widgets.Node;
    title: string;
    message: string;
    actionLabels: string[];
    onAction: (index: number) => void;
}
export declare function createModal(options: ModalOptions): Widgets.BoxElement;
//# sourceMappingURL=modal.d.ts.map