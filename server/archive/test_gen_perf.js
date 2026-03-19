
const { BusinessSnapshotService } = require('./dist/services/BusinessSnapshotService');

async function testPerf() {
    console.time('Generation');
    try {
        const result = await BusinessSnapshotService.generateFromStaging('2026-03-16');
        console.log('Result:', result);
    } catch (err) {
        console.error('Error:', err);
    }
    console.timeEnd('Generation');
}

testPerf().then(() => process.exit());
