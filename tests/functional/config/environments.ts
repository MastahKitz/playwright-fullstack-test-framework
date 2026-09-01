export interface EnvironmentConfig {
  baseUrl: string;
}

const environments: Record<string, EnvironmentConfig> = {
  demo: {
    baseUrl: 'https://qademo.com',
  },
  // Add more environments here, e.g.:
  // staging: { baseUrl: 'https://staging.qademo.com' },
  // local: { baseUrl: 'http://localhost:3000' },
};

const envName = process.env.QA_ENV || 'demo';

export const environment = environments[envName];
