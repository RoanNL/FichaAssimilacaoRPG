// js/tema.js

document.addEventListener('DOMContentLoaded', () => {
    const btnToggleTemaApp = document.getElementById('btn-toggle-tema'); 
    const btnToggleTemaAuth = document.getElementById('auth-theme-toggle'); 
    
    // 🔥 A MÁGICA ESTÁ AQUI: Pegamos a tag <html> inteira!
    const htmlRoot = document.documentElement; 
    const corpoDoSite = document.body;

    function atualizarBotoesTema(isDark) {
        const iconApp = isDark ? '<i data-lucide="sun" class="w-5 h-5"></i>' : '<i data-lucide="moon" class="w-5 h-5"></i>';
        const iconAuth = isDark ? '<i data-lucide="sun" class="w-6 h-6"></i>' : '<i data-lucide="moon" class="w-6 h-6"></i>';
        
        if (btnToggleTemaApp) btnToggleTemaApp.innerHTML = iconApp;
        if (btnToggleTemaAuth) btnToggleTemaAuth.innerHTML = iconAuth;
        
        // Renderiza os novos ícones do Lucide nos botões
        if (window.lucide) lucide.createIcons();
    }

    function alternarTema(e) {
        if(e) e.preventDefault();
        
        // Aplicamos a escuridão na tag <html> (Para o Tailwind) e no <body> (Para o seu CSS Antigo)
        htmlRoot.classList.toggle('dark');
        corpoDoSite.classList.toggle('dark');
        
        const isDark = htmlRoot.classList.contains('dark');
        
        // Salva na memória
        localStorage.setItem('tema-rpg-assimilacao', isDark ? 'dark' : 'light');
        
        atualizarBotoesTema(isDark);

        // Troca os dados do rolador caso ele esteja aberto
        document.querySelectorAll('#rolador-historico img, #rolador-resultados-atuais img').forEach(img => {
            if (img.src.includes('icon.jpg')) return; 

            if (isDark) {
                if (!img.src.includes('-branco.png')) {
                    img.src = img.src.replace('.png', '-branco.png');
                }
            } else {
                img.src = img.src.replace('-branco.png', '.png');
            }
        });
    }

    if (btnToggleTemaApp) btnToggleTemaApp.addEventListener('click', alternarTema);
    if (btnToggleTemaAuth) btnToggleTemaAuth.addEventListener('click', alternarTema);

    // Verifica a memória ao carregar a página
    const temaSalvo = localStorage.getItem('tema-rpg-assimilacao');

    if (temaSalvo === 'dark') {
        htmlRoot.classList.add('dark');
        corpoDoSite.classList.add('dark');
        atualizarBotoesTema(true);
    } else {
        htmlRoot.classList.remove('dark');
        corpoDoSite.classList.remove('dark');
        atualizarBotoesTema(false);
    }
});