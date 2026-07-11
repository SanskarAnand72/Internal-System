const fs = require('fs');
const path = require('path');

const WORKSPACES_FILE = path.join(process.cwd(), 'data', 'workspaces.json');

try {
  const workspaces = JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf-8'));
  const workspace = workspaces.find(w => w.id === '2ebd315e-c1ab-43ef-a14e-f64908bdb690');
  
  if (workspace) {
    workspace.spreadsheetId = '1jUglEJB5sNFxYrX_dXiXxFomAp5bgY3C';
    workspace.updatedAt = new Date().toISOString();
    fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2), 'utf-8');
    console.log('Successfully updated workspace:');
    console.log(JSON.stringify(workspace, null, 2));
  } else {
    console.log('Workspace not found!');
  }
} catch (e) {
  console.error(e);
}
