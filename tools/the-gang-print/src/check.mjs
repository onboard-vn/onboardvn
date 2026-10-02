import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const src = readFileSync(process.argv[2], 'utf8').replace(
  '</body>',
  `<script>
document.fonts.ready.then(()=>{const bad=[];document.querySelectorAll('.front .safe').forEach(s=>{
 const t=s.querySelector('.text,ul'); if(!t) return; const last=t.lastElementChild||t;
 const box=s.getBoundingClientRect(), foot=s.querySelector('.foot').getBoundingClientRect();
 if(t.scrollHeight>t.clientHeight+1 || last.getBoundingClientRect().bottom>foot.top+1) bad.push(s.querySelector('.orig')?.textContent);});
 document.body.setAttribute('data-bad', JSON.stringify(bad));});</script></body>`,
);
writeFileSync('.tmp/_check.html', src);
const dom = execFileSync(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=8000',
    '--dump-dom',
    `file://${resolve('.tmp/_check.html')}`,
  ],
  { encoding: 'utf8', maxBuffer: 1e8 },
);
console.log('overflow:', dom.match(/data-bad="([^"]*)"/)?.[1].replace(/&quot;/g, '"'));
