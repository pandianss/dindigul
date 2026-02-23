import { Controller, Get, Param, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { MisSnapshotService } from './mis-snapshot.service';
import { MisDqiService } from './mis-dqi.service';
import { MisExceptionService } from './mis-exception.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateSnapshotDto } from './dto/generate-snapshot.dto';
import { FactLoaderService } from './services/domain/fact-loader.service';
import { SnapshotService } from './snapshot/snapshot.service';
import { ReconciliationService } from './reconciliation.service';


@Controller('mis')
export class BusinessSnapshotController {
    constructor(
        private snapshotService: MisSnapshotService, // Original
        private dqiService: MisDqiService,
        private exceptionService: MisExceptionService,
        private factLoader: FactLoaderService,
        private coreSnapshot: SnapshotService, // New 
        private reconService: ReconciliationService
    ) { }

    @Post('reconcile/batch/:batchId')
    @UseGuards(JwtAuthGuard)
    async reconcileBatch(@Param('batchId') batchId: string) {
        return this.reconService.reconcileBatch(batchId);
    }

    @Post('reconcile/snapshot/:snapshotId')
    @UseGuards(JwtAuthGuard)
    async reconcileSnapshot(@Param('snapshotId') snapshotId: string) {
        return this.reconService.reconcileSnapshot(snapshotId);
    }

    @Post('snapshot/create')
    @UseGuards(JwtAuthGuard)
    async createFullSnapshot(@Body() body: { date: string, frequency: string }) {
        const date = new Date(body.date);
        const freq = body.frequency as any;
        return this.coreSnapshot.createSnapshot(date, freq);
    }

    @Post('load-from-run/:runId')
    @UseGuards(JwtAuthGuard)
    async loadFromRun(@Param('runId') runId: string) {
        return this.factLoader.loadFromRun(runId);
    }

    @Post('snapshot/:unitCode')
    @UseGuards(JwtAuthGuard)
    async generateSnapshot(
        @Param('unitCode') unitCode: string,
        @Body() dto: GenerateSnapshotDto
    ) {
        // 1. Create Provisional
        const snapshot = await this.snapshotService.createProvisionalSnapshot(unitCode, dto.date);

        // 2. Compute DQI
        await this.dqiService.calculateScore(snapshot.id);

        return snapshot;
    }

    @UseGuards(JwtAuthGuard)
    @Post('generate-from-staging')
    async generateFromStaging(
        @Body() dto: GenerateSnapshotDto,
        @Request() req: any
    ) {
        return this.snapshotService.generateFromStaging(dto.date, req.user.id);
    }

    @Get('readiness/:unitCode')
    async getReadiness(
        @Param('unitCode') unitCode: string,
        @Query('date') date: string
    ) {
        return this.snapshotService.getIngestionStatus(unitCode, date);
    }

    @Get('snapshot/:unitCode')
    async getSnapshot(
        @Param('unitCode') unitCode: string,
        @Query('date') date: string
    ) {
        return this.snapshotService.getSnapshot(unitCode, date);
    }

    @Post('freeze/:snapshotId')
    @UseGuards(JwtAuthGuard)
    async freezeSnapshot(@Param('snapshotId') snapshotId: string) {
        return this.snapshotService.freezeSnapshot(snapshotId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('exceptions')
    async getExceptions(@Query('unitId') unitId: string, @Query('status') status: string) {
        return this.exceptionService.getExceptions(unitId, status);
    }

    @UseGuards(JwtAuthGuard)
    @Post('exceptions/:id/acknowledge')
    async acknowledgeException(@Param('id') id: string, @Request() req: any) {
        return this.exceptionService.acknowledgeException(id, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('exceptions/:id/resolve')
    async resolveException(@Param('id') id: string, @Body('note') note: string, @Request() req: any) {
        return this.exceptionService.resolveException(id, req.user.id, note);
    }
}
