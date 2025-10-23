const $=(id)=>document.getElementById(id); const panel=$('panel'),browser=$('browser'),title=$('title'),url=$('url');
window.floatingTab.onTabInfo(({browser:b='',title:t='',url:u=''})=>{browser.textContent=b||'—';title.textContent=t||'—';url.textContent=u||'—'});
window.floatingTab.onMode(({compact=false}={})=>{panel.classList.toggle('compact',!!compact)});
