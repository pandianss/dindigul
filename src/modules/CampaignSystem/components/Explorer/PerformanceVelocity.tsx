import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface PerformanceVelocityProps {
    chartData: any[];
}

export const PerformanceVelocity: React.FC<PerformanceVelocityProps> = ({ chartData }) => {
    return (
        <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="font-black text-bank-navy text-lg uppercase tracking-tight">Performance Velocity</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Daily Aggregate Growth</p>
                </div>
                <div className="flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-bank-teal shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                        <span className="text-bank-navy">Daily Achievement</span>
                    </div>
                </div>
            </div>
            <div className="flex-grow min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                        />
                        <RechartsTooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', background: '#fff', padding: '12px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
