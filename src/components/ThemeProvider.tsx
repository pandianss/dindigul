import React, { useEffect } from 'react';
import { THEME_CONFIG } from '../constants/organization';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        const root = document.documentElement;

        // Colors
        root.style.setProperty('--theme-primary', THEME_CONFIG.colors.primary);
        root.style.setProperty('--theme-secondary', THEME_CONFIG.colors.secondary);
        root.style.setProperty('--theme-accent', THEME_CONFIG.colors.accent);

        // Fonts
        root.style.setProperty('--theme-font-sans', THEME_CONFIG.fonts.sans);
        root.style.setProperty('--theme-font-tamil', THEME_CONFIG.fonts.tamil);
        root.style.setProperty('--theme-font-hindi', THEME_CONFIG.fonts.hindi);
    }, []);

    return <>{children}</>;
};
