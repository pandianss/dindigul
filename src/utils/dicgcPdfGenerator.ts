import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { DicgcReturnData } from '../types/dicgc';

/**
 * Generates a professional PDF for the DICGC Return
 */
export const generateDicgcPdf = (data: DicgcReturnData) => {
    const doc = new jsPDF() as any;
    const { header, di01, item13, format1, assessment } = data;
    const locale = 'en-IN';

    // ── Header Styling ────────────────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setTextColor(33, 53, 127); // Bank Navy
    doc.text('DICGC Statutory Return', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Return for Half-Year: 1st HY FY 2026-27`, 14, 28);
    doc.text(`Regional Office: ${header.regionalOfficeName}`, 14, 33);
    doc.text(`Reporting Date: ${new Date(header.returnDate).toLocaleDateString('en-GB')}`, 14, 38);
    doc.text(`Generated On: ${new Date().toLocaleString('en-GB')}`, 14, 43);

    doc.setDrawColor(200);
    doc.line(14, 47, 196, 47);

    // ── FORM DI-01 Table ──────────────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setTextColor(33, 53, 127);
    doc.text('FORM DI-01: Statement of Deposits', 14, 57);

    const di01Rows = [
        ['ITEM 1', 'Total Deposits', di01.item1.toLocaleString(locale)],
        ['Deductions', '1a: Foreign Government Deposits', di01.item1a.toLocaleString(locale)],
        ['', '1b: Central Government Deposits', di01.item1b.toLocaleString(locale)],
        ['', '1c: State Government Deposits', di01.item1c.toLocaleString(locale)],
        ['', '1d: Inter-Bank Deposits', di01.item1d.toLocaleString(locale)],
        ['', '1e: Specifically Exempted Deposits', di01.item1e.toLocaleString(locale)],
        ['ITEM 2', 'Other Balances due to Depositors', di01.item2.toLocaleString(locale)],
        ['ITEM 3', 'Assessable Deposits (Net)', di01.item3.toLocaleString(locale)],
        ['ITEM 4', 'Sundry Creditors (Related to Deposits)', di01.item4.toLocaleString(locale)],
        ['ITEM 5', 'Demand Drafts (Unpaid)', di01.item5.toLocaleString(locale)],
        ['ITEM 6', 'Local Authorities & Quasi Gov Bodies', di01.item6.toLocaleString(locale)],
        ['ITEM 7', 'Autonomous/Statutory/Gov Corp Deposits', di01.item7.toLocaleString(locale)],
        ['ITEM 8', 'Security Deposits (Gov Depts)', di01.item8.toLocaleString(locale)],
        ['ITEM 9', 'Gov & Embassy Officials (Individual)', di01.item9.toLocaleString(locale)],
        ['ITEM 10', 'Overdue & Unclaimed Deposits', di01.item10.toLocaleString(locale)],
        ['ITEM 11', 'Interest Accrued and Payable', di01.item11.toLocaleString(locale)],
        ['ITEM 12', 'Interest Accrued on all Deposits', di01.item12.toLocaleString(locale)],
    ];

    doc.autoTable({
        startY: 63,
        head: [['Code', 'Description', "Amount (₹ '000)"]],
        body: di01Rows,
        theme: 'striped',
        headStyles: { fillColor: [33, 53, 127], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 20 },
            2: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // ── Item 13: Category Breakdown ───────────────────────────────────────────
    const item13StartY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(33, 53, 127);
    doc.text('ITEM 13: Break-up of Assessable Deposits', 14, item13StartY);

    const item13Rows = [
        [item13.bracket1.bracket, item13.bracket1.accountCount.toLocaleString(locale), item13.bracket1.amount.toLocaleString(locale)],
        [item13.bracket2.bracket, item13.bracket2.accountCount.toLocaleString(locale), item13.bracket2.amount.toLocaleString(locale)],
        [item13.bracket3.bracket, item13.bracket3.accountCount.toLocaleString(locale), item13.bracket3.amount.toLocaleString(locale)],
        [item13.bracket4.bracket, item13.bracket4.accountCount.toLocaleString(locale), item13.bracket4.amount.toLocaleString(locale)],
        [{ content: 'Total Assessable Deposits (Sum of Brackets)', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (item13.bracket1.amount + item13.bracket2.amount + item13.bracket3.amount + item13.bracket4.amount).toLocaleString(locale), styles: { fontStyle: 'bold' } }]
    ];

    doc.autoTable({
        startY: item13StartY + 6,
        head: [['Category Bracket', 'No. of Accounts', "Amount (₹ '000)"]],
        body: item13Rows,
        theme: 'grid',
        headStyles: { fillColor: [0, 168, 150], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // ── Assessment Section ──────────────────────────────────────────────
    if (assessment) {
        const assessmentStartY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(33, 53, 127);
        doc.text('Summary & Payment Assessment', 14, assessmentStartY);

        const assessmentRows = [
            ['Premium Rate', `${assessment.premiumRate} paise per ₹ 100 per half-year`, ''],
            ['Calculated Premium Amount', '', `₹ ${assessment.premiumAmount.toLocaleString(locale, { minimumFractionDigits: 2 })}`],
            ['GST Rate', `${assessment.gstRate}%`, ''],
            ['GST Amount', '', `₹ ${assessment.gstAmount.toLocaleString(locale, { minimumFractionDigits: 2 })}`],
            [{ content: 'Total Amount Payable (Premium + GST)', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: `₹ ${assessment.totalPayable.toLocaleString(locale, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
        ];

        doc.autoTable({
            startY: assessmentStartY + 6,
            head: [['Component', 'Basis', 'Amount (Absolute ₹)']],
            body: assessmentRows,
            theme: 'grid',
            headStyles: { fillColor: [142, 68, 173], fontSize: 9 }, // Purple
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                2: { halign: 'right' }
            }
        });
    }

    // ── FORMAT-1: Sundry Creditors ───────────────────────────────────────────
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(33, 53, 127);
    doc.text('FORMAT-1: Sundry Creditors Detailed Breakdown', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Annexure to Item 4 of DI-01', 14, 25);

    const format1Rows = [
        ['Clearing Difference', format1.clearingDifference.toLocaleString(locale)],
        ['Clearing Next Day', format1.clearingNextDay.toLocaleString(locale)],
        ['Deposits', format1.deposits.toLocaleString(locale)],
        ['ECGC/DICGC Claims', format1.ecgcDicgcClaims.toLocaleString(locale)],
        ['Suit Filed/Court Cases', format1.suitFiledCourt.toLocaleString(locale)],
        ['IT/ST Attachment', format1.itStAttachment.toLocaleString(locale)],
        ['Tax Deducted at Source (TDS)', format1.tds.toLocaleString(locale)],
        ['Excess Cash', format1.excessCash.toLocaleString(locale)],
        ['Vigilance Cases', format1.vigilanceCases.toLocaleString(locale)],
        ['Others (Excluding above categories)', format1.others.toLocaleString(locale)],
        [{ content: 'Total Sum of Sundry Creditors', styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: Object.values(format1).reduce((a,b)=>a+b,0).toLocaleString(locale), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
    ];

    doc.autoTable({
        startY: 32,
        head: [['Category', 'Amount (Standard ₹)']],
        body: format1Rows,
        theme: 'grid',
        headStyles: { fillColor: [211, 84, 0], fontSize: 9 }, // Deep Orange
        bodyStyles: { fontSize: 9 },
        columnStyles: {
            1: { halign: 'right' }
        }
    });

    // ── Footer / Certification ──────────────────────────────────────────────
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Certified that the above particulars are correct as per the records of the bank.', 14, finalY - 5);
    
    doc.text('__________________________', 14, finalY + 15);
    doc.text('Prepared By (Officer)', 14, finalY + 20);
    
    doc.text('__________________________', 140, finalY + 15);
    doc.text('Authorized Signatory (RM/SRM)', 140, finalY + 20);
    doc.text('Seal of the Bank', 140, finalY + 30);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Note: This is an automatically generated statutory return for submission to DICGC.', 14, finalY + 45);

    // ── Download ──────────────────────────────────────────────────────────────
    const filename = `DICGC_Return_DI01_${header.regionalOfficeName.replace(/\s+/g, '_')}_${header.returnDate}.pdf`;
    doc.save(filename);
};
