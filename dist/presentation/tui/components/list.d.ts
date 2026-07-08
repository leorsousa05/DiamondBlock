import type { Widgets } from 'neo-blessed';
export interface TuiListColumn<T> {
    header: string;
    width: number;
    render: (item: T) => string;
}
export interface TuiListOptions<T> {
    parent: Widgets.Node;
    columns: TuiListColumn<T>[];
    items: T[];
    onSelect?: (item: T, index: number) => void;
}
export declare function createList<T>(options: TuiListOptions<T>): Widgets.ListElement;
//# sourceMappingURL=list.d.ts.map