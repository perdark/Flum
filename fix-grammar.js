const fs = require('fs');
const path = require('path');

const ecomSrc = 'c:/Users/USER/Desktop/RaadFun/SSS/ecom/src';

function walkFiles(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkFiles(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

walkFiles(ecomSrc, function(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('schema')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/categorys/g, 'categories');
  content = content.replace(/Categorys/g, 'Categories');
  content = content.replace(/CATEGORYS/g, 'CATEGORIES');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed grammar in: ' + filePath);
  }
});
