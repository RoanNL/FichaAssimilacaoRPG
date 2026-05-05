document.addEventListener('DOMContentLoaded', () => {
    
    if (typeof Router !== 'undefined') {
        Router.abrirPerfil = function() {
            const modal = document.getElementById('perfil-modal');
            if (modal) {
                modal.classList.add('show');
                carregarDadosPerfil(); 
            }
        };
    }

    async function carregarDadosPerfil() {
        const usuarioId = sessionStorage.getItem('usuarioId');
        const nomeOperador = sessionStorage.getItem('usuarioNome');
        
        const labelNome = document.getElementById('perfil-nome-usuario');
        if (labelNome) labelNome.textContent = nomeOperador || "Operador Desconhecido";

        try {
            // 1. Busca os Dados do Usuário (Avatar)
            const resUser = await fetch(`${window.API_URL}/usuarios/me`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            if (resUser.ok) {
                const userData = await resUser.json();
                if (userData.avatar && !userData.avatar.includes('R0lGODlhAQAB')) {
                    sessionStorage.setItem('usuarioAvatar', userData.avatar);
                    document.getElementById('perfil-avatar-img').src = userData.avatar;
                    document.getElementById('nav-avatar-img').src = userData.avatar;
                }
            }

            // 2. Busca Personagens
            const resPersonagens = await fetch(`${window.API_URL}/personagens/usuario/${usuarioId}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const personagens = await resPersonagens.json();
            
            // 3. Busca Campanhas
            const resCampanhas = await fetch(`${window.API_URL}/campanhas/usuario/${usuarioId}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const campanhas = await resCampanhas.json();

            document.getElementById('perfil-count-chars').textContent = personagens.length || 0;
            document.getElementById('perfil-count-camps').textContent = campanhas.length || 0;

            const listaChars = document.getElementById('perfil-lista-chars');
            listaChars.innerHTML = '';
            if (personagens.length === 0) {
                listaChars.innerHTML = '<p class="text-sm text-gray-500 italic text-center py-4">Nenhum personagem.</p>';
            } else {
                personagens.forEach(p => {
                    listaChars.innerHTML += `
                        <div class="bg-gray-50 dark:bg-[#242424] p-2.5 rounded border border-gray-200 dark:border-gray-700 flex justify-between items-center hover:border-rpg-red transition-colors">
                            <span class="font-bold text-sm truncate max-w-[120px] text-gray-800 dark:text-white" title="${window.escaparHTML(p.nome_personagem)}">${window.escaparHTML(p.nome_personagem) || 'Sem Nome'}</span>
                            <span class="text-[10px] text-gray-500 font-bold uppercase truncate max-w-[80px]">${window.escaparHTML(p.ocupacao) || 'Desconhecido'}</span>
                        </div>
                    `;
                });
            }

            const listaCamps = document.getElementById('perfil-lista-camps');
            listaCamps.innerHTML = '';
            if (campanhas.length === 0) {
                listaCamps.innerHTML = '<p class="text-sm text-gray-500 italic text-center py-4">Nenhuma mesa.</p>';
            } else {
                campanhas.forEach(c => {
                    const badge = c.is_mestre 
                        ? '<i data-lucide="crown" class="w-4 h-4 text-rpg-blue" title="Mestre"></i>' 
                        : '<i data-lucide="swords" class="w-4 h-4 text-rpg-green" title="Jogador"></i>';
                        
                    listaCamps.innerHTML += `
                        <div class="bg-gray-50 dark:bg-[#242424] p-2.5 rounded border border-gray-200 dark:border-gray-700 flex justify-between items-center hover:border-rpg-blue transition-colors">
                            <span class="font-bold text-sm truncate max-w-[150px] text-gray-800 dark:text-white" title="${window.escaparHTML(c.nome)}">${window.escaparHTML(c.nome)}</span>
                            ${badge}
                        </div>
                    `;
                });
            }

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error("Erro ao carregar dados do perfil:", err);
        }
    }

    // ==========================================
    // UPLOAD E CORTE (CROP) DO AVATAR
    // ==========================================
    const inputAvatar = document.getElementById('input-avatar');
    
    if (inputAvatar) {
        inputAvatar.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const img = new Image();
                    img.onload = async function () {
                        
                        // Recorta a imagem em um Quadrado Perfeito e a comprime
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const SIZE = 400; // Tamanho ideal para avatares
                        canvas.width = SIZE;
                        canvas.height = SIZE;
                        
                        const minSize = Math.min(img.width, img.height);
                        const sx = (img.width - minSize) / 2;
                        const sy = (img.height - minSize) / 2;
                        
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, sx, sy, minSize, minSize, 0, 0, SIZE, SIZE);

                        const base64Foto = canvas.toDataURL('image/webp', 0.9);
                        
                        // Atualiza a interface instantaneamente
                        document.getElementById('perfil-avatar-img').src = base64Foto;
                        document.getElementById('nav-avatar-img').src = base64Foto;
                        document.getElementById('perfil-avatar-img').classList.add('animate-pulse');

                        try {
                            const res = await fetch(`${window.API_URL}/usuarios/avatar`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${sessionStorage.getItem('token')}` 
                                },
                                body: JSON.stringify({ foto: base64Foto })
                            });
                            
                            const data = await res.json();
                            
                            if (res.ok) {
                                window.mostrarNotificacao('Avatar atualizado no servidor!', 'sucesso');
                                sessionStorage.setItem('usuarioAvatar', data.avatar);
                            } else {
                                window.mostrarNotificacao(data.erro, 'erro');
                            }
                        } catch (err) {
                            window.mostrarNotificacao('Erro ao enviar avatar para o servidor.', 'erro');
                        } finally {
                            document.getElementById('perfil-avatar-img').classList.remove('animate-pulse');
                        }
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // CARREGAMENTO AUTOMÁTICO GLOBAL (FOTO DA NAVBAR)
    // ==========================================
    window.carregarAvatarGlobal = async function() {
        const token = sessionStorage.getItem('token');
        const navImg = document.getElementById('nav-avatar-img');
        
        // Se não tiver logado ou não tiver a barra de navegação, nem tenta
        if (!token || !navImg) return;

        try {
            // Busca os dados do usuário direto da sua rota /usuarios/me
            const resUser = await fetch(`${window.API_URL}/usuarios/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (resUser.ok) {
                const userData = await resUser.json();
                if (userData.avatar && !userData.avatar.includes('R0lGODlhAQAB')) {
                    // Atualiza a imagem na Navbar imediatamente
                    navImg.src = userData.avatar;
                    // Já deixa salvo no cache para uso rápido depois
                    sessionStorage.setItem('usuarioAvatar', userData.avatar);
                }
            }
        } catch (err) {
            console.error('Erro silencioso ao carregar o avatar da nav bar:', err);
        }
    };

    // Roda a função automaticamente assim que o arquivo JS é carregado
    // (Útil para quando o usuário dá F5 e já está com o token no navegador)
    if (sessionStorage.getItem('token')) {
        window.carregarAvatarGlobal();
    }
});
