/**
 * Configuration for OAuth providers
 * These providers can be enabled/disabled in Supabase dashboard
 */

export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'discord' | 'apple';

export interface AuthProviderConfig {
  id: OAuthProvider;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

/**
 * List of available OAuth providers
 * Set enabled to false to hide a provider from the UI
 */
export const authProviders: AuthProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    icon: '🔵',
    color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
    enabled: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '⚫',
    color: 'bg-gray-900 hover:bg-gray-800 text-white',
    enabled: true,
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: '🔷',
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    enabled: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '💬',
    color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    enabled: true,
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: '🍎',
    color: 'bg-black hover:bg-gray-900 text-white',
    enabled: true,
  },
];

/**
 * Get enabled providers only
 */
export const getEnabledProviders = (): AuthProviderConfig[] => {
  return authProviders.filter(p => p.enabled);
};

