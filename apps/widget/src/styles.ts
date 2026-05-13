// Styles as a string constant so they can be injected into a single
// <style> tag at runtime. This lets the IIFE bundle ship as one file
// — tenants only embed one <script> tag.

export const WIDGET_STYLES = `
.avatardesk-root {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto,
    'Helvetica Neue', Arial, sans-serif;
  color: #1b1b1f;
}

.avatardesk-trigger {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: #1b1b1f;
  color: #fff;
  font-size: 24px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  transition: transform 120ms ease;
}
.avatardesk-trigger:hover { transform: scale(1.05); }
.avatardesk-trigger:focus-visible { outline: 2px solid #4f8cff; outline-offset: 3px; }

.avatardesk-modal {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 480px;
  height: 720px;
  max-height: calc(100vh - 120px);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.avatardesk-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8ee;
}
.avatardesk-modal__status { font-size: 14px; opacity: 0.7; }
.avatardesk-modal__share-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  font-size: 12px;
  color: #b42318;
  font-weight: 500;
}
.avatardesk-modal__share-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b42318;
  animation: avatardesk-pulse 1.4s ease-in-out infinite;
}
@keyframes avatardesk-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.7); }
}
.avatardesk-modal__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  padding: 4px 8px;
  color: #555;
}

.avatardesk-modal__video {
  flex: 1;
  background: #0a0a0d;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.avatardesk-modal__video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatardesk-modal__placeholder {
  color: #aaa;
  font-size: 14px;
}

.avatardesk-modal__controls {
  padding: 10px 16px;
  border-top: 1px solid #e8e8ee;
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatardesk-modal__mic-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #d8d8de;
  background: #fff;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease, border-color 120ms ease;
}
.avatardesk-modal__mic-btn[aria-pressed="true"] {
  background: #1b1b1f;
  color: #fff;
  border-color: #1b1b1f;
}
.avatardesk-modal__mic-btn:focus-visible {
  outline: 2px solid #4f8cff;
  outline-offset: 2px;
}
.avatardesk-modal__share-btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #d8d8de;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.avatardesk-modal__share-btn[aria-pressed="true"] {
  background: #b42318;
  color: #fff;
  border-color: #b42318;
}
.avatardesk-modal__share-btn:focus-visible {
  outline: 2px solid #4f8cff;
  outline-offset: 2px;
}
.avatardesk-modal__mic-level {
  flex: 1;
  height: 6px;
  background: #ececf0;
  border-radius: 999px;
  overflow: hidden;
}
.avatardesk-modal__mic-level-fill {
  height: 100%;
  background: #4f8cff;
  width: 0%;
  transition: width 80ms linear;
}
.avatardesk-modal__agent-state {
  font-size: 12px;
  color: #666;
  min-width: 90px;
  text-align: right;
}
.avatardesk-modal__mic-error {
  padding: 8px 16px;
  background: #fff5f5;
  border-top: 1px solid #fad7d7;
  color: #9c2b2b;
  font-size: 12px;
}
.avatardesk-modal__share-error {
  padding: 8px 16px;
  background: #fff5f5;
  border-top: 1px solid #fad7d7;
  color: #9c2b2b;
  font-size: 12px;
}

.avatardesk-consent {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 13, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 10;
}
.avatardesk-consent__card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 420px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}
.avatardesk-consent__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #1b1b1f;
}
.avatardesk-consent__body {
  font-size: 13px;
  line-height: 1.55;
  color: #444;
  margin: 0 0 16px;
}
.avatardesk-consent__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.avatardesk-consent__btn {
  border-radius: 8px;
  border: 1px solid #d8d8de;
  background: #fff;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}
.avatardesk-consent__btn--primary {
  background: #1b1b1f;
  color: #fff;
  border-color: #1b1b1f;
}
.avatardesk-consent__btn:focus-visible {
  outline: 2px solid #4f8cff;
  outline-offset: 2px;
}

.avatardesk-modal__footer {
  padding: 12px 16px;
  border-top: 1px solid #e8e8ee;
  display: flex;
  justify-content: center;
  font-size: 12px;
  color: #888;
}

@media (max-width: 540px) {
  .avatardesk-modal {
    bottom: 0;
    right: 0;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
  .avatardesk-root { bottom: 16px; right: 16px; }
}
`;

export function injectStyles(): void {
  if (document.getElementById('avatardesk-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'avatardesk-styles';
  style.textContent = WIDGET_STYLES;
  document.head.appendChild(style);
}
