// games.js - UI for scanning and launching games (works in Electron and browser fallback)
(async function(){
  const scanBtn = document.getElementById('scanBtn');
  const gamesList = document.getElementById('gamesList');
  const addCustomBtn = document.getElementById('addCustom');
  const customForm = document.getElementById('customForm');
  const saveCustom = document.getElementById('saveCustom');
  const cancelCustom = document.getElementById('cancelCustom');
  const customName = document.getElementById('customName');
  const customExec = document.getElementById('customExec');
  const gameFilter = document.getElementById('gameFilter');

  let games = JSON.parse(localStorage.getItem('aether_games') || '[]');

  function render(list){
    gamesList.innerHTML = '';
    list.forEach(g => {
      const card = document.createElement('div');
      card.className = 'app';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'center';
      card.style.alignItems = 'center';
      card.style.padding = '12px';
      card.innerHTML = `<div style="font-weight:500;margin-bottom:8px">${g.name}</div><div style="font-size:12px;color:#ccc;margin-bottom:8px">${g.source||g.kind||'custom'}</div><div style="display:flex;gap:8px"><button class="btn launch">Launch</button><button class="btn ghost edit">Edit</button></div>`;
      const launchBtn = card.querySelector('.launch');
      const editBtn = card.querySelector('.edit');
      launchBtn.addEventListener('click', async ()=>{
        if (window.aether && window.aether.sys && (g.execPath || g.url || g.folder)) {
          const entry = {};
          if (g.url) entry.url = g.url;
          if (g.execPath) entry.execPath = g.execPath;
          if (g.folder) entry.folder = g.folder;
          const res = await window.aether.sys.launchGame(entry);
          if (res && res.error) alert('Launch error: '+res.error);
        } else {
          alert('Launching games requires the Electron prototype. In browser fallback you can copy the path.');
        }
      });
      editBtn.addEventListener('click', ()=>{
        customForm.classList.remove('hidden');
        customName.value = g.name || '';
        customExec.value = g.execPath || g.url || g.folder || '';
        saveCustom.onclick = ()=>{ g.name = customName.value; g.execPath = customExec.value; localStorage.setItem('aether_games', JSON.stringify(games)); customForm.classList.add('hidden'); render(games); };
      });
      gamesList.appendChild(card);
    });
  }

  function mergeFound(found){
    // normalize to our games format
    const normalized = found.map(f => ({ name: f.name, folder: f.folder, executables: f.executables, source: f.source }));
    // merge with local custom games (avoid duplicates by folder or name)
    const merged = [...games];
    normalized.forEach(n => {
      if(!merged.some(m => m.folder === n.folder || m.name === n.name)) merged.push(n);
    });
    games = merged;
    localStorage.setItem('aether_games', JSON.stringify(games));
    render(games);
  }

  scanBtn.addEventListener('click', async ()=>{
    scanBtn.disabled = true; scanBtn.textContent = 'Scanning…';
    if (window.aether && window.aether.sys && window.aether.sys.scanGames) {
      const found = await window.aether.sys.scanGames();
      mergeFound(found || []);
    } else {
      alert('Scan is available in the Electron app only.');
    }
    scanBtn.disabled = false; scanBtn.textContent = 'Scan for Steam/Epic';
  });

  addCustomBtn.addEventListener('click', ()=>{ customForm.classList.remove('hidden'); });
  cancelCustom.addEventListener('click', ()=>{ customForm.classList.add('hidden'); });
  saveCustom.addEventListener('click', ()=>{
    const name = customName.value.trim(); const exec = customExec.value.trim();
    if (!name || !exec) { alert('Provide name and executable or URL'); return; }
    games.push({ name, execPath: exec, url: exec });
    localStorage.setItem('aether_games', JSON.stringify(games));
    customForm.classList.add('hidden'); render(games);
  });

  gameFilter.addEventListener('input', ()=>{
    const q = gameFilter.value.toLowerCase().trim();
    if(!q) render(games);
    else render(games.filter(g => (g.name||'').toLowerCase().includes(q) || (g.source||'').toLowerCase().includes(q)));
  });

  // initial render
  render(games);

})();
