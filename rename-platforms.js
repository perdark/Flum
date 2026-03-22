const fs = require('fs');
const path = require('path');

const ecomSrc = 'c:/Users/USER/Desktop/RaadFun/SSS/ecom/src';

// 1. Rename folders
const platformsDir = path.join(ecomSrc, 'app/[locale]/platforms');
const categoriesDir = path.join(ecomSrc, 'app/[locale]/categories');
if (fs.existsSync(platformsDir)) {
  fs.renameSync(platformsDir, categoriesDir);
  console.log('Renamed platforms dir to categories dir');
}

// 2. Rename files
const platformsListFile = path.join(ecomSrc, 'components/store/platforms-list.tsx');
const categoriesListFile = path.join(ecomSrc, 'components/store/categories-list.tsx');
if (fs.existsSync(platformsListFile)) {
  fs.renameSync(platformsListFile, categoriesListFile);
  console.log('Renamed platforms-list.tsx to categories-list.tsx');
}

// 3. Recursive text replace, EXCLUDING schema files (to prevent duplicates) and some others.
function walkFiles(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkFiles(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

walkFiles(ecomSrc, function(filePath) {
  if (
    // Only target source code
    !filePath.endsWith('.ts') &&
    !filePath.endsWith('.tsx') &&
    !filePath.endsWith('.css')
  ) return;

  // Skip schema files as they were already managed manually and we don't want duplicate definitions
  if (filePath.includes('schema.ts') || filePath.includes('schema-complete.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  content = content.replace(/platform/g, 'category');
  content = content.replace(/Platform/g, 'Category');
  content = content.replace(/PLATFORM/g, 'CATEGORY');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced inside ${filePath}`);
  }
});
