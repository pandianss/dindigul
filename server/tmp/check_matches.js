
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const curDate = new Date();
  console.log('Current Server Date:', curDate.toLocaleString());
  
  const anniversaryCheckDates = Array.from({ length: 16 }, (_, i) => {
    const d = new Date(curDate);
    d.setDate(curDate.getDate() + i);
    return { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() };
  });

  console.log('Window Start:', anniversaryCheckDates[0]);
  console.log('Window End:', anniversaryCheckDates[15]);

  const allBranches = await prisma.branch.findMany({
    where: { openDate: { not: null } },
    select: { id: true, nameEn: true, code: true, openDate: true }
  });

  const anniversaries = allBranches.filter(b => {
    const parts = b.openDate.split('-');
    if (parts.length !== 3) return false;
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    const y = parseInt(parts[0]);
    
    const match = anniversaryCheckDates.find(ad => ad.month === m && ad.day === d);
    if (!match) return false;
    
    b.years = match.year - y;
    b.displayDate = `${d.toString().padStart(2, '0')} ${new Date(2000, m - 1).toLocaleDateString('en-GB', { month: 'short' })}`;
    return true;
  }).map(b => ({
    id: b.id,
    name: b.nameEn,
    code: b.code,
    years: b.years,
    date: b.displayDate
  }));

  console.log('Found Anniversaries:', JSON.stringify(anniversaries, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
