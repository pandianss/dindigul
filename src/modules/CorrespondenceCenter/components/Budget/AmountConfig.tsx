import React from 'react';
import { Upload } from 'lucide-react';

interface AmountConfigProps {
    strategy: 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED';
    amounts: Record<string, number>;
    setAmounts: (amounts: Record<string, number>) => void;
    allotmentFile: File | null;
    setAllotmentFile: (file: File | null) => void;
}

export const AmountConfig: React.FC<AmountConfigProps> = ({
    strategy,
    amounts,
    setAmounts,
    allotmentFile,
    setAllotmentFile
}) => {
    return (
        <div className="space-y-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">3. Configure Amounts</label>
            
            {strategy === 'UPLOAD_BASED' ? (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Upload Excel with "Branch Code" and "Amount" columns.</p>
                    <input 
                        type="file" 
                        id="budget-upload" 
                        className="hidden" 
                        onChange={(e) => setAllotmentFile(e.target.files?.[0] || null)}
                        accept=".xlsx,.xls,.csv"
                    />
                    <label 
                        htmlFor="budget-upload" 
                        className="flex flex-col items-center justify-center cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center hover:border-bank-teal/30 hover:bg-bank-teal/5 transition-all group"
                    >
                        <Upload className={`mb-3 transition-transform group-hover:-translate-y-1 ${allotmentFile ? 'text-bank-teal' : 'text-gray-300'}`} size={32} />
                        <span className="text-sm font-bold text-bank-navy">
                            {allotmentFile ? allotmentFile.name : 'Select Data File...'}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">.xlsx, .xls or .csv</span>
                    </label>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {(strategy === 'SIZE_BASED' 
                        ? ['Small', 'Medium', 'Large', 'Very Large', 'Extra Large'] 
                        : ['RURAL', 'SEMI-URBAN', 'URBAN', 'METRO']
                    ).map(key => (
                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                            <span className="text-sm font-bold text-gray-600">{key}</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                <input 
                                    type="number" 
                                    value={amounts[key] || 0}
                                    onChange={(e) => setAmounts({...amounts, [key]: parseInt(e.target.value) || 0})}
                                    className="w-32 bg-white border-gray-200 rounded-lg text-right pr-3 pl-7 py-1 text-sm font-bold text-bank-navy"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
