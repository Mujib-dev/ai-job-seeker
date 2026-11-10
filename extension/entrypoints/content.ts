import { defineContentScript } from 'wxt/sandbox';
import { autofillForm, extractPageJobContext } from '../lib/autofill';
import { getUserProfile, incrementUsage, getUserSubscription } from '../lib/storage';

export default defineContentScript({
  matches: ['*://*/*', 'file://*/*'],
  runAt: 'document_idle',
  main() {
    // 1. Listen for messages from Popup
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.type === 'GET_PAGE_JOB_INFO') {
        const info = extractPageJobContext();
        sendResponse(info);
        return true;
      }

      if (request.type === 'EXECUTE_AUTOFILL') {
        const result = autofillForm(request.profile);
        sendResponse({ filledCount: result.filledFieldsCount, total: result.totalFieldsFound });
        return true;
      }

      if (request.type === 'SET_FLOATING_WIDGET_VISIBLE') {
        const host = document.getElementById('ai-job-seeker-host');
        if (request.enabled) {
          if (!host) injectFloatingWidget();
          else host.style.display = 'block';
        } else {
          if (host) host.style.display = 'none';
        }
        sendResponse({ success: true });
        return true;
      }
    });

    // 2. Listen to storage changes so floating widget toggles on all open tabs in real time
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['ai_job_seeker_settings']) {
          const newSettings = changes['ai_job_seeker_settings'].newValue;
          const host = document.getElementById('ai-job-seeker-host');
          if (newSettings?.showFloatingWidget === false) {
            if (host) host.style.display = 'none';
          } else {
            if (!host) injectFloatingWidget();
            else host.style.display = 'block';
          }
        }
      });
    }

    // 3. Inject sleek floating trigger button into webpage using Shadow DOM (default is ON)
    chrome.storage.local.get('ai_job_seeker_settings', (result) => {
      const settings = result['ai_job_seeker_settings'];
      if (settings?.showFloatingWidget !== false) {
        injectFloatingWidget();
      }
    });
  },
});

function injectFloatingWidget() {
  if (document.getElementById('ai-job-seeker-host')) return;

  // Don't inject on tiny iframes
  if (window.self !== window.top) return;

  const host = document.createElement('div');
  host.id = 'ai-job-seeker-host';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  host.style.touchAction = 'none';

  // Restore saved position or default to bottom-left
  try {
    const saved = localStorage.getItem('ai_job_seeker_btn_pos');
    if (saved) {
      const { left, top } = JSON.parse(saved);
      const safeX = Math.max(12, Math.min(window.innerWidth - 180, left));
      const safeY = Math.max(12, Math.min(window.innerHeight - 60, top));
      host.style.left = `${safeX}px`;
      host.style.top = `${safeY}px`;
    } else {
      host.style.bottom = '24px';
      host.style.left = '24px';
    }
  } catch {
    host.style.bottom = '24px';
    host.style.left = '24px';
  }

  const shadow = host.attachShadow({ mode: 'open' });

  // Floating Action Pill style
  const style = document.createElement('style');
  style.textContent = `
    .floating-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 15px;
      background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2);
      cursor: grab;
      user-select: none;
      transition: box-shadow 0.2s ease, transform 0.15s ease;
    }
    .floating-btn:hover {
      box-shadow: 0 14px 28px -4px rgba(79, 70, 229, 0.55);
      transform: scale(1.02);
    }
    .floating-btn:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
    .drag-handle {
      display: flex;
      align-items: center;
      opacity: 0.7;
      cursor: grab;
      padding-right: 2px;
    }
    .floating-btn:hover .drag-handle {
      opacity: 1;
    }
    .badge {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-toast {
      position: absolute;
      bottom: 48px;
      left: 0;
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid #1e293b;
      padding: 8px 14px;
      border-radius: 12px;
      font-size: 12px;
      white-space: nowrap;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.2s ease-out;
      pointer-events: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  const container = document.createElement('div');
  container.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = 'floating-btn';
  btn.title = 'Drag to move anywhere on screen • Click to Autofill';
  btn.innerHTML = `
    <span class="drag-handle" title="Drag to move anywhere">
      <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">
        <circle cx="2" cy="2" r="1.5"></circle>
        <circle cx="8" cy="2" r="1.5"></circle>
        <circle cx="2" cy="8" r="1.5"></circle>
        <circle cx="8" cy="8" r="1.5"></circle>
        <circle cx="2" cy="14" r="1.5"></circle>
        <circle cx="8" cy="14" r="1.5"></circle>
      </svg>
    </span>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
    <span>AI Autofill</span>
    <span class="badge">1-Click</span>
  `;

  // Make Moveable / Draggable anywhere across the screen
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;

    const rect = host.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    btn.style.cursor = 'grabbing';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMoved = true;
      }

      if (hasMoved) {
        const rect = host.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 12;
        const maxY = window.innerHeight - rect.height - 12;

        const newLeft = Math.max(12, Math.min(maxX, initialLeft + dx));
        const newTop = Math.max(12, Math.min(maxY, initialTop + dy));

        host.style.left = `${newLeft}px`;
        host.style.top = `${newTop}px`;
        host.style.right = 'auto';
        host.style.bottom = 'auto';
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      btn.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (hasMoved) {
        try {
          const rect = host.getBoundingClientRect();
          localStorage.setItem(
            'ai_job_seeker_btn_pos',
            JSON.stringify({ left: rect.left, top: rect.top })
          );
        } catch {}
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Touch Drag Support (Mobile / Touch devices)
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    hasMoved = false;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;

    const rect = host.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (!isDragging || moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const dx = moveTouch.clientX - startX;
      const dy = moveTouch.clientY - startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMoved = true;
      }

      if (hasMoved) {
        moveEvent.preventDefault();
        const rect = host.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 12;
        const maxY = window.innerHeight - rect.height - 12;

        const newLeft = Math.max(12, Math.min(maxX, initialLeft + dx));
        const newTop = Math.max(12, Math.min(maxY, initialTop + dy));

        host.style.left = `${newLeft}px`;
        host.style.top = `${newTop}px`;
        host.style.right = 'auto';
        host.style.bottom = 'auto';
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);

      if (hasMoved) {
        try {
          const rect = host.getBoundingClientRect();
          localStorage.setItem(
            'ai_job_seeker_btn_pos',
            JSON.stringify({ left: rect.left, top: rect.top })
          );
        } catch {}
      }
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  btn.addEventListener('mousedown', onMouseDown);
  btn.addEventListener('touchstart', onTouchStart, { passive: false });

  // Click Action: Autofill (only triggers if NOT dragged)
  const resetBtn = () => {
    btn.style.opacity = '1';
    btn.innerHTML = `
      <span class="drag-handle" title="Drag to move anywhere">
        <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5"></circle>
          <circle cx="8" cy="2" r="1.5"></circle>
          <circle cx="2" cy="8" r="1.5"></circle>
          <circle cx="8" cy="8" r="1.5"></circle>
          <circle cx="2" cy="14" r="1.5"></circle>
          <circle cx="8" cy="14" r="1.5"></circle>
        </svg>
      </span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
      <span>AI Autofill</span>
      <span class="badge">1-Click</span>
    `;
  };

  btn.addEventListener('click', async () => {
    if (hasMoved) return; // Ignore click if user was dragging!

    btn.style.opacity = '0.7';
    btn.innerText = 'Filling Form...';

    try {
      const profile = await getUserProfile();

      // Check if profile has any saved details
      const hasAnyData = Boolean(
        profile.personal?.email?.trim() ||
        profile.personal?.firstName?.trim() ||
        profile.personal?.lastName?.trim() ||
        profile.personal?.phone?.trim()
      );

      if (!hasAnyData) {
        showWidgetToast(container, '⚠️ Profile is empty! Click the extension icon to save your details first.');
        btn.style.opacity = '1';
        btn.innerHTML = `<span>Set Profile First</span>`;
        setTimeout(resetBtn, 3000);
        return;
      }

      const sub = await getUserSubscription();
      const limit = sub.monthlyLimit || 50;
      const count = sub.monthlyUsageCount || 0;

      if (!sub.isPro && count >= limit) {
        showWidgetToast(container, `⚠️ 0 left out of ${limit} this month. Click extension icon to upgrade.`);
        btn.style.opacity = '1';
        btn.innerHTML = `<span>0 Left This Month</span>`;
        setTimeout(resetBtn, 2500);
        return;
      }

      const result = autofillForm(profile);

      if (result.filledFieldsCount > 0) {
        await incrementUsage();
        const remaining = Math.max(0, limit - (count + 1));

        btn.style.opacity = '1';
        btn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Filled ${result.filledFieldsCount} Fields!</span>
        `;

        const toastMsg = sub.isPro
          ? `✨ Successfully filled ${result.filledFieldsCount} fields!`
          : `✨ Filled ${result.filledFieldsCount} fields! (${remaining} left out of ${limit} this month)`;
        showWidgetToast(container, toastMsg);
      } else {
        btn.style.opacity = '1';
        btn.innerHTML = `<span>No Fields Found</span>`;
        showWidgetToast(container, 'ℹ️ No matching application fields found on this page.');
      }
      setTimeout(resetBtn, 2500);
    } catch (err: any) {
      console.error('AI Job Seeker Autofill error:', err);
      const isContextInvalid =
        err?.message?.toLowerCase().includes('invalidat') ||
        err?.message?.toLowerCase().includes('context') ||
        (typeof chrome !== 'undefined' && !chrome.runtime?.id);

      if (isContextInvalid) {
        btn.style.opacity = '1';
        btn.innerHTML = `<span>Please Refresh Page</span>`;
        showWidgetToast(container, '⚠️ Extension was updated. Please refresh (F5) this page.');
      } else {
        showWidgetToast(container, '⚠️ Autofill finished with best-effort matching.');
      }
      setTimeout(resetBtn, 2500);
    }
  });

  shadow.appendChild(style);
  container.appendChild(btn);
  shadow.appendChild(container);
  document.body.appendChild(host);
}

function showWidgetToast(container: HTMLElement, message: string) {
  const existing = container.querySelector('.status-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'status-toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
