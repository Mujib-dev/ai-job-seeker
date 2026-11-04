import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Job Seeker by LynkZone - 1-Click Form Autofill & AI Copilot',
    description: 'Developed by LynkZone. Instantly autofill job applications & generate tailored AI responses on LinkedIn, Indeed, Greenhouse, Lever, and Workday.',
    version: '1.0.0',
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
  },
});
