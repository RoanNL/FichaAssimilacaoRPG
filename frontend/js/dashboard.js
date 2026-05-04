// Função global para evitar Injeção de Código (XSS)
window.escaparHTML = function(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
};

document.addEventListener('DOMContentLoaded', () => {
    
    const gridPersonagens = document.getElementById('grid-meus-personagens');
    const gridCampanhas = document.getElementById('grid-minhas-campanhas');
    const charSelectCampanha = document.getElementById('char-select-campanha');

    window.personagensCarregados = [];

    // ==========================================
    // 0. BOTÃO DE CRIAR NOVO PERSONAGEM
    // ==========================================
    const btnNovoPersonagem = document.getElementById('btn-novo-personagem-dash');
    if (btnNovoPersonagem) {
        btnNovoPersonagem.addEventListener('click', () => {
            sessionStorage.removeItem('personagemAtivoId');
            if (typeof window.limparFicha === 'function') window.limparFicha();
            Router.navigate('ficha');
        });
    }

    // ==========================================
    // 1. CARREGAR E EXIBIR PERSONAGENS
    // ==========================================
    window.carregarListaPersonagens = async function() {
        const usuarioLogadoId = sessionStorage.getItem('usuarioId');
        if (!usuarioLogadoId) return;

        if (gridPersonagens) {
            // 🔥 LOADING ANIMADO COM A LOGO
            gridPersonagens.className = 'flex flex-row gap-4 overflow-x-auto pb-4 pt-2 px-1 snap-x';
            gridPersonagens.innerHTML = `
                <div class="col-span-full w-full flex flex-col items-center justify-center p-8">
                    <img src="./assets/icon.jpg" class="w-14 h-14 rounded-full animate-spin mb-4 shadow-lg border-2 border-rpg-red">
                    <p class="text-gray-500 dark:text-gray-400 italic font-bold font-rpg uppercase tracking-widest animate-pulse">Buscando registros vitais...</p>
                </div>
            `;
        }

        try {
            const resposta = await fetch(`${window.API_URL}/personagens/usuario/${usuarioLogadoId}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            
            if (!resposta.ok) throw new Error("Erro ao buscar personagens");
            
            window.personagensCarregados = await resposta.json();

            if (charSelectCampanha) {
                charSelectCampanha.innerHTML = '<option value="">-- Selecione seu Personagem --</option>';
                window.personagensCarregados.forEach(char => {
                    const opt = document.createElement('option');
                    opt.value = char.id;
                    opt.textContent = char.nome_personagem || 'Sem Nome';
                    charSelectCampanha.appendChild(opt);
                });
            }

            if (gridPersonagens) {
                gridPersonagens.innerHTML = '';
                
                if (window.personagensCarregados.length === 0) {
                    gridPersonagens.innerHTML = '<p class="text-gray-500 italic p-4 w-full text-center border border-dashed border-gray-300 dark:border-gray-600 rounded">Nenhum personagem encontrado. Crie um novo para começar!</p>';
                    return;
                }

                // 🔥 CARDS DOS PERSONAGENS SALVOS
                window.personagensCarregados.forEach(char => {
                    const fotoBase64 = char.foto;
                    const ocupacao = char.ocupacao || 'Desconhecido';
                    const placeholderInterno = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='130'%3E%3Crect width='110' height='130' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' font-size='40' fill='%23555' dominant-baseline='middle' text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E";
                    const imgSrc = (fotoBase64 && !fotoBase64.includes('R0lGODlhAQAB')) ? fotoBase64 : placeholderInterno;

                    const card = document.createElement('div');
                    card.className = 'flex flex-row h-[130px] w-[300px] min-w-[300px] flex-shrink-0 bg-white dark:bg-[#242424] rounded-lg overflow-hidden border border-gray-300 dark:border-[#333] hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all cursor-default snap-start relative group';
                    
                    card.innerHTML = `
                        <img src="${imgSrc}" class="w-[110px] h-[130px] min-h-[130px] object-cover flex-shrink-0 border-r border-gray-300 dark:border-[#333] bg-black" alt="Foto">
                        <div class="flex flex-col justify-start p-4 flex-grow overflow-hidden">
                            <h3 class="text-gray-800 dark:text-white font-bold text-lg m-0 truncate" title="${window.escaparHTML(char.nome_personagem)}">
                                ${window.escaparHTML(char.nome_personagem) || 'Sem Nome'}
                            </h3>
                            <p class="text-gray-500 dark:text-gray-400 text-xs m-0 mb-3 truncate">${window.escaparHTML(ocupacao)}</p>
                            
                            <button class="btn-acessar-ficha mt-auto w-max bg-rpg-blue hover:bg-[#2c6270] text-white px-3 py-1.5 rounded text-xs font-bold font-rpg uppercase shadow transition-colors z-10" data-id="${char.id}">
                                Inspecionar
                            </button>
                        </div>
                    `;
                    gridPersonagens.appendChild(card);
                });

                document.querySelectorAll('.btn-acessar-ficha').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idSelecionado = e.target.getAttribute('data-id');
                        sessionStorage.setItem('personagemAtivoId', idSelecionado);
                        if (typeof window.carregarPersonagem === 'function') window.carregarPersonagem(idSelecionado);
                        Router.navigate('ficha');
                    });
                });

                if (window.lucide) lucide.createIcons();
            }

        } catch (erro) {
            console.error('Erro ao buscar lista de personagens:', erro);
            if (gridPersonagens) gridPersonagens.innerHTML = '<p class="text-rpg-red p-4">Erro ao carregar personagens.</p>';
        }
    };

    // ==========================================
    // 2. CARREGAR E EXIBIR CAMPANHAS
    // ==========================================
    window.carregarMinhasCampanhas = async function() {
        const usuarioLogadoId = sessionStorage.getItem('usuarioId');
        if (!usuarioLogadoId || !gridCampanhas) return;

        // 🔥 LOADING ANIMADO COM A LOGO
        gridCampanhas.innerHTML = `
            <div class="md:col-span-3 w-full flex flex-col items-center justify-center p-8">
                <img src="./assets/icon.jpg" class="w-14 h-14 rounded-full animate-spin mb-4 shadow-lg border-2 border-rpg-blue">
                <p class="text-gray-500 dark:text-gray-400 italic font-bold font-rpg uppercase tracking-widest animate-pulse">Conectando aos servidores...</p>
            </div>
        `;
        
        try {
            const resposta = await fetch(`${window.API_URL}/campanhas/usuario/${usuarioLogadoId}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const campanhas = await resposta.json();

            if (campanhas.length === 0) {
                gridCampanhas.innerHTML = '<p class="text-gray-500 italic md:col-span-3 text-center py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded">Você ainda não participa de nenhuma mesa.</p>';
                return;
            }

            gridCampanhas.innerHTML = '';
            campanhas.forEach(camp => {
                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:border-rpg-blue hover:shadow-lg transition-all flex flex-col justify-between h-[190px] relative overflow-hidden';

                const badge = camp.is_mestre
                    ? `<span class="bg-rpg-blue text-white px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 mt-2 w-max shadow-sm"><i data-lucide="crown" class="w-3 h-3"></i> Mestre (Cód: ${camp.codigo_convite})</span>`
                    : `<span class="bg-rpg-green text-white px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 mt-2 w-max shadow-sm"><i data-lucide="swords" class="w-3 h-3"></i> Jogador</span>`;

                const btnExcluir = camp.is_mestre
                    ? `<button class="btn-excluir-campanha flex items-center justify-center gap-2 w-full mt-2 mb-1 bg-rpg-red hover:bg-red-800 text-white font-bold py-2 rounded text-xs uppercase font-rpg transition-colors shadow-sm" data-id="${camp.id}" data-nome="${camp.nome}"><i data-lucide="flame" class="w-4 h-4"></i> Destruir Mesa</button>`
                    : '';

                const bordaTopo = camp.is_mestre ? 'border-t-4 border-t-rpg-blue' : 'border-t-4 border-t-rpg-green';

                card.innerHTML = `
                    <div class="absolute inset-x-0 top-0 h-1 ${bordaTopo}"></div>
                    <div class="mb-2">
                        <h4 class="text-xl font-black text-gray-800 dark:text-white m-0 truncate" title="${window.escaparHTML(camp.nome)}">${window.escaparHTML(camp.nome)}</h4>
                        ${badge}
                    </div>
                    <div class="flex flex-col mt-auto pt-2">
                        <button class="btn-jogar-campanha bg-gray-800 dark:bg-gray-100 text-white dark:text-black hover:bg-black dark:hover:bg-white font-bold py-2.5 rounded text-sm uppercase font-rpg transition-colors flex justify-center items-center gap-2 shadow-sm" data-id="${camp.id}" data-mestre="${camp.is_mestre}" data-nome="${window.escaparHTML(camp.nome)}" data-codigo="${camp.codigo_convite}">
                            <i data-lucide="play" class="w-4 h-4 fill-current"></i> Entrar na Mesa
                        </button>
                        ${btnExcluir}
                    </div>
                `;
                gridCampanhas.appendChild(card);
            });

            document.querySelectorAll('.btn-jogar-campanha').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget;
                    const idCampanha = target.getAttribute('data-id');
                    const isMestre = target.getAttribute('data-mestre') === 'true';
                    const nomeCampanha = target.getAttribute('data-nome');
                    const codigoCampanha = target.getAttribute('data-codigo');

                    sessionStorage.setItem('campanhaAtiva', idCampanha);
                    sessionStorage.setItem('isMestreAtivo', isMestre);
                    sessionStorage.setItem('campanhaNome', nomeCampanha);
                    sessionStorage.setItem('campanhaCodigo', codigoCampanha);

                    if (typeof window.carregarLobbyCampanha === 'function') window.carregarLobbyCampanha();
                    Router.navigate('campanha'); 
                    window.mostrarNotificacao(`Conectado à mesa: ${nomeCampanha}`, 'sucesso');
                });
            });

            if (window.lucide) lucide.createIcons();

        } catch (erro) {
            gridCampanhas.innerHTML = '<p class="text-rpg-red md:col-span-3 text-center">Erro ao carregar campanhas.</p>';
        }
    };

    // ==========================================
    // 3. CRIAR NOVA CAMPANHA (MESTRE)
    // ==========================================
    const btnCriarCampanha = document.getElementById('btn-criar-campanha');
    const nomeCampanhaInput = document.getElementById('nova-campanha-nome');
    
    if (btnCriarCampanha) {
        btnCriarCampanha.addEventListener('click', async () => {
            const nome = nomeCampanhaInput.value.trim();
            if (!nome) return window.mostrarNotificacao("Digite um nome para a campanha!", 'erro');

            btnCriarCampanha.textContent = "Criando...";
            btnCriarCampanha.disabled = true;

            try {
                const resposta = await fetch(`${window.API_URL}/campanhas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ nome })
                });
                const dados = await resposta.json();

                if (resposta.ok) {
                    window.mostrarNotificacao(`Mesa fundada!\nCódigo: ${dados.codigo}`, 'sucesso');
                    nomeCampanhaInput.value = '';
                    document.getElementById('modal-criar-campanha').classList.remove('show');
                    window.carregarMinhasCampanhas();
                } else {
                    window.mostrarNotificacao(dados.erro, 'erro');
                }
            } catch (erro) {
                window.mostrarNotificacao("Erro de conexão com o servidor.", 'erro');
            } finally {
                btnCriarCampanha.textContent = "Criar";
                btnCriarCampanha.disabled = false;
            }
        });
    }

    // ==========================================
    // 4. ENTRAR EM CAMPANHA (JOGADOR)
    // ==========================================
    const btnEntrarCampanha = document.getElementById('btn-entrar-campanha');
    const codigoConviteInput = document.getElementById('codigo-convite-input');

    if (btnEntrarCampanha) {
        btnEntrarCampanha.addEventListener('click', async () => {
            const codigo_convite = codigoConviteInput.value.trim().toUpperCase();
            const personagem_id = charSelectCampanha.value;

            if (!codigo_convite) return window.mostrarNotificacao("Digite o código de convite!", 'aviso');
            if (!personagem_id) return window.mostrarNotificacao("Selecione qual personagem vai entrar!", 'aviso');

            btnEntrarCampanha.textContent = "Conectando...";
            btnEntrarCampanha.disabled = true;

            try {
                const resposta = await fetch(`${window.API_URL}/campanhas/entrar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ codigo_convite, personagem_id })
                });
                const dados = await resposta.json();

                if (resposta.ok) {
                    window.mostrarNotificacao(dados.mensagem, 'sucesso');
                    codigoConviteInput.value = '';
                    document.getElementById('modal-entrar-campanha').classList.remove('show');
                    window.carregarMinhasCampanhas();
                } else {
                    window.mostrarNotificacao(dados.erro, 'erro');
                }
            } catch (erro) {
                window.mostrarNotificacao("Erro de conexão.", 'erro');
            } finally {
                btnEntrarCampanha.textContent = "Entrar";
                btnEntrarCampanha.disabled = false;
            }
        });
    }

    // ==========================================
    // 5. DESTRUIR MESA (SEGURANÇA MAXIMA)
    // ==========================================
    const modalDeleteCamp = document.getElementById('delete-camp-modal');
    const inputDeleteCamp = document.getElementById('delete-camp-input');
    const btnConfirmDeleteCamp = document.getElementById('btn-confirm-delete-camp');
    const btnCancelDeleteCamp = document.getElementById('btn-cancel-delete-camp');
    const targetNameCamp = document.getElementById('delete-camp-target-name');

    let campanhaIdParaDeletar = null;
    let nomeDaCampanhaLimpo = '';

    document.addEventListener('click', (e) => {
        const btnExcluir = e.target.closest('.btn-excluir-campanha');
        if (btnExcluir) {
            campanhaIdParaDeletar = btnExcluir.getAttribute('data-id');
            const nomeDaCampanhaCru = btnExcluir.getAttribute('data-nome') || '';

            nomeDaCampanhaLimpo = nomeDaCampanhaCru.trim().toLowerCase();
            targetNameCamp.textContent = nomeDaCampanhaLimpo;

            inputDeleteCamp.value = '';
            btnConfirmDeleteCamp.disabled = true;
            btnConfirmDeleteCamp.classList.add('opacity-50', 'cursor-not-allowed');

            modalDeleteCamp.classList.add('show');
        }
    });

    if (inputDeleteCamp) {
        inputDeleteCamp.addEventListener('input', (e) => {
            const textoDigitado = e.target.value.trim().toLowerCase();
            if (textoDigitado === nomeDaCampanhaLimpo) {
                btnConfirmDeleteCamp.disabled = false;
                btnConfirmDeleteCamp.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btnConfirmDeleteCamp.disabled = true;
                btnConfirmDeleteCamp.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    if (btnCancelDeleteCamp) {
        btnCancelDeleteCamp.addEventListener('click', () => {
            modalDeleteCamp.classList.remove('show');
            campanhaIdParaDeletar = null;
        });
    }

    if (btnConfirmDeleteCamp) {
        btnConfirmDeleteCamp.addEventListener('click', async () => {
            if (!campanhaIdParaDeletar) return;
            
            const iconeOriginal = btnConfirmDeleteCamp.innerHTML;
            btnConfirmDeleteCamp.innerHTML = "Destruindo...";
            btnConfirmDeleteCamp.disabled = true;

            try {
                const resposta = await fetch(`${window.API_URL}/campanhas/${campanhaIdParaDeletar}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                const dados = await resposta.json();

                if (resposta.ok) {
                    window.mostrarNotificacao(dados.mensagem, 'sucesso');
                    modalDeleteCamp.classList.remove('show');
                    window.carregarMinhasCampanhas();
                } else {
                    window.mostrarNotificacao(dados.erro, 'erro');
                }
            } catch (err) {
                window.mostrarNotificacao("Erro crítico ao excluir mesa.", 'erro');
            } finally {
                btnConfirmDeleteCamp.innerHTML = iconeOriginal;
            }
        });
    }
});