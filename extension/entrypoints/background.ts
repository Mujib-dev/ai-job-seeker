import { defineBackground } from 'wxt/sandbox';
import { getUserProfile, getUserSubscription, setProStatus } from '../lib/storage';

export default defineBackground(() => {
  // 1. Initial setup on install
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      await getUserProfile(); // Ensure default profile initialized
      await getUserSubscription();
      console.log('AI Job Seeker Copilot extension installed successfully.');
    }
  });

  // 2. Global message dispatcher
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'ok', timestamp: Date.now() });
      return true;
    }

    if (message.type === 'VERIFY_SUBSCRIPTION') {
      getUserSubscription().then((sub) => {
        sendResponse(sub);
      });
      return true;
    }

    if (message.type === 'SET_PRO') {
      setProStatus(Boolean(message.isPro)).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }
  });
});
