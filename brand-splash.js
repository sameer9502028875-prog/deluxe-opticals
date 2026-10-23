/* Delux Opticals — branded launch screen for installed web app.
   Android's system splash can crop the app icon; this screen displays the
   full brand immediately afterwards. Does not affect regular browser visits. */
(() => {
  'use strict';
  const standalone = window.matchMedia &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = window.navigator.standalone === true;
  if (!standalone && !iosStandalone) return;

  function startBrandSplash() {
    if (document.getElementById('deluxBrandSplash')) return;
    const style = document.createElement('style');
    style.id = 'deluxBrandSplashStyles';
    style.textContent = `
      #deluxBrandSplash {
        position: fixed; inset: 0; z-index: 2147483647;
        background: #111; display: flex; align-items: center;
        justify-content: center; flex-direction: column;
        padding: 28px; box-sizing: border-box;
        opacity: 1; transition: opacity 280ms ease;
      }
      #deluxBrandSplash.deluxBrandSplashExit {
        opacity: 0; pointer-events: none;
      }
      #deluxBrandSplash .deluxBrandMark {
        width: min(350px, 82vw); height: min(245px, 57.4vw);
        overflow: hidden; flex: none; position: relative;
      }
      #deluxBrandSplash .deluxBrandMark img {
        display: block; width: 100%; height: auto;
        border: 0; object-fit: contain;
      }
      #deluxBrandSplash .deluxBrandName {
        color: #f8f8f8; font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(15px, 4vw, 23px); font-weight: 700;
        letter-spacing: clamp(2px, 0.7vw, 5px);
        text-align: center; white-space: nowrap;
        margin-top: 4px; line-height: 1.45;
      }
      @media (prefers-reduced-motion: reduce) {
        #deluxBrandSplash { transition: none; }
      }
    `;
    document.head.appendChild(style);

    const splash = document.createElement('div');
    splash.id = 'deluxBrandSplash';
    splash.setAttribute('role', 'status');
    splash.setAttribute('aria-label', 'Delux Opticals opening');
    splash.innerHTML = '<div class="deluxBrandMark"><img src="/icon-512.png?v=brand-name-1" alt="DO" /></div><div class="deluxBrandName">DELUX OPTICALS</div>';
    document.body.appendChild(splash);

    window.setTimeout(() => {
      splash.classList.add('deluxBrandSplashExit');
      window.setTimeout(() => {
        splash.remove();
        style.remove();
      }, 300);
    }, 1250);
  }

  if (document.body) startBrandSplash();
  else document.addEventListener('DOMContentLoaded', startBrandSplash, { once: true });
})();
