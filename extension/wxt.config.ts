import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Job Seeker by LynkZone - 1-Click Form Autofill & AI Copilot',
    description: '1-click job application autofill for Workday, Greenhouse & LinkedIn. AI interview answers & tailored cover letter copilot.',
    version: '1.1.4',
    author: 'LynkZone',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['https://*/*', 'http://*/*', 'file://*/*'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_title: 'AI Job Seeker by LynkZone',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    web_accessible_resources: [
      {
        resources: ['icons/*.png'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
