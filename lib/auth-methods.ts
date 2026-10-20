// Which sign-in methods the site can actually offer. Email links need a mail
// provider in production (in development they are printed to the console), so
// a deployment without RESEND_API_KEY is Google-only rather than showing a
// form that cannot work.
export interface AuthMethods {
  google: boolean;
  email: boolean;
}

export function availableAuthMethods(config: {
  googleClientId?: string;
  googleClientSecret?: string;
  resendApiKey?: string;
  isProd: boolean;
}): AuthMethods {
  return {
    google: !!(config.googleClientId && config.googleClientSecret),
    email: !!config.resendApiKey || !config.isProd,
  };
}
