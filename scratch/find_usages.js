const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(process.cwd());
const targetPatterns = ['clientData', 'sheetsError', 'leads', 'sheetData', 'queueData', 'recoveryData'];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  targetPatterns.forEach(pat => {
    if (content.includes(pat)) {
      console.log(`Match for "${pat}" in ${file}`);
    }
  });
});
