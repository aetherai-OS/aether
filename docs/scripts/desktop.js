// desktop.js - boot sequence and simple window manager
(function(){
  const boot = document.getElementById('bootOverlay');
  const bootLogo = document.getElementById('bootLogo');
  const desktopUI = document.getElementById('desktopUI');
  const wallpaper = document.getElementById('wallpaper');
  const launcherBtn = document.getElementById('launcherBtn');
  const launcher = document.getElementById('launcher');
  const windowsRoot = document.getElementById('windows');

  function fadeOut(el, ms=700){
    el.style.transition = `opacity ${ms}ms ease, transform ${ms}ms ease`;
    el.style.opacity = 0;
    setTimeout(()=>el.classList.add('hidden'), ms);
  }
  function fadeIn(el, ms=700){ el.classList.remove('hidden'); el.style.opacity = 0; setTimeout(()=>el.style.transition=`opacity ${ms}ms ease`,10); setTimeout(()=>el.style.opacity=1,20); }

  // Boot timeline
  setTimeout(()=>{ bootLogo.style.transform = 'scale(0.92)'; }, 400);
  setTimeout(()=>{ bootLogo.style.transform = 'scale(1)'; bootLogo.style.opacity = 1; }, 1200);
  setTimeout(()=>{ // complete boot
    fadeOut(boot, 900);
    setTimeout(()=>{ desktopUI.classList.remove('hidden'); desktopUI.style.opacity=1; }, 950);
  }, 2400);

  // Launcher
  launcherBtn.addEventListener('click', ()=>{ launcher.classList.toggle('hidden'); });
  document.getElementById('launcher')?.addEventListener('click', e=>{
    const app = e.target.closest('.app');
    if(!app) return;
    const name = app.dataset.app;
    openApp(name);
  });

  function openApp(name){
    if(name==='terminal') createWindow('Terminal', terminalContent());
    if(name==='browser') createWindow('Browser', '<div style="padding:12px">Aether Browser (mockup)</div>');
    if(name==='files') createWindow('Files', '<div style="padding:12px">File Manager (mockup)</div>');
    if(name==='settings') createWindow('Settings', '<div style="padding:12px">Settings (mockup)</div>');
  }

  function createWindow(title, html){
    const win = document.createElement('div'); win.className='window';
    win.style.left = (50 + Math.random()*200)+'px'; win.style.top = (70 + Math.random()*120)+'px';
    win.innerHTML = `<div class="title"> <div>${title}</div> <div><button class="close">✕</button></div></div><div class="content">${html}</div>`;
    windowsRoot.appendChild(win);
    // close
    win.querySelector('.close')?.addEventListener('click', ()=>win.remove());
    makeDraggable(win);
  }

  function makeDraggable(el){
    const title = el.querySelector('.title');
    let dragging=false, ox=0, oy=0;
    title.addEventListener('pointerdown', (e)=>{ dragging=true; ox = e.clientX - el.offsetLeft; oy = e.clientY - el.offsetTop; el.setPointerCapture(e.pointerId); });
    title.addEventListener('pointermove', (e)=>{ if(!dragging) return; el.style.left = (e.clientX - ox)+'px'; el.style.top = (e.clientY - oy)+'px'; });
    title.addEventListener('pointerup', (e)=>{ dragging=false; try{ el.releasePointerCapture(e.pointerId); }catch(e){} });
  }

  function terminalContent(){
    return `<div class="terminal" id="term_`+Date.now()+`" contenteditable="true">Welcome to AetherOS Terminal\n$ </div>`;
  }

  // Basic keyboard: Enter in terminal creates new line
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && document.activeElement?.classList?.contains('terminal')){
      e.preventDefault();
      const el = document.activeElement;
      const text = '\n$ ';
      document.execCommand('insertText', false, text);
      // scroll to bottom
      el.scrollTop = el.scrollHeight;
    }
  });

})();
