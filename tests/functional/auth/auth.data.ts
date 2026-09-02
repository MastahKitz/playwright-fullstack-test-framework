export interface UserCredentials {
  username: string;
  password: string;
}

// Credentials come from environment variables — set locally via .env (see
// .env.example) or from GitHub Actions secrets in CI. No real values here.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill in real values.`
    );
  }
  return value;
}

// The admin account's password rotates daily to <prefix> + today's date as
// DDMMYYYY (e.g. "01" + "09" + "2026"). Only the fixed prefix is a secret;
// the date suffix is computed here so it never needs manual updating.
function todayDateSuffix(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${now.getFullYear()}`;
}

export const credentials = {
  standardUser: {
    username: requireEnv('QA_STANDARD_USER_USERNAME'),
    password: requireEnv('QA_STANDARD_USER_PASSWORD'),
  } as UserCredentials,
  lockedUser: {
    username: requireEnv('QA_LOCKED_USER_USERNAME'),
    password: requireEnv('QA_LOCKED_USER_PASSWORD'),
  } as UserCredentials,
  adminUser: {
    username: requireEnv('QA_ADMIN_USER_USERNAME'),
    password: `${requireEnv('QA_ADMIN_USER_PASSWORD_PREFIX')}${todayDateSuffix()}`,
  } as UserCredentials,
};
