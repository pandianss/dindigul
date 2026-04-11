import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { DicgcReturnData } from '../types/dicgc';

/**
 * Generates a professional PDF for the DICGC Return
 */
export const generateDicgcPdf = (data: DicgcReturnData) => {
    const doc = new jsPDF() as any;
    const { header, di01, item13, format1 } = data;

    // ── Header Styling ────────────────────────────────────────────────────────
    doc.setFontSize(20);
    doc.setTextColor(33, 53, 127); // Bank Navy
    doc.text('DICGC Statutory Return', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Regional Office: ${header.regionalOfficeName}`, 14, 28);
    doc.text(`Reporting Date: ${new Date(header.returnDate).toLocaleDateString('en-GB')}`, 14, 33);
    doc.text(`Generated On: ${new Date().toLocaleString('en-GB')}`, 14, 38);

    doc.setDrawColor(200);
    doc.line(14, 42, 196, 42);

    // ── FORM DI-01 Table ──────────────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setTextColor(33, 53, 127);
    doc.text('FORM DI-01: Statement of Deposits', 14, 52);

    const di01Rows = [
        ['ITEM 1', 'Total Deposits', `Rs. ${di01.item1.toLocaleString()}`],
        ['Deductions', '1a: Foreign Government Deposits', `Rs. ${di01.item1a.toLocaleString()}`],
        ['', '1b: Central Government Deposits', `Rs. ${di01.item1b.toLocaleString()}`],
        ['', '1c: State Government Deposits', `Rs. ${di01.item1c.toLocaleString()}`],
        ['', '1d: Inter-Bank Deposits', `Rs. ${di01.item1d.toLocaleString()}`],
        ['', '1e: Specifically Exempted Deposits', `Rs. ${di01.item1e.toLocaleString()}`],
        ['ITEM 2', 'Other Balances due to Depositors', `Rs. ${di01.item2.toLocaleString()}`],
        ['ITEM 3', 'Assessable Deposits (Net)', `Rs. ${di01.item3.toLocaleString()}`],
        ['ITEM 4', 'Sundry Creditors (Related to Deposits)', `Rs. ${di01.item4.toLocaleString()}`],
        ['ITEM 5', 'Demand Drafts (Unpaid)', `Rs. ${di01.item5.toLocaleString()}`],
        ['ITEM 6', 'Local Authorities & Quasi Gov Bodies', `Rs. ${di01.item6.toLocaleString()}`],
        ['ITEM 7', 'Autonomous/Statutory/Gov Corp Deposits', `Rs. ${di01.item7.toLocaleString()}`],
        ['ITEM 8', 'Security Deposits (Gov Depts)', `Rs. ${di01.item8.toLocaleString()}`],
        ['ITEM 9', 'Gov & Embassy Officials (Individual)', `Rs. ${di01.item9.toLocaleString()}`],
        ['ITEM 10', 'Overdue & Unclaimed Deposits', `Rs. ${di01.item10.toLocaleString()}`],
        ['ITEM 11', 'Interest Accrued and Payable', `Rs. ${di01.item11.toLocaleString()}`],
        ['ITEM 12', 'Interest Accrued on all Deposits', `Rs. ${di01.item12.toLocaleString()}`],
    ];

    doc.autoTable({
        startY: 58,
        head: [['Code', 'Description', "Amount (Rs. '000)"]],
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
        [item13.bracket1.bracket, item13.bracket1.accountCount.toLocaleString(), `Rs. ${item13.bracket1.amount.toLocaleString()}`],
        [item13.bracket2.bracket, item13.bracket2.accountCount.toLocaleString(), `Rs. ${item13.bracket2.amount.toLocaleString()}`],
        [item13.bracket3.bracket, item13.bracket3.accountCount.toLocaleString(), `Rs. ${item13.bracket3.amount.toLocaleString()}`],
        [item13.bracket4.bracket, item13.bracket4.accountCount.toLocaleString(), `Rs. ${item13.bracket4.amount.toLocaleString()}`],
        [{ content: 'Total (Sum of Brackets)', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, `Rs. ${ (item13.bracket1.amount + item13.bracket2.amount + item13.bracket3.amount + item13.bracket4.amount).toLocaleString() }`]
    ];

    doc.autoTable({
        startY: item13StartY + 6,
        head: [['Category Bracket', 'No. of Accounts', "Assessable Deposits ('000)"]],
        body: item13Rows,
        theme: 'grid',
        headStyles: { fillColor: [0, 168, 150], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // ── FORMAT-1: Sundry Creditors ───────────────────────────────────────────
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(33, 53, 127);
    doc.text('FORMAT-1: Sundry Creditors Detailed Breakdown', 14, 20);

    const format1Rows = [
        ['Clearing Difference', `Rs. ${format1.clearingDifference.toLocaleString()}`],
        ['Clearing Next Day', `Rs. ${format1.clearingNextDay.toLocaleString()}`],
        ['Deposits', `Rs. ${format1.deposits.toLocaleString()}`],
        ['ECGC/DICGC Claims', `Rs. ${format1.ecgcDicgcClaims.toLocaleString()}`],
        ['Suit Filed/Court Cases', `Rs. ${format1.suitFiledCourt.toLocaleString()}`],
        ['IT/ST Attachment', `Rs. ${format1.itStAttachment.toLocaleString()}`],
        ['Tax Deducted at Source (TDS)', `Rs. ${format1.tds.toLocaleString()}`],
        ['Excess Cash', `Rs. ${format1.excessCash.toLocaleString()}`],
        ['Vigilance Cases', `Rs. ${format1.vigilanceCases.toLocaleString()}`],
        ['Others (Excluding above categories)', `Rs. ${format1.others.toLocaleString()}`],
        [{ content: 'Total Sum of Sundry Creditors', styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: `Rs. ${Object.values(format1).reduce((a,b)=>a+b,0).toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
    ];

    doc.autoTable({
        startY: 28,
        head: [['Category', 'Amount (Standard Rs.)']],
        body: format1Rows,
        theme: 'grid',
        headStyles: { fillColor: [244, 162, 97], fontSize: 9 }, // Soft Orange
        bodyStyles: { fontSize: 9 }
    });

    // ── Footer / Certification ──────────────────────────────────────────────
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('__________________________', 14, finalY);
    doc.text('Prepared By', 14, finalY + 5);
    
    doc.text('__________________________', 140, finalY);
    doc.text('Authorized Signatory (RM/SRM)', 140, finalY + 5);

    doc.setFontSize(8);
    doc.text('Note: This is an automatically generated statutory return for submission to DICGC.', 14, finalY + 25);

    // ── Download ──────────────────────────────────────────────────────────────
    const filename = `DICGC_Return_DI01_${header.regionalOfficeName.replace(/\s+/g, '_')}_${header.returnDate}.pdf`;
    doc.save(filename);
};
