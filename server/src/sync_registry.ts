import prisma from './lib/prisma';
import { MetricMapper } from './infra/MetricMapper';

async function syncRegistry() {
    const allCodes = MetricMapper.getAllMetricCodes();
    console.log(`Syncing ${allCodes.length} parameters to registry...`);

    const groupings: Record<string, string> = {
        'SB': 'DEPOSITS', 'CD': 'DEPOSITS', 'TD': 'DEPOSITS', 'Total Dep': 'DEPOSITS', 'Bulk_Dep': 'DEPOSITS', 'CASA': 'DEPOSITS',
        'Adv': 'ADVANCES', 'NPA': 'ADVANCES', 'Mudra': 'ADVANCES', 'Agri_JL': 'ADVANCES', 'RETAIL_JL': 'ADVANCES',
        'Gold': 'ADVANCES', 'HL': 'ADVANCES', 'VL': 'ADVANCES', 'PersonalLoan': 'ADVANCES', 'Mort': 'ADVANCES',
        'EL': 'ADVANCES', 'Liq': 'ADVANCES', 'OthRet': 'ADVANCES', 'Core Ret': 'ADVANCES', 'MSME': 'ADVANCES',
        'SHG': 'ADVANCES', 'KCC': 'ADVANCES', 'Gov': 'ADVANCES', 'OthSch': 'ADVANCES', 'Core_Agri': 'ADVANCES',
        'Core Adv': 'ADVANCES',
        'CASH_HAND': 'CASH', 'CASH_ATM': 'CASH', 'CASH_BC': 'CASH', 'CASH_BNA': 'CASH', 'CASH_TOTAL': 'CASH',
        'CASH_CRL': 'CASH', 'CASH_EXCESS': 'CASH',
        'Branch_PL': 'PROFITABILITY', 'REC_Q1': 'RECOVERY', 'REC_Q2': 'RECOVERY', 'REC_Q3': 'RECOVERY', 'REC_Q4': 'RECOVERY',
        'Recovery': 'RECOVERY',
        'Bus': 'BUSINESS', 'CD_Ratio': 'RATIO', 'CASA_PCT': 'RATIO', 'Ret_TD': 'DEPOSITS', 'Bus_Per_Employee': 'RATIO'
    };

    const parents: Record<string, string> = {
        'SHG': 'Core_Agri', 'KCC': 'Core_Agri', 'Gov': 'Core_Agri', 'OthSch': 'Core_Agri',
        'Mudra': 'MSME',
        'Agri_JL': 'Gold', 'RETAIL_JL': 'Gold',
        'PersonalLoan': 'Core Ret', 'Mort': 'Core Ret', 'EL': 'Core Ret', 'Liq': 'Core Ret', 'OthRet': 'Core Ret', 'HL': 'Core Ret', 'VL': 'Core Ret',
        'Core_Agri': 'Adv', 'Core Ret': 'Adv', 'MSME': 'Adv', 'Gold': 'Adv',
        'SB': 'Total Dep', 'CD': 'Total Dep', 'TD': 'Total Dep',
        'Adv': 'Bus', 'Total Dep': 'Bus'
    };

    for (const code of allCodes) {
        const category = groupings[code] || 'OTHER';
        const parent = parents[code] || null;
        await prisma.misParameterRegistry.upsert({
            where: { parameterName: code },
            update: { isEnabled: true, category, parentParameterName: parent },
            create: {
                parameterName: code,
                displayName: code.replace(/_/g, ' '),
                category,
                isEnabled: true,
                parentParameterName: parent
            }
        });
    }

    // Disable legacy ones that don't match codes
    const legacy = ['TOTAL_DEPOSITS', 'TOTAL_ADVANCES', 'TOTAL_BUSINESS', 'TOTAL_RECOVERY', 'CASA_RATIO', 'GROSS_NPA'];
    await prisma.misParameterRegistry.updateMany({
        where: { parameterName: { in: legacy } },
        data: { isEnabled: false }
    });

    console.log('Registry synced successfully.');
}

syncRegistry()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
