const fs = require('fs');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace lowercase
    content = content.replace(/platform/g, 'category');
    // Replace capitalized
    content = content.replace(/Platform/g, 'Category');
    // Replace uppercase
    content = content.replace(/PLATFORM/g, 'CATEGORY');
    fs.writeFileSync(filePath, content);
    console.log(`Replaced in ${filePath}`);
  } catch (err) {
    console.error(`Error in ${filePath}:`, err);
  }
}

replaceInFile('c:/Users/USER/Desktop/RaadFun/SSS/ecom/src/app/[locale]/wishlist/page.tsx');
replaceInFile('c:/Users/USER/Desktop/RaadFun/SSS/ecom/src/lib/api-client.ts');
replaceInFile('c:/Users/USER/Desktop/RaadFun/SSS/dashboard_next/src/app/dashboard/inventory/page.tsx');
