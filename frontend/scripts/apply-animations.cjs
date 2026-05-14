const fs = require('fs');
const path = require('path');

const pages = [
  'AutoReplyPage.tsx',
  'BroadcastManagerPage.tsx',
  'ContentCalendar.tsx',
  'CreatePost.tsx',
  'CustomerDatabasePage.tsx',
  'MedsosAnalytics.tsx',
  'MedsosConnections.tsx',
  'MedsosInbox.tsx',
  'MedsosSettings.tsx',
  'OmnichannelAdsHub.tsx'
];

const dir = 'D:/code/posduplicate/frontend/src/pages/medsos';

pages.forEach(file => {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace the first top-level div's space-y-x with animation
  // Only replace if it doesn't already have animate-in
  if (!content.includes('animate-in fade-in')) {
    content = content.replace(/className="(space-y-\d+\s*(?:pb-\d+)?)"/, 'className="$1 animate-in fade-in slide-in-from-bottom-4 duration-500"');
    content = content.replace(/className="(min-h-\[calc\(100vh-\d+px\)\][^"]*)"/, 'className="$1 animate-in fade-in slide-in-from-bottom-4 duration-500"');
    fs.writeFileSync(p, content, 'utf8');
  }
});

console.log('Animations added.');
