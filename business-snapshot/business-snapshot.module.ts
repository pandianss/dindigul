import { Module } from '@nestjs/common';
import { BusinessSnapshotController } from './business-snapshot.controller';
import { MisSnapshotService } from './mis-snapshot.service';
import { MisDqiService } from './mis-dqi.service';
import { MisRuleEngineService } from './mis-rule-engine.service';
import { MisExceptionService } from './mis-exception.service';
import { FactLoaderService } from './services/domain/fact-loader.service';
import { MisFactLoader } from './services/domain/mis-fact-loader.service';
import { SnapshotService } from './snapshot/snapshot.service';
import { ReconciliationService } from './reconciliation.service';
import { KernelModule } from '../kernel/kernel.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [KernelModule, PrismaModule],
    controllers: [BusinessSnapshotController],
    providers: [
        MisSnapshotService,
        MisDqiService,
        MisRuleEngineService,
        MisExceptionService,
        FactLoaderService,
        MisFactLoader,
        SnapshotService,
        ReconciliationService
    ],
    exports: [
        MisSnapshotService,
        MisDqiService,
        MisRuleEngineService,
        MisExceptionService,
        FactLoaderService,
        MisFactLoader,
        SnapshotService,
        ReconciliationService
    ]
})
export class BusinessSnapshotModule { }
