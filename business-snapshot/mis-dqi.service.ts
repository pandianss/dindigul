
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MisStatus } from '../prisma/enums';

@Injectable()
export class MisDqiService {
    constructor(private prisma: PrismaService) { }

    async calculateScore(snapshotId: string) {
        // Mock DQI Logic
        // In reality: Check completeness of feeds, reconciliation gaps, and hygiene assertions
        const score = 95.0;

        await this.prisma.misDqiScore.create({
            data: {
                snapshotId,
                score,
                breakdown: {
                    reconciliation: 100,
                    timeliness: 90,
                    completeness: 95
                },
                status: 'GREEN'
            }
        });

        // Update Snapshot with Score
        await this.prisma.misSnapshot.update({
            where: { id: snapshotId },
            data: { dqiScore: score }
        });

        return score;
    }
}
