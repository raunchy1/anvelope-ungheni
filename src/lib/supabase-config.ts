// Connection settings for the Anvelope Ungheni service database.
//
// The Vercel project's Supabase env vars were overwritten by an unrelated
// deployment, which pointed this app at a different database and made every
// page look empty. These constants pin the correct project so production keeps
// working. Env vars still take precedence whenever they name this same project,
// so restoring them in the Vercel dashboard returns things to normal.
//
// The anon key is public by design: Next.js inlines NEXT_PUBLIC_* values into
// the browser bundle, so this key already ships to every visitor. Access is
// gated by row level security, not by keeping it secret.

const PROJECT_REF = 'gbdyzojsevqceiexkhxo';
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const PROJECT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDM1MzcsImV4cCI6MjA4ODI3OTUzN30.kbUQeHVZDwkUxsnq4DTMJ-8of_P5oIm17qcNRxmQeKs';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const envPointsAtThisProject = !!envUrl && envUrl.includes(PROJECT_REF);

export const SUPABASE_URL = envPointsAtThisProject ? envUrl! : PROJECT_URL;
export const SUPABASE_ANON_KEY =
    envPointsAtThisProject && envAnonKey ? envAnonKey : PROJECT_ANON_KEY;

// True when the deployment's env vars name this project, so the service role
// key sitting next to them can be trusted to belong to it.
export const SUPABASE_ENV_IS_TRUSTED = envPointsAtThisProject;
