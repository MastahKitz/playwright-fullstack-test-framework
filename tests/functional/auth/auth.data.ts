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
    password: requireEnv('QA_ADMIN_USER_PASSWORD'),
  } as UserCredentials,
};
