const fs = require('fs');
const path = require('path');

const dirs = [
  'D:/code/posduplicate/frontend/src/pages/medsos',
  'D:/code/posduplicate/frontend/src/components/medsos'
];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Typography: Fix "ketebelan"
    content = content.replace(/font-extrabold/g, 'font-bold');
    content = content.replace(/font-black/g, 'font-bold tracking-tight');
    content = content.replace(/text-3xl font-bold/g, 'text-2xl md:text-3xl font-bold tracking-tight');
    content = content.replace(/text-2xl font-bold/g, 'text-xl md:text-2xl font-bold tracking-tight');
    
    // 2. Borders & Backgrounds (Premium SaaS feel)
    // Cards
    content = content.replace(/border-gray-100 bg-white shadow-sm/g, 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5');
    content = content.replace(/border-gray-200 bg-white/g, 'bg-white ring-1 ring-slate-900/5');
    content = content.replace(/bg-slate-800 border-slate-700/g, 'bg-[#111318] ring-1 ring-white/10');
    content = content.replace(/border-slate-700 bg-slate-800/g, 'bg-[#111318] ring-1 ring-white/10');
    content = content.replace(/border-slate-700 bg-slate-900\/40/g, 'bg-white/5 ring-1 ring-white/10');
    content = content.replace(/bg-slate-900 border-slate-700/g, 'bg-[#111318] ring-1 ring-white/10');
    
    // Clean up double borders if they happen
    content = content.replace(/border bg-white shadow-\[0_2px_8px_rgb/g, 'bg-white shadow-[0_2px_8px_rgb');
    content = content.replace(/border bg-\[#111318\] ring-1/g, 'bg-[#111318] ring-1');
    content = content.replace(/rounded-2xl border p-/g, 'rounded-[24px] p-');
    content = content.replace(/rounded-3xl border p-/g, 'rounded-[32px] p-');
    
    // Input fields (remove thick borders, use subtle ring)
    content = content.replace(/border px-4 py-3/g, 'border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3');
    content = content.replace(/border px-3 py-2/g, 'border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-3 py-2');

    // 3. Micro-interactions
    content = content.replace(/transition hover:scale-\[1.01\]/g, 'transition-all duration-200 hover:scale-[1.02] active:scale-95');
    // Don't replace general transition-colors if it breaks complex class logic, but add active state where applicable
    content = content.replace(/hover:bg-blue-700/g, 'hover:bg-blue-700 active:scale-95 transition-all');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('Premium aesthetic applied globally.');
