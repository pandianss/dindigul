import ReactECharts from "echarts-for-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";

type ChartType = "line" | "bar" | "area" | "pie" | "heatmap";

interface Props {
    type: ChartType;
    dataset: any[];
    xKey: string;
    yKey: string;
    height?: number;
    title?: string;
}

const COLORS = ['#2563eb', '#fbbf24', '#0d9488', '#dc2626', '#8b5cf6'];

export default function ChartContainer({
    type,
    dataset,
    xKey,
    yKey,
    height = 300,
    title
}: Props) {
    if (type === "heatmap") {
        const option = {
            title: { text: title, textStyle: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a' } },
            tooltip: { position: 'top' },
            grid: { height: '70%', top: '15%' },
            xAxis: { type: "category", data: [...new Set(dataset.map(d => d[xKey]))] },
            yAxis: { type: "category", data: [...new Set(dataset.map(d => d.category))] },
            visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: '0%' },
            series: [
                {
                    name: title,
                    type: "heatmap",
                    data: dataset.map(d => [d[xKey], d.category, d[yKey]]),
                    label: { show: true },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
                },
            ],
        };

        return <ReactECharts option={option} style={{ height }} />;
    }

    return (
        <div className="card p-6">
            {title && <h3 className="text-sm font-bold text-bank-navy mb-4 uppercase tracking-wider">{title}</h3>}
            <div style={{ width: '100%', height: height }}>
                <ResponsiveContainer>
                    {type === "line" && (
                        <LineChart data={dataset}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    )}

                    {type === "bar" && (
                        <BarChart data={dataset}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey={yKey} fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    )}

                    {type === "area" && (
                        <AreaChart data={dataset}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey={yKey} stroke="#2563eb" fill="#dbeafe" />
                        </AreaChart>
                    )}

                    {type === "pie" && (
                        <PieChart>
                            <Pie
                                data={dataset}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey={yKey}
                                nameKey={xKey}
                                label
                            >
                                {dataset.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

