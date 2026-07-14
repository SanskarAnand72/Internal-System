import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE        = path.join(DATA_DIR, 'users.json');
const WORKSPACES_FILE   = path.join(DATA_DIR, 'workspaces.json');
const INVITATIONS_FILE  = path.join(DATA_DIR, 'invitations.json');

// ─── Helpers (Memory-backed for read-only Vercel serverless containers) ───────

// Initialize in-memory storage globally to persist across Next.js hot-reloads in dev
if (!global._db_users) {
  global._db_users = readInitialJSON(USERS_FILE);
}
if (!global._db_workspaces) {
  global._db_workspaces = readInitialJSON(WORKSPACES_FILE);
}
if (!global._db_invitations) {
  global._db_invitations = readInitialJSON(INVITATIONS_FILE);
}

function readInitialJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.warn(`[DB] Could not read file ${filePath}:`, e.message);
  }
  return [];
}

function readJSON(filePath) {
  if (filePath === USERS_FILE) return global._db_users;
  if (filePath === WORKSPACES_FILE) return global._db_workspaces;
  if (filePath === INVITATIONS_FILE) return global._db_invitations;
  return [];
}

function writeJSON(filePath, data) {
  // Update in-memory cache first
  if (filePath === USERS_FILE) global._db_users = data;
  else if (filePath === WORKSPACES_FILE) global._db_workspaces = data;
  else if (filePath === INVITATIONS_FILE) global._db_invitations = data;

  // Skip filesystem writes on Vercel/production or if the environment is read-only
  const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER === '1' || process.env.NODE_ENV === 'production';
  if (isVercel) {
    console.log(`[DB] Read-only serverless environment detected. Skipped writing to ${path.basename(filePath)}.`);
    return;
  }

  // Attempt filesystem write for local development
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[DB] Local write succeeded for ${path.basename(filePath)}.`);
  } catch (e) {
    console.error(`[DB] Error writing to ${filePath}:`, e.message);
  }
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export function getUsers() {
  return readJSON(USERS_FILE);
}

export function getUserById(id) {
  if (!id) return null;
  // Auth.js may store token.id as the Google profile sub.
  // Match on stored id first, then also accept records where the email
  // was set during saveUser with the same sub. This prevents the JWT
  // callback from failing to find the user and triggering workspace loops.
  return getUsers().find(u => u.id === id) || null;
}

export function getUserByEmail(email) {
  return getUsers().find(u => u.email === email) || null;
}

export function getUsersByWorkspace(workspaceId) {
  return getUsers().filter(u => u.workspaceId === workspaceId);
}

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : "";
}

export function resolveWorkspaceForEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { user: null, workspace: null };
  }

  const user = getUsers().find(u => normalizeEmail(u.email) === normalizedEmail) || null;
  const workspaceByOwnerEmail = getWorkspaces().find(
    workspace => normalizeEmail(workspace.ownerEmail) === normalizedEmail
  ) || null;
  const workspaceByUser = user?.workspaceId ? getWorkspaceById(user.workspaceId) : null;
  const workspace = workspaceByOwnerEmail || workspaceByUser || null;

  if (workspace && user && workspaceByOwnerEmail && user.workspaceId !== workspace.id) {
    updateUser(user.id, {
      workspaceId: workspace.id,
      role: workspace.ownerId === user.id ? "Owner" : user.role || null,
      status: user.status || "active",
    });
  }

  return { user, workspace };
}

/**
 * Create or update a user. Merges on id OR email.
 * accessToken / refreshToken are stored only for the workspace owner
 * so they can be moved to the workspace record at onboarding time.
 */
export function saveUser(profile) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === profile.id || u.email === profile.email);
  const now = new Date().toISOString();

  if (idx > -1) {
    // Preserve fields not provided by the update
    users[idx] = {
      ...users[idx],
      ...profile,
      lastLogin: now,
    };
    writeJSON(USERS_FILE, users);
    return users[idx];
  } else {
    const newUser = { ...profile, createdAt: now, lastLogin: now };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return newUser;
  }
}

export function updateUser(id, patch) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch };
  writeJSON(USERS_FILE, users);
  return users[idx];
}

export function removeUser(id) {
  const users = getUsers().filter(u => u.id !== id);
  writeJSON(USERS_FILE, users);
}

// ─── WORKSPACES ───────────────────────────────────────────────────────────────

export function getWorkspaces() {
  return readJSON(WORKSPACES_FILE);
}

export function getWorkspaceById(id) {
  return getWorkspaces().find(w => w.id === id) || null;
}

export function getWorkspaceByOwnerId(ownerId) {
  return getWorkspaces().find(w => w.ownerId === ownerId) || null;
}

export function getWorkspaceByOwnerEmail(ownerEmail) {
  if (!ownerEmail) return null;
  return getWorkspaces().find(w => w.ownerEmail === ownerEmail) || null;
}

export function findWorkspaceForUser({ email = null } = {}) {
  return resolveWorkspaceForEmail(email).workspace;
}

/**
 * Create a new workspace.
 * googleTokens — owner's OAuth tokens. MUST include { accessToken, refreshToken, expiresAt }
 */
export function createWorkspace({ id, name, ownerId, ownerEmail, googleTokens = null, spreadsheetId = '' }) {
  const workspaces = getWorkspaces();
  const now = new Date().toISOString();
  const workspace = {
    id,
    name,
    ownerId,
    ownerEmail,
    googleTokens,   // Workspace-level Google connection (owner's tokens only)
    spreadsheetId,
    createdAt: now,
    updatedAt: now,
  };
  workspaces.push(workspace);
  writeJSON(WORKSPACES_FILE, workspaces);
  return workspace;
}

export function updateWorkspace(id, patch) {
  const workspaces = getWorkspaces();
  const idx = workspaces.findIndex(w => w.id === id);
  if (idx === -1) return null;
  workspaces[idx] = { ...workspaces[idx], ...patch, updatedAt: new Date().toISOString() };
  writeJSON(WORKSPACES_FILE, workspaces);
  return workspaces[idx];
}

// ─── INVITATIONS ──────────────────────────────────────────────────────────────

export function getInvitations() {
  return readJSON(INVITATIONS_FILE);
}

export function getInvitationByToken(token) {
  return getInvitations().find(i => i.token === token) || null;
}

export function getPendingInvitations(workspaceId) {
  return getInvitations().filter(
    i => i.workspaceId === workspaceId && i.status === 'pending'
  );
}

/**
 * Returns the first pending invitation for a given email address (any workspace).
 * Used by the signIn and jwt callbacks to detect invited members so we do NOT
 * auto-create a workspace for them — they must join an existing workspace instead.
 */
export function getPendingInvitationByEmail(email) {
  if (!email) return null;
  return getInvitations().find(
    i => i.email === email.toLowerCase().trim() && i.status === 'pending'
  ) || null;
}

export function createInvitation({ id, token, email, workspaceId, role, invitedById, invitedByName }) {
  const invitations = getInvitations();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Revoke any existing pending invite for the same email in the same workspace
  const updated = invitations.map(i =>
    i.workspaceId === workspaceId && i.email === email && i.status === 'pending'
      ? { ...i, status: 'revoked' }
      : i
  );

  const invitation = {
    id,
    token,
    email,
    workspaceId,
    role,
    invitedById,
    invitedByName,
    status: 'pending',
    createdAt: now,
    expiresAt,
  };
  updated.push(invitation);
  writeJSON(INVITATIONS_FILE, updated);
  return invitation;
}

export function updateInvitation(token, patch) {
  const invitations = getInvitations();
  const idx = invitations.findIndex(i => i.token === token);
  if (idx === -1) return null;
  invitations[idx] = { ...invitations[idx], ...patch };
  writeJSON(INVITATIONS_FILE, invitations);
  return invitations[idx];
}

export function revokeInvitation(token) {
  return updateInvitation(token, { status: 'revoked' });
}

export function deleteInvitation(token) {
  const invitations = getInvitations().filter(i => i.token !== token);
  writeJSON(INVITATIONS_FILE, invitations);
}

