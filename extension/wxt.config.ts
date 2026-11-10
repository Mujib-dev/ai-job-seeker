import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Job Seeker by LynkZone - 1-Click Form Autofill & AI Copilot',
    description: '1-click job application form autofill, tailored AI question responses, and cover letter copilot by LynkZone.',
    version: '1.1.1',
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
