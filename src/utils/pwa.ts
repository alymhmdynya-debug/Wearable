/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types';

/**
 * Reads a cookie helper
 */
export function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

/**
 * Sets a cookie helper
 */
export function setCookie(name: string, value: string, days = 7) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (encodeURIComponent(value)) + expires + "; path=/";
}

/**
 * Dynamically updates the browser manifest and tab favicon in the DOM
 */
export function updateDynamicManifestAndFavicon(profile: UserProfile | null) {
  const shortTitle = profile ? (profile.appName || profile.arabicName || profile.displayName || 'إسمي ذهب') : 'إسمي ذهب';
  const title = profile ? `${shortTitle} - ESMY DAHAB` : 'ESMY DAHAB - إسمي ذهب';
  
  // Set tab document title
  document.title = title;

  // Real-time beautiful gold fallback SVG to prevent broken asset 404s
  const defaultFallbackIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23050505' rx='30'/><text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' fill='%23D4AF37' font-family='serif' font-size='42' font-weight='bold'>ذهـب</text></svg>";

  const configStage1 = localStorage.getItem('esm_config_stage1') || '';
  const configStage2 = localStorage.getItem('esm_config_stage2') || '';
  const configStage3 = localStorage.getItem('esm_config_stage3') || '';

  // Resolve icon according to level
  let iconPath = profile?.stage1IconUrl || configStage1 || '';
  if (profile) {
    const likes = Number(profile.likes || 0);
    const referrals = Number(profile.referralCount || 0);
    const views = Number(profile.views || 0);
    const currentLevel = Number(profile.level || 1);
    const totalPoints = (likes * 2) + referrals + views;
    
    if (totalPoints >= 50 || currentLevel === 3) {
      iconPath = profile?.stage3IconUrl || configStage3 || configStage1 || '';
    } else if (totalPoints >= 15 || currentLevel === 2) {
      iconPath = profile?.stage2IconUrl || configStage2 || configStage1 || '';
    }
  }

  if (!iconPath) {
    iconPath = defaultFallbackIcon;
  }
  
  const absoluteIconUrl = iconPath.startsWith('http') || iconPath.startsWith('data:') ? iconPath : window.location.origin + iconPath;

  // 1. Rewrite link rel="manifest"
  const manifestObj = {
    name: shortTitle, // The user requested the custom appName/short name to be used for the installed app name
    short_name: shortTitle,
    description: profile ? `الملف الشخصي الملكي الفاخر لـ ${shortTitle}` : 'الملف الشخصي الملكي - إسمي ذهب',
    start_url: window.location.origin + (profile ? `/${profile.username}` : '/'),
    display: "standalone",
    background_color: "#0c0c0e",
    theme_color: "#D4AF37",
    icons: [
      {
        src: absoluteIconUrl,
        sizes: "192x192",
        type: absoluteIconUrl.startsWith('data:image/svg+xml') ? "image/svg+xml" : "image/png"
      },
      {
        src: absoluteIconUrl,
        sizes: "512x512",
        type: absoluteIconUrl.startsWith('data:image/svg+xml') ? "image/svg+xml" : "image/png"
      }
    ]
  };

  const manifestString = JSON.stringify(manifestObj);
  const manifestBlob = new Blob([manifestString], { type: 'application/json' });
  const manifestURL = URL.createObjectURL(manifestBlob);

  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestURL;

  // 2. Rewrite favicon href
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  
  faviconLink.href = absoluteIconUrl;
}

/**
 * Check if the browser is in standalone (PWA) mode
 */
export function isStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Register Service worker
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('ServiceWorker registered with scope: ', reg.scope);
        })
        .catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
    });
  }
}
export function getSavedProfile(): UserProfile | null {
  try {
    const local = localStorage.getItem('esm_my_profile');
    if (local) return JSON.parse(local);
    const cookie = getCookie('esm_my_profile');
    if (cookie) return JSON.parse(cookie);
  } catch (e) {
    console.error("Error reading saved user profile cached", e);
  }
  return null;
}

export function saveProfileLocal(profile: UserProfile | null) {
  if (profile) {
    const str = JSON.stringify(profile);
    localStorage.setItem('esm_my_profile', str);
    setCookie('esm_my_profile', str, 30);
  } else {
    localStorage.removeItem('esm_my_profile');
    setCookie('esm_my_profile', '', -1);
  }
}
