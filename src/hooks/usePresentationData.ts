import { useState, useCallback } from 'react';
import api from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import type { SlideConfig } from '../types/presentation';

export interface BranchPanelRow {
    branchCode: string;
    branchName: string;
    parameter: string;
    displayName: string;
    val_current: number;
    val_fy_start: number;
    growth_fy: number;
    growth_fy_pct: number;
    growth_month: number;
    budget_month: number;
    gap_month: number;
    status: string;
}

export interface ParameterRanking {
    parameterName: string;
    displayName: string;
    category: string;
    regionalTotal: number;
    regionalGrowthFy: number;
    top10ByGrowth: BranchPanelRow[];
    top10ByGrowthPct: BranchPanelRow[];
    bottom10ByGrowth: BranchPanelRow[];
    bottom10ByGrowthPct: BranchPanelRow[];
}

export interface RegionalKPI {
    parameterName: string;
    displayName: string;
    total: number;
    growthFy: number;
    growthFyPct: number;
}

export interface PresentationData {
    date: string;
    period: string;
    branchCount: number;
    kpis: RegionalKPI[];
    rankings: ParameterRanking[];
}

// "Better Low" parameters: lower value = better (NPA, expense, cost)
const BETTER_LOW = ['NPA', 'EXPENSE', 'COST', 'PROVISION'];
const isBetterLow = (paramName: string) =>
    BETTER_LOW.some(k => paramName.toUpperCase().includes(k));

export function usePresentationData() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PresentationData | null>(null);

    const load = useCallback(async (date: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/mis/regional-panel?date=${date}`);
            const raw = res.data;

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const d = new Date(date);
            const period = `${months[d.getMonth()]} ${d.getFullYear()}`;

            // Build per-parameter rankings
            const rankings: ParameterRanking[] = [];

            for (const paramMeta of raw.parameters) {
                const { parameterName, displayName, category } = paramMeta;
                const betterLow = isBetterLow(parameterName);

                // Collect all branch rows for this parameter
                const rows: BranchPanelRow[] = [];
                for (const branch of raw.branches) {
                    const panel = branch.panelData.find((p: any) => p.parameter === parameterName);
                    if (!panel) continue;
                    const fyStart = panel.val_fy_start;
                    const growthFyPct = fyStart !== 0 ? (panel.growth_fy / fyStart) * 100 : 0;
                    rows.push({
                        branchCode: branch.branchCode,
                        branchName: branch.branchName,
                        parameter: parameterName,
                        displayName,
                        val_current: panel.val_current,
                        val_fy_start: fyStart,
                        growth_fy: panel.growth_fy,
                        growth_fy_pct: growthFyPct,
                        growth_month: panel.growth_month,
                        budget_month: panel.budget_month,
                        gap_month: panel.gap_month,
                        status: panel.status,
                    });
                }

                if (rows.length === 0) continue;

                // For "better low" metrics, the top performers have the most negative growth (reduced NPA)
                const sortGrowth = betterLow
                    ? [...rows].sort((a, b) => a.growth_fy - b.growth_fy)       // most reduced first
                    : [...rows].sort((a, b) => b.growth_fy - a.growth_fy);      // most grown first

                const sortGrowthPct = betterLow
                    ? [...rows].sort((a, b) => a.growth_fy_pct - b.growth_fy_pct)
                    : [...rows].sort((a, b) => b.growth_fy_pct - a.growth_fy_pct);

                const regional = raw.regionalTotals[parameterName] || { total: 0, fyStart: 0, growthFy: 0 };

                rankings.push({
                    parameterName,
                    displayName,
                    category,
                    regionalTotal: regional.total,
                    regionalGrowthFy: regional.growthFy,
                    top10ByGrowth: sortGrowth.slice(0, 10),
                    top10ByGrowthPct: sortGrowthPct.slice(0, 10),
                    bottom10ByGrowth: sortGrowth.slice(-10).reverse(),
                    bottom10ByGrowthPct: sortGrowthPct.slice(-10).reverse(),
                });
            }

            // KPI slides: key parameters only
            const KEY_PARAMS = ['Total Dep', 'Adv', 'NPA', 'CASA', 'CASA%', 'CD_Ratio', 'Bus', 'Gold'];
            const kpis: RegionalKPI[] = Object.entries(raw.regionalTotals)
                .filter(([k]) => KEY_PARAMS.includes(k))
                .map(([k, v]: any) => ({
                    parameterName: k,
                    displayName: v.displayName,
                    total: v.total,
                    growthFy: v.growthFy,
                    growthFyPct: v.fyStart !== 0 ? (v.growthFy / v.fyStart) * 100 : 0,
                }))
                .sort((a, b) => KEY_PARAMS.indexOf(a.parameterName) - KEY_PARAMS.indexOf(b.parameterName));

            setData({ date, period, branchCount: raw.branchCount, kpis, rankings });
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to load regional data');
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, data, load };
}

// ── Slide generation ──────────────────────────────────────────────────────────

export function generateDefaultSlides(data: PresentationData): SlideConfig[] {
    const slides: SlideConfig[] = [];
    let order = 0;

    // 1. Cover
    slides.push({ id: uuidv4(), type: 'COVER', order: order++, visible: true });

    // 2. Regional KPI summary
    slides.push({ id: uuidv4(), type: 'REGIONAL_KPI', order: order++, visible: true });

    // 3. Per parameter: header + 4 ranking slides
    for (const r of data.rankings) {
        slides.push({ id: uuidv4(), type: 'PARAM_HEADER', order: order++, visible: true, parameterName: r.parameterName });
        slides.push({ id: uuidv4(), type: 'TOP10_GROWTH', order: order++, visible: true, parameterName: r.parameterName });
        slides.push({ id: uuidv4(), type: 'TOP10_GROWTH_PCT', order: order++, visible: true, parameterName: r.parameterName });
        slides.push({ id: uuidv4(), type: 'BOTTOM10_GROWTH', order: order++, visible: true, parameterName: r.parameterName });
        slides.push({ id: uuidv4(), type: 'BOTTOM10_GROWTH_PCT', order: order++, visible: true, parameterName: r.parameterName });
    }

    // 4. Closing
    slides.push({
        id: uuidv4(), type: 'CUSTOM_TEXT', order: order++, visible: true,
        customContent: { heading: 'Thank You', body: 'Dindigul Regional Office\nIndian Overseas Bank' }
    });

    return slides;
}
