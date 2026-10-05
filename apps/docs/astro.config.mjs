import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const page = (slug, en, de) => ({ slug, label: en, translations: { de } });

export default defineConfig({
  redirects: { '/': '/en/' },
  integrations: [
    starlight({
      title: { en: 'BSBox', de: 'BSBox' },
      defaultLocale: 'en',
      locales: {
        en: { label: 'English', lang: 'en' },
        de: { label: 'Deutsch', lang: 'de' },
      },
      sidebar: [
        page('get-started', 'Get started', 'Erste Schritte'),
        page('add-to-meeting', 'Add BSBox to a meeting', 'BSBox zu einem Meeting hinzufügen'),
        page('join-meeting', 'Join a meeting', 'An einem Meeting teilnehmen'),
        page('understand-score', 'Understand your score', 'Den Score verstehen'),
        page('admin-install', 'Admin install', 'Installation für Administratoren'),
        page('privacy', 'Privacy', 'Datenschutz'),
        page('terms', 'Terms', 'Nutzungsbedingungen'),
        page('support', 'Support', 'Support'),
        page('security', 'Security', 'Sicherheit'),
      ],
    }),
  ],
});
