// search.js - in-launcher search that searches apps, games, and simple commands
(function(){
  // launcher search in docs/desktop.html uses #launcherSearch input
  const launcherSearch = document.getElementById('launcherSearch');
  const appGrid = document.querySelector('.app-grid');

  function getBuiltinApps(){
    const apps = [];
    document.querySelectorAll('.app').forEach(el => apps.push({ name: el.textContent.trim(), kind: 'app', element: el }));
    return apps;
  }

  async function getGames(){
    try {
      const raw = JSON.parse(localStorage.getItem('aether_games') || '[]');
      return raw.map(g => ({ name: g.name, kind: 'game', data: g }));
    } catch(e){ return []; }
  }

  async function search(q){
    const built = getBuiltinApps();
    const games = await getGames();
    const all = [...built, ...games];
    return all.filter(a => a.name.toLowerCase().includes(q.toLowerCase()));
  }

  launcherSearch?.addEventListener('input', async (e)=>{
    const q = e.target.value.trim();
    if(!q) { // restore full grid
      document.querySelectorAll('.app').forEach(a=>a.style.display='flex');
      return;
    }
    const res = await search(q);
    // hide all built apps then show matches
    document.querySelectorAll('.app').forEach(a=>a.style.display='none');
    res.forEach(r => {
      if (r.element) r.element.style.display='flex';
      else if (r.kind === 'game') {
        // show a small badge in the launcher (inject if needed)
        const badge = document.createElement('div'); badge.className='app'; badge.textContent = r.name; badge.addEventListener('click', ()=>{ window.location.href='apps/game-launcher.html'; });
        appGrid.appendChild(badge);
      }
    });
  });
})();
