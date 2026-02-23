import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MisParameter } from '../../../prisma/enums';

@Injectable()
export class MisFactLoader {
    constructor(private prisma: PrismaService) { }

    async loadFactsFromStaging(businessDate: Date): Promise<Record<string, any>> {
        // 1. Aggregate Financials
        const unitAggregates = await this.aggregateFinancials(businessDate);

        // 2. Aggregate Portfolio
        const portfolioAggregates = await this.aggregatePortfolio(businessDate);

        return { unitAggregates, portfolioAggregates };
    }

    private async aggregateFinancials(businessDate: Date) {
        const unitAggregates: Record<string, any> = {};

        // a. Unit-wise
        const unitFinancials = await this.prisma.stgUnitFinancialsDaily.findMany({ where: { businessDate } });
        for (const uf of unitFinancials) {
            const sb = Number(uf.sbBalance || 0);
            const cd = Number(uf.cdBalance || 0);
            const td = Number(uf.tdBalance || 0);
            const adv = Number(uf.advBalance || 0);
            unitAggregates[uf.unitCode] = {
                sb, cd, td, adv,
                deposit: sb + cd + td,
                casa: sb + cd,
                bus: sb + cd + td + adv
            };
        }

        // b. Account-level Supplement
        const accounts = await this.prisma.stgAccountDaily.findMany({ where: { businessDate } });
        for (const acc of accounts) {
            if (!unitAggregates[acc.unitCode]) {
                unitAggregates[acc.unitCode] = { deposit: 0, casa: 0, sb: 0, cd: 0, td: 0, adv: 0, bus: 0 };
            }
            // Logic: if unit not in 'unitFinancials', use account rollups
            const unitHasTotals = unitFinancials.some(uf => uf.unitCode === acc.unitCode);
            if (!unitHasTotals) {
                // Additive logic
                const u = unitAggregates[acc.unitCode];
                u.deposit += Number(acc.balance);
                u.sb += Number(acc.sbBalance || 0);
                u.cd += Number(acc.cdBalance || 0);
                u.td += Number(acc.tdBalance || 0);
                u.adv += Number(acc.advBalance || 0);
                u.bus += Number(acc.busBalance || 0);
                u.casa += Number(acc.casaBalance || 0);
            }
        }
        return unitAggregates;
    }

    private async aggregatePortfolio(businessDate: Date) {
        const portfolioAggregates: Record<string, any> = {};
        const portfolioData = await this.prisma.stgUserVerticalDaily.findMany({ where: { businessDate } });

        for (const row of portfolioData) {
            if (!portfolioAggregates[row.unitCode]) {
                portfolioAggregates[row.unitCode] = { retail: 0, sme: 0, agri: 0, other: 0, sma0: 0, sma1: 0, sma2: 0 };
            }
            const agg = portfolioAggregates[row.unitCode];
            const bal = Number(row.outstanding);
            const vert = (row.vertical || '').toUpperCase();

            if (vert.includes('RETAIL')) agg.retail += bal;
            else if (vert.includes('SME')) agg.sme += bal;
            else if (vert.includes('AGRI')) agg.agri += bal;
            else agg.other += bal;

            const sma = (row.smaType || '').toUpperCase();
            if (sma === 'SMA0') agg.sma0 += bal;
            else if (sma === 'SMA1') agg.sma1 += bal;
            else if (sma === 'SMA2') agg.sma2 += bal;
        }
        return portfolioAggregates;
    }
}
