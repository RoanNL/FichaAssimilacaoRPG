document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. INICIALIZAÇÃO DO MULTIPLAYER (SOCKET.IO)
    // ==========================================
    // Inicia a conexão global para que o rolador.js possa usá-la depois
    window.socket = io(window.API_URL);

    window.socket.on('connect', () => {
        const campanhaAtiva = sessionStorage.getItem('campanhaAtiva');
        if (campanhaAtiva) {
            window.socket.emit('entrar-na-campanha', {
                campanhaId: campanhaAtiva,
                token: sessionStorage.getItem('token')
            });
        }
    });

    // Se o Mestre destruir a mesa, todos os jogadores são expulsos em tempo real!
    window.socket.on('mesa-encerrada', () => {
        window.mostrarNotificacao("🚨 O Mestre encerrou esta campanha permanentemente!", 'aviso');
        sessionStorage.removeItem('campanhaAtiva');
        sessionStorage.removeItem('isMestreAtivo');
        sessionStorage.removeItem('campanhaNome');
        sessionStorage.removeItem('campanhaCodigo');
        Router.navigate('dashboard');
    });

    // ==========================================
    // 2. CARREGAR LOBBY DA CAMPANHA
    // ==========================================
    window.carregarLobbyCampanha = async function() {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        const nomeCampanha = sessionStorage.getItem('campanhaNome');
        const codigoCampanha = sessionStorage.getItem('campanhaCodigo');

        if (!campanhaId) return;

        // Atualiza a Capa da Campanha
        document.getElementById('campanha-titulo-view').textContent = nomeCampanha || 'Mesa Desconhecida';
        document.getElementById('campanha-codigo-view').textContent = codigoCampanha || '---';

        // Segredos do Mestre (Partitura e Refúgio)
        const painelMestre = document.getElementById('painel-mestre-botoes');
        if (isMestre) {
            painelMestre.classList.remove('hidden');
        } else {
            painelMestre.classList.add('hidden');
        }

        // Reconecta a sala caso o socket tenha caído
        if (window.socket.connected) {
            window.socket.emit('entrar-na-campanha', {
                campanhaId: campanhaId,
                token: sessionStorage.getItem('token')
            });
        }

        // Carrega os dados visuais
        await carregarFichasDaMesa(campanhaId, isMestre);
        
        const secaoJogadores = document.getElementById('grid-jogadores-mesa-view').parentElement;
        if (isMestre) {
            secaoJogadores.style.display = 'block'; // Mostra a área de expulsar
            await carregarJogadoresDaMesa(campanhaId);
        } else {
            secaoJogadores.style.display = 'none'; // Esconde para reles mortais
        }
    };

    // ==========================================
    // 3. RENDERIZAR FICHAS DOS ALIADOS
    // ==========================================
    async function carregarFichasDaMesa(campanhaId, isMestre) {
        const gridFichas = document.getElementById('grid-fichas-mesa-view');
        gridFichas.innerHTML = '<p class="text-gray-500 italic animate-pulse">Procurando sobreviventes...</p>';

        try {
            // O backend do Mestre entrega mais dados que o do Jogador
            const endpoint = isMestre ? `/campanhas/${campanhaId}/fichas-mesa` : `/campanhas/${campanhaId}/personagens`;
            
            const resposta = await fetch(`${window.API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            
            if (!resposta.ok) throw new Error("Erro ao buscar fichas");
            let fichas = await resposta.json();

            // Se for o Mestre, remove a ficha dele mesmo da lista (para não poluir)
            const meuId = sessionStorage.getItem('usuarioId');
            if (isMestre) {
                fichas = fichas.filter(char => char.usuario_id != meuId);
            }

            gridFichas.innerHTML = '';

            if (fichas.length === 0) {
                gridFichas.innerHTML = '<p class="text-gray-500 italic">Nenhum jogador aliado detectado.</p>';
                return;
            }

            fichas.forEach(char => {
                const card = document.createElement('div');
                card.className = 'flex flex-row h-[130px] w-[300px] min-w-[300px] flex-shrink-0 bg-white dark:bg-[#242424] rounded-lg overflow-hidden border border-gray-300 dark:border-[#333] hover:-translate-y-1 hover:shadow-lg transition-all cursor-default snap-start relative';

                const imgSrc = (char.foto && !char.foto.includes('R0lGODlhAQAB')) ? char.foto : './assets/icon.jpg';
                const nomeJogador = isMestre ? char.nome_conta : "Aliado";

                card.innerHTML = `
                    <img src="${imgSrc}" class="w-[110px] h-[130px] min-h-[130px] object-cover flex-shrink-0 border-r border-gray-300 dark:border-[#333] bg-black" alt="Foto">
                    <div class="flex flex-col justify-start p-4 flex-grow overflow-hidden">
                        <h3 class="text-gray-800 dark:text-white font-bold text-lg m-0 truncate" title="${window.escaparHTML(char.nome_personagem)}">
                            ${window.escaparHTML(char.nome_personagem) || 'Sem Nome'}
                        </h3>
                        <p class="text-rpg-red dark:text-orange-500 font-bold text-[10px] uppercase m-0 mt-1 truncate">👤 ${window.escaparHTML(nomeJogador)}</p>
                        
                        <button class="btn-inspecionar-ficha mt-auto w-max bg-rpg-blue hover:bg-[#2c6270] text-white px-3 py-1.5 rounded text-xs font-bold font-rpg uppercase shadow transition-colors z-10" data-id="${char.id}">
                            Inspecionar
                        </button>
                    </div>
                `;
                gridFichas.appendChild(card);
            });

            document.querySelectorAll('.btn-inspecionar-ficha').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fichaId = e.target.getAttribute('data-id');
                    if (typeof window.carregarPersonagem === 'function') {
                        await window.carregarPersonagem(fichaId);
                        Router.navigate('ficha');
                        window.mostrarNotificacao('Modo Inspeção: Ficha do aliado carregada.', 'aviso');
                    }
                });
            });

        } catch (erro) {
            gridFichas.innerHTML = '<p class="text-rpg-red">Falha na varredura da área.</p>';
        }
    }

    // ==========================================
    // 4. GERENCIAR JOGADORES (Somente Mestre)
    // ==========================================
    async function carregarJogadoresDaMesa(campanhaId) {
        const gridJogadores = document.getElementById('grid-jogadores-mesa-view');
        gridJogadores.innerHTML = '<p class="text-gray-500 italic animate-pulse">Analisando conexões vitais...</p>';

        try {
            const resposta = await fetch(`${window.API_URL}/campanhas/${campanhaId}/jogadores`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            if (!resposta.ok) throw new Error("Erro ao buscar jogadores");
            const jogadores = await resposta.json();

            gridJogadores.innerHTML = '';

            if (jogadores.length === 0) {
                gridJogadores.innerHTML = '<p class="text-gray-500 italic">Nenhum jogador na mesa ainda.</p>';
                return;
            }

            jogadores.forEach(jog => {
                const card = document.createElement('div');
                card.className = 'bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] rounded-md p-4 w-[200px] min-w-[200px] flex-shrink-0 flex flex-col justify-between shadow-sm';

                const nomeConta = jog.username || 'Operador Desconhecido';
                const nomeChar = jog.nome_personagem || 'Sem personagem ativo';
                const meuId = sessionStorage.getItem('usuarioId');
                const isEsteOMestre = jog.usuario_id == meuId;

                const controleHtml = isEsteOMestre 
                    ? `<span class="text-orange-500 font-bold text-sm flex items-center gap-1 mt-3"><i data-lucide="crown" class="w-4 h-4"></i> Você (Mestre)</span>`
                    : `<button class="btn-remover-jogador-mesa mt-3 bg-rpg-red hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded text-xs uppercase font-rpg w-full transition-colors flex justify-center items-center gap-1" data-usuario="${jog.usuario_id}"><i data-lucide="user-x" class="w-4 h-4"></i> Expulsar</button>`;

                card.innerHTML = `
                    <div>
                        <h4 class="text-gray-800 dark:text-white font-bold text-lg m-0 truncate" title="${window.escaparHTML(nomeConta)}">${window.escaparHTML(nomeConta)}</h4>
                        <p class="text-gray-500 text-xs m-0 mt-1 truncate">👤 ${window.escaparHTML(nomeChar)}</p>
                    </div>
                    ${controleHtml}
                `;
                gridJogadores.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();

            // Ancorar o clique do botão no nosso Modal de Segurança
            document.querySelectorAll('.btn-remover-jogador-mesa').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    const usuarioIdRemover = event.currentTarget.getAttribute('data-usuario');
                    const cardJogador = event.currentTarget.closest('div');
                    const nomeContaStr = cardJogador.querySelector('h4').textContent;
                    
                    window.prepararExpulsaoJogador(usuarioIdRemover, nomeContaStr.trim().toLowerCase(), cardJogador, campanhaId);
                });
            });

        } catch (erro) {
            gridJogadores.innerHTML = '<p class="text-rpg-red">Erro ao buscar jogadores na matriz.</p>';
        }
    }

    // ==========================================
    // 5. LÓGICA DO MODAL DE EXPULSAR JOGADOR
    // ==========================================
    const modalRemoveJogador = document.getElementById('remove-jogador-modal');
    const inputRemoveJogador = document.getElementById('remove-jogador-input');
    const btnConfirmRemoveJogador = document.getElementById('btn-confirm-remove-jogador');
    const btnCancelRemoveJogador = document.getElementById('btn-cancel-remove-jogador');
    const targetNameJogador = document.getElementById('remove-jogador-target-name');

    let jogadorParaRemoverId = null;
    let cardJogadorParaRemover = null;
    let nomeJogadorLimpo = '';
    let campanhaIdAtual = null;

    window.prepararExpulsaoJogador = function(id, nome, card, campId) {
        jogadorParaRemoverId = id;
        nomeJogadorLimpo = nome;
        cardJogadorParaRemover = card;
        campanhaIdAtual = campId;

        targetNameJogador.textContent = nomeJogadorLimpo;
        inputRemoveJogador.value = '';
        btnConfirmRemoveJogador.disabled = true;
        btnConfirmRemoveJogador.classList.add('opacity-50', 'cursor-not-allowed');

        modalRemoveJogador.classList.add('show');
    };

    if (inputRemoveJogador) {
        inputRemoveJogador.addEventListener('input', (e) => {
            if (e.target.value.trim().toLowerCase() === nomeJogadorLimpo) {
                btnConfirmRemoveJogador.disabled = false;
                btnConfirmRemoveJogador.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btnConfirmRemoveJogador.disabled = true;
                btnConfirmRemoveJogador.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    if (btnCancelRemoveJogador) {
        btnCancelRemoveJogador.addEventListener('click', () => {
            modalRemoveJogador.classList.remove('show');
        });
    }

    if (btnConfirmRemoveJogador) {
        btnConfirmRemoveJogador.addEventListener('click', async () => {
            if (!jogadorParaRemoverId || !campanhaIdAtual) return;
            
            const iconeOriginal = btnConfirmRemoveJogador.innerHTML;
            btnConfirmRemoveJogador.innerHTML = "Expulsando...";
            btnConfirmRemoveJogador.disabled = true;

            try {
                const delRes = await fetch(`${window.API_URL}/campanhas/${campanhaIdAtual}/membros/${jogadorParaRemoverId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                if (delRes.ok) {
                    if (cardJogadorParaRemover) cardJogadorParaRemover.remove();
                    window.mostrarNotificacao("O jogador foi banido da mesa.", 'sucesso');
                } else {
                    window.mostrarNotificacao("Erro ao remover jogador.", 'erro');
                }
            } catch (err) {
                window.mostrarNotificacao("Falha na conexão.", 'erro');
            } finally {
                modalRemoveJogador.classList.remove('show');
                btnConfirmRemoveJogador.innerHTML = iconeOriginal;
                btnConfirmRemoveJogador.disabled = false;
            }
        });
    }
});