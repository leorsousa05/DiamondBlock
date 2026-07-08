import type { Widgets } from 'neo-blessed';
export interface FormField {
    name: string;
    label: string;
    value?: string;
    multiline?: boolean;
}
export interface FormOptions {
    parent: Widgets.Node;
    fields: FormField[];
    onSubmit?: () => void;
    onCancel?: () => void;
}
export interface TuiForm {
    root: Widgets.BoxElement;
    fields: Map<string, Widgets.BoxElement>;
    labels: Map<string, Widgets.TextElement>;
    focus: () => void;
    focusNext: () => void;
    getValues: () => Record<string, string>;
}
export declare function createForm(options: FormOptions): TuiForm;
//# sourceMappingURL=form.d.ts.map