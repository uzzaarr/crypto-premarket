const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/#4caf84/g, '#00e5ff'); // Cyan
code = code.replace(/#7b8cde/g, '#8b5cf6'); // Violet
code = code.replace(/#f0a050/g, '#f59e0b'); // Amber
code = code.replace(/#f44336/g, '#f43f5e'); // Rose
code = code.replace(/from-\[#161616\] via-\[#080808\] to-black/g, 'from-[#0f172a] via-[#020617] to-black');
fs.writeFileSync('src/App.tsx', code);
console.log('Colors replaced successfully!');
