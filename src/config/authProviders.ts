import React from 'react';
import GoogleIcon from '../components/Auth/GoogleIcon';

/**
 * Configuration for OAuth providers
 * These providers can be enabled/disabled in Supabase dashboard
 */

export type OAuthProvider = 'google';

export interface AuthProviderConfig {
  id: OAuthProvider;
  name: string;
  icon: React.ReactNode;
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
    icon: React.createElement(GoogleIcon),
    color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    enabled: true,
  },
];

/**
 * Get enabled providers only
 */
export const getEnabledProviders = (): AuthProviderConfig[] => {
  return authProviders.filter(p => p.enabled);
};

