import type { InstallHintStrings, PushToggleStrings } from '@alcariss/pwa-kit';

export const AUTH_MESSAGES: Record<string, string> = {
  cancelled: 'Přihlášení bylo zrušeno.',
  not_allowed: 'Tento účet nemá do Hlášek přístup.',
  provider_error: 'Přihlášení se nepovedlo. Zkus to znovu.',
  invalid_session: 'Přihlášení se nepovedlo. Zkus to znovu.'
};

export const SESSION_EXPIRED = 'Přihlášení vypršelo. Přihlas se znovu.';

export const LOGIN_LABELS = { google: 'Přihlásit přes Google', github: 'Přihlásit přes GitHub' };

const ADD_TO_HOME = 'Klepni na Přidat na plochu (pokud ji nevidíš, je pod Více).';

export const INSTALL_HINT_STRINGS: InstallHintStrings = {
  title: 'Nainstaluj si Hlášky',
  intro: 'Přidej si je na plochu, otevřou se jako aplikace a fungují i offline.',
  promptIntro: 'Nainstaluj si je, otevřou se jako aplikace a fungují i offline.',
  signInNote: 'Nainstalovaná aplikace nesdílí přihlášení s prohlížečem: nejdřív ji nainstaluj, pak se přihlas až v ní.',
  install: 'Nainstalovat',
  dismiss: 'Teď ne',
  iosSafari: [
    'Klepni na ⋯ vpravo dole.',
    'Klepni na Sdílet.',
    ADD_TO_HOME,
    'Nech zapnuté Otevřít jako webovou aplikaci a klepni na Přidat.'
  ],
  iosSafariLegacy: [
    'Klepni na Sdílet (čtverec se šipkou) dole na liště.',
    'Sjeď níž a klepni na Přidat na plochu.',
    'Klepni na Přidat.'
  ],
  ipadSafari: [
    'Klepni na Sdílet (čtverec se šipkou) nahoře. Pokud tam není, otevři nejdřív menu ⋯.',
    'Klepni na Přidat na plochu.',
    'Klepni na Přidat.'
  ],
  iosChrome: [
    'Klepni na Sdílet (čtverec se šipkou) v adresním řádku.',
    ADD_TO_HOME,
    'Klepni na Přidat.'
  ],
  iosBrowser: [
    'Otevři menu prohlížeče a klepni na Sdílet.',
    ADD_TO_HOME,
    'Klepni na Přidat.'
  ],
  iosOpenInSafari: [
    'Tento prohlížeč na této verzi iOS neumí přidávat aplikace na plochu.',
    'Otevři stránku v Safari, klepni na Sdílet a pak na Přidat na plochu.'
  ],
  iosInApp: [
    'Stránka je otevřená uvnitř jiné aplikace, odkud ji na plochu přidat nejde.',
    'Klepni na ⋯ nebo na ikonu kompasu a vyber Otevřít v Safari (nebo Otevřít v prohlížeči).',
    'V Safari klepni na Sdílet a pak na Přidat na plochu.'
  ],
  androidInApp: [
    'Stránka je otevřená uvnitř jiné aplikace, odkud ji nainstalovat nejde.',
    'Otevři menu ⋮ a vyber Otevřít v Chromu (nebo Otevřít v prohlížeči).'
  ],
  android: [
    'Otevři menu prohlížeče ⋮.',
    'Klepni na Nainstalovat aplikaci nebo Přidat na plochu.'
  ],
  macSafari: ['Zvol Soubor → Přidat do Docku.']
};

export const PUSH_TOGGLE_STRINGS: Partial<PushToggleStrings> = {
  label: 'Upozornění na nové hlášky',
  denied: 'Upozornění jsou zablokovaná. Povol je pro Hlášky v Nastavení telefonu.',
  needsInstall: 'Upozornění fungují jen v aplikaci přidané na plochu: přidej si Hlášky na plochu a otevři je odtamtud.',
  error: 'Upozornění se nepodařilo změnit. Zkus to znovu.'
};
