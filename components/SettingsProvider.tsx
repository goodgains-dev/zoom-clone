'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import themes from '@/components/themes'; // Ensure this path is correct

// Initial settings using the default theme's values
const initialSettings = {
  layout: 'default',
  typography: themes.default.typography, // Use typography from the default theme
  primaryColor: themes.default.primaryColor,
  secondaryColor: themes.default.secondaryColor,
  backgroundColor: themes.default.backgroundColor,
  textColor: themes.default.textColor,
  theme: 'default', // light or dark mode
  chatAPI: 'ipfs', // Options: ipfs, wasabi, neon
  database: 'ipfs', // Options: ipfs, wasabi, neon
  aiModel: 'basic', // Options: basic, advanced, pro
  backgroundImage: '', // Background image URL
  logo: '', // Logo image URL
  animation: 'none', // Animation option
};

type SettingsType = typeof initialSettings & {
  updateSettings: (newSettings: Partial<typeof initialSettings>) => void;
};

const SettingsContext = createContext<SettingsType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    // Placeholder for loading initial settings from a source, e.g., an API
  }, []);

  const updateSettings = (newSettings: Partial<typeof initialSettings>) => {
    setSettings((prevSettings) => {
      if (newSettings.theme && themes[newSettings.theme]) {
        const selectedTheme = themes[newSettings.theme];

        return {
          ...prevSettings,
          ...newSettings,
          typography: selectedTheme.typography, // Update typography when theme changes
          primaryColor: selectedTheme.primaryColor,
          secondaryColor: selectedTheme.secondaryColor,
          backgroundColor: selectedTheme.backgroundColor,
          textColor: selectedTheme.textColor,
        };
      }

      // Update settings normally if theme is not being changed
      return {
        ...prevSettings,
        ...newSettings,
        typography: {
          ...prevSettings.typography,
          ...(newSettings.typography || {}),
        },
      };
    });
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
