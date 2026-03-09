export type SlideType =
    | 'COVER'
    | 'REGIONAL_KPI'
    | 'PARAM_HEADER'
    | 'TOP10_GROWTH'
    | 'TOP10_GROWTH_PCT'
    | 'BOTTOM10_GROWTH'
    | 'BOTTOM10_GROWTH_PCT'
    | 'CUSTOM_TEXT';

export interface SlideConfig {
    id: string;
    type: SlideType;
    order: number;
    visible: boolean;
    parameterName?: string;
    title?: string;
    notes?: string;
    customContent?: {
        heading: string;
        body: string;
        highlightColor?: string;
    };
    annotation?: string;
}
