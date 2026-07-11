const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const workspaces = JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf-8'));
const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));

// The live workspace that both users belong to
const LIVE_WS_ID = '0e795a89-ca22-4b97-b434-b9e2a7c43f5f';
// The workspace that has valid Google tokens
const TOKEN_SOURCE_WS_ID = '2ebd315e-c1ab-43ef-a14e-f64908bdb690';

const liveWs = workspaces.find(w => w.id === LIVE_WS_ID);
const tokenSourceWs = workspaces.find(w => w.id === TOKEN_SOURCE_WS_ID);

if (!liveWs) { console.error('Live workspace not found!'); process.exit(1); }
if (!tokenSourceWs) { console.error('Token source workspace not found!'); process.exit(1); }

// Copy Google tokens from source workspace into live workspace
liveWs.googleTokens = {
  accessToken:  tokenSourceWs.googleTokens.accessToken,
  refreshToken: tokenSourceWs.googleTokens.refreshToken,
  expiresAt:    tokenSourceWs.googleTokens.expiresAt,
};
liveWs.updatedAt = new Date().toISOString();

// Keep only the live workspace — remove all stale workspaces
// (stale = any workspace that is NOT the live one)
const staleIds = workspaces
  .filter(w => w.id !== LIVE_WS_ID)
  .map(w => w.id);

console.log('Removing stale workspaces:', staleIds);

const cleanedWorkspaces = [liveWs];
fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(cleanedWorkspaces, null, 2), 'utf-8');

// Fix users: both active users should be in live workspace
// Remove any stale user records (orphaned from old workspaces)
const activeUserIds = ['7c9914f0-f59a-4602-8dc7-ebb3ed76fe03', '5a8708a1-0184-4969-ac10-cafd13ef05b3'];
const cleanedUsers = users
  .filter(u => activeUserIds.includes(u.id))
  .map(u => ({
    ...u,
    workspaceId: LIVE_WS_ID,
    accessToken:  null,
    refreshToken: null,
    expiresAt:    null,
  }));

fs.writeFileSync(USERS_FILE, JSON.stringify(cleanedUsers, null, 2), 'utf-8');

console.log('\n✅ Database cleaned successfully.\n');
console.log('Live workspace after fix:');
console.log(JSON.stringify(liveWs, null, 2));
console.log('\nUsers after fix:');
cleanedUsers.forEach(u => console.log(` - ${u.email} | role: ${u.role} | workspaceId: ${u.workspaceId}`));
