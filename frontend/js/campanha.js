// js/campanha.js

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. INICIALIZAÇÃO DO MULTIPLAYER (SOCKET.IO)
    // ==========================================
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

    window.socket.on('mesa-encerrada', () => {
        window.mostrarNotificacao("🚨 O Mestre encerrou esta campanha permanentemente!", 'aviso');
        sessionStorage.removeItem('campanhaAtiva');
        sessionStorage.removeItem('isMestreAtivo');
        sessionStorage.removeItem('campanhaNome');
        sessionStorage.removeItem('campanhaCodigo');
        Router.navigate('dashboard');
    });

    // ==========================================
    // 2. CARREGAR LOBBY E BANNER
    // ==========================================
    window.carregarLobbyCampanha = async function () {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        const nomeCampanha = sessionStorage.getItem('campanhaNome');
        const codigoCampanha = sessionStorage.getItem('campanhaCodigo');

        const codigoCampanhaTexto = `Código: ${codigoCampanha}`

        if (!campanhaId) return;

        document.getElementById('campanha-titulo-view').textContent = nomeCampanha || 'Mesa Desconhecida';
        document.getElementById('campanha-codigo-view').textContent = codigoCampanhaTexto || '---';

        const painelMestre = document.getElementById('painel-mestre-botoes');
        const ctrlsPadrao = document.getElementById('controles-padrao-banner'); // 👈 AQUI ESTAVA O SEGREDO!

        if (isMestre) {
            if (painelMestre) painelMestre.classList.remove('hidden');
            if (ctrlsPadrao) ctrlsPadrao.classList.remove('hidden'); // Mostra a caixa que segura os dois botões!
        } else {
            if (painelMestre) painelMestre.classList.add('hidden');
            if (ctrlsPadrao) ctrlsPadrao.classList.add('hidden');
        }

       // 🔥 PUXAR A FOTO DO BANNER E A POSIÇÃO 🔥
        try {
            const resBanner = await fetch(`${window.API_URL}/campanhas/${campanhaId}/info`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const dataBanner = await resBanner.json();
            const imgBanner = document.getElementById('campanha-banner-img');
            
            if (imgBanner && dataBanner.banner) {
                imgBanner.src = dataBanner.banner;
                // Aplica a posição salva!
                const posY = dataBanner.banner_pos_y !== undefined && dataBanner.banner_pos_y !== null ? dataBanner.banner_pos_y : 50;
                imgBanner.style.objectPosition = `50% ${posY}%`;
                
                // Grava na variável global de reposicionamento
                if (typeof savedObjectPositionY !== 'undefined') savedObjectPositionY = posY;
            } else if (imgBanner) {
                imgBanner.src = './assets/banner-default.jpg'; 
                imgBanner.style.objectPosition = `50% 50%`;
            }
        } catch (e) { console.log("Erro ao carregar banner"); }

        if (window.socket.connected) {
            window.socket.emit('entrar-na-campanha', { campanhaId: campanhaId, token: sessionStorage.getItem('token') });
        }

        // 🔥 LIBERA A LISTA DE JOGADORES PARA TODO MUNDO 🔥
        const secaoJogadores = document.getElementById('grid-jogadores-mesa-view')?.parentElement;
        if (secaoJogadores) secaoJogadores.style.display = 'block';

        await carregarFichasDaMesa(campanhaId, isMestre);
        await carregarJogadoresDaMesa(campanhaId, isMestre);

        if (isMestre) await carregarPartituraDoBanco(campanhaId);
    };

    // ==========================================
    // 3. RENDERIZAR FICHAS DA MESA (GRID 3x INFINITO)
    // ==========================================
    async function carregarFichasDaMesa(campanhaId, isMestre) {
        const gridFichas = document.getElementById('grid-fichas-mesa-view');
        if (!gridFichas) return;

        // 🔥 FORÇANDO O GRID CSS PELO JAVASCRIPT 🔥
        gridFichas.className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full";
        gridFichas.innerHTML = '<p class="text-gray-500 italic animate-pulse col-span-full">Procurando sobreviventes...</p>';

        try {
            const resposta = await fetch(`${window.API_URL}/campanhas/${campanhaId}/fichas-mesa`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            if (!resposta.ok) throw new Error("Erro ao buscar fichas");
            let fichas = await resposta.json();

            const meuId = sessionStorage.getItem('usuarioId');

            gridFichas.innerHTML = '';

            // 🔥 MOSTRA O CARD DE ADICIONAR PARA TODOS (Mestre cria NPCs, Jogadores puxam os seus) 🔥
            const cardAdicionar = document.createElement('div');
            cardAdicionar.className = 'flex flex-row h-[130px] min-w-[250px] bg-gray-50 dark:bg-[#1a1a1a] rounded-lg overflow-hidden border-2 border-dashed border-gray-400 dark:border-gray-600 hover:border-rpg-blue hover:bg-gray-100 dark:hover:bg-[#242424] transition-all cursor-pointer items-center justify-center group';
            
            cardAdicionar.innerHTML = `
                <div class="flex flex-col items-center justify-center w-full">
                    <div class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <i data-lucide="plus" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
                    </div>
                    <span class="font-bold font-rpg text-gray-500 uppercase text-xs text-center px-2">
                        ${isMestre ? 'Puxar NPC / Criar' : 'Puxar Personagem'}
                    </span>
                </div>
            `;
            
            cardAdicionar.addEventListener('click', () => {
                document.getElementById('modal-selecionar-npc').classList.add('show');
                const btnCriarBranco = document.getElementById('btn-modal-criar-novo-npc');
                // O botão de ficha limpa só aparece para o mestre
                if (isMestre) btnCriarBranco.classList.remove('hidden');
                else btnCriarBranco.classList.add('hidden');
                
                if(typeof window.carregarListaNpcsExistentes === 'function') {
                    window.carregarListaNpcsExistentes(campanhaId);
                }
            });
            gridFichas.appendChild(cardAdicionar);

            if (fichas.length === 0) return;

            fichas.forEach(char => {
                // Se a linha do banco for de alguém que tirou a ficha (personagem_id = null), nós só ignoramos.
                if (!char.id) return; 

                const card = document.createElement('div');
                card.className = 'flex flex-row h-[130px] w-full min-w-[280px] bg-white dark:bg-[#242424] rounded-lg overflow-hidden border border-gray-300 dark:border-[#333] hover:-translate-y-1 hover:shadow-lg transition-all relative shadow-sm';

                const imgSrc = (char.foto && !char.foto.includes('R0lGODlhAQAB')) ? char.foto : './assets/icon.jpg';
                const ocupacao = char.ocupacao || 'Desconhecido';

                const isDonoDaFicha = (char.usuario_id == meuId);
                const isFichaPrivada = char.is_privada === true;
                const podeInspecionar = isMestre || isDonoDaFicha || !isFichaPrivada;

                let controleHtml = '';
                if (podeInspecionar) {
                    controleHtml += `<button class="btn-inspecionar-ficha bg-rpg-blue hover:bg-[#2c6270] text-white px-3 py-1.5 rounded text-xs font-bold font-rpg uppercase shadow transition-colors z-10" data-id="${char.id}">Inspecionar</button>`;
                } else {
                    controleHtml += `<div class="bg-gray-200 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 text-gray-500 px-3 py-1.5 rounded text-[10px] font-bold uppercase shadow-inner z-10 flex items-center gap-1 cursor-not-allowed" title="Oculto"><i data-lucide="lock" class="w-3 h-3 text-rpg-red"></i> Sigilo</div>`;
                }

                // 🔥 O BOTÃO MÁGICO DE RETIRAR A FICHA 🔥
                if (isDonoDaFicha || isMestre) {
                    controleHtml += `
                    <button class="btn-retirar-mesa bg-gray-600 hover:bg-rpg-red text-white p-1.5 rounded text-xs font-bold uppercase shadow transition-colors z-10 ml-2" data-id="${char.id}" title="Recolher Ficha">
                        <i data-lucide="user-minus" class="w-4 h-4"></i>
                    </button>`;
                }

                card.innerHTML = `
                    <img src="${imgSrc}" class="w-[110px] h-[130px] object-cover flex-shrink-0 border-r border-gray-300 dark:border-[#333] bg-black">
                    <div class="flex flex-col justify-start p-3 flex-grow overflow-hidden">
                        <h3 class="text-gray-800 dark:text-white font-bold text-[15px] m-0 truncate" title="${window.escaparHTML(char.nome_personagem)}">${window.escaparHTML(char.nome_personagem)}</h3>
                        <p class="text-rpg-red dark:text-orange-500 font-bold text-[10px] uppercase m-0 mt-1 truncate">${window.escaparHTML(ocupacao)}</p>
                        <div class="mt-auto w-full flex items-center">${controleHtml}</div>
                    </div>
                `;
                gridFichas.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();

            // Adiciona a navegação pro inspecionar
            document.querySelectorAll('.btn-inspecionar-ficha').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fichaId = e.target.getAttribute('data-id');
                    if (typeof window.carregarPersonagem === 'function') {
                        await window.carregarPersonagem(fichaId);
                        Router.navigate('ficha');
                    }
                });
            });

            // Lógica do botão de retirar
            document.querySelectorAll('.btn-retirar-mesa').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(!confirm('Deseja retirar este personagem da mesa? \n\nA ficha continuará salva na sua conta, e você NÃO sairá da campanha.')) return;

                    const personagemId = e.currentTarget.getAttribute('data-id');
                    const btnIcon = e.currentTarget.innerHTML;
                    e.currentTarget.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i>';
                    if (window.lucide) lucide.createIcons();

                    try {
                        const res = await fetch(`${window.API_URL}/campanhas/${campanhaId}/remover-personagem/${personagemId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                        });
                        const data = await res.json();
                        
                        if (res.ok) window.mostrarNotificacao(data.mensagem, 'sucesso');
                        else window.mostrarNotificacao(data.erro, 'erro');
                    } catch(err) {
                        window.mostrarNotificacao('Erro na comunicação.', 'erro');
                    } finally {
                        window.carregarFichasDaMesa(campanhaId, isMestre);
                        window.carregarJogadoresDaMesa(campanhaId, isMestre);
                    }
                });
            });

            if (fichas.length === 0) {
                gridFichas.innerHTML = '<p class="text-gray-500 italic col-span-full">Nenhum jogador aliado detectado.</p>';
                return;
            }

            fichas.forEach(char => {
                const card = document.createElement('div');
                // 🔥 REMOVIDO o w-[300px] para ele preencher o Grid Perfeitamente 🔥
                card.className = 'flex flex-row h-[130px] w-full bg-white dark:bg-[#242424] rounded-lg overflow-hidden border border-gray-300 dark:border-[#333] hover:-translate-y-1 hover:shadow-lg transition-all relative shadow-sm';

                const imgSrc = (char.foto && !char.foto.includes('R0lGODlhAQAB')) ? char.foto : './assets/icon.jpg';
                const ocupacao = char.ocupacao || 'Desconhecido';

                const isDonoDaFicha = (char.usuario_id == meuId);
                const isFichaPrivada = char.is_privada === true;
                const podeInspecionar = isMestre || isDonoDaFicha || !isFichaPrivada;

                const controleInspecionarHtml = podeInspecionar
                    ? `<button class="btn-inspecionar-ficha mt-auto w-max bg-rpg-blue hover:bg-[#2c6270] text-white px-3 py-1.5 rounded text-xs font-bold font-rpg uppercase shadow transition-colors z-10" data-id="${char.id}">Inspecionar</button>`
                    : `<div class="mt-auto w-max bg-gray-200 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 text-gray-500 px-3 py-1.5 rounded text-[10px] font-bold uppercase shadow-inner z-10 flex items-center gap-1 cursor-not-allowed" title="Oculto"><i data-lucide="lock" class="w-3 h-3 text-rpg-red"></i> Sigilo</div>`;

                card.innerHTML = `
                    <img src="${imgSrc}" class="w-[110px] h-[130px] object-cover flex-shrink-0 border-r border-gray-300 dark:border-[#333] bg-black">
                    <div class="flex flex-col justify-start p-3 flex-grow overflow-hidden">
                        <h3 class="text-gray-800 dark:text-white font-bold text-[15px] m-0 truncate" title="${window.escaparHTML(char.nome_personagem)}">${window.escaparHTML(char.nome_personagem) || 'Sem Nome'}</h3>
                        <p class="text-rpg-red dark:text-orange-500 font-bold text-[10px] uppercase m-0 mt-1 truncate">${window.escaparHTML(ocupacao)}</p>
                        ${controleInspecionarHtml}
                    </div>
                `;
                gridFichas.appendChild(card);
            });
            if (window.lucide) lucide.createIcons();

            document.querySelectorAll('.btn-inspecionar-ficha').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fichaId = e.target.getAttribute('data-id');
                    if (typeof window.carregarPersonagem === 'function') {
                        await window.carregarPersonagem(fichaId);
                        Router.navigate('ficha');
                    }
                });
            });
        } catch (erro) {
            gridFichas.innerHTML = '<p class="text-rpg-red col-span-full">Falha na varredura.</p>';
        }
    }

    // ==========================================
    // 4. GERENCIAR JOGADORES (GRID 3x INFINITO E PROTEÇÃO DE PODER)
    // ==========================================
    async function carregarJogadoresDaMesa(campanhaId, isMestreAtivo) {
        const gridJogadores = document.getElementById('grid-jogadores-mesa-view');
        if (!gridJogadores) return;

        gridJogadores.className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full";
        gridJogadores.innerHTML = '<p class="text-gray-500 italic animate-pulse col-span-full">Analisando conexões...</p>';

        try {
            const resposta = await fetch(`${window.API_URL}/campanhas/${campanhaId}/jogadores`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });

            if (!resposta.ok) throw new Error("O Servidor recusou a conexão (Erro 500). Verifique o terminal do Node!");

            const jogadores = await resposta.json();

            gridJogadores.innerHTML = '';
            if (jogadores.length === 0) return gridJogadores.innerHTML = '<p class="text-gray-500 italic col-span-full">Vazio.</p>';

            const meuId = sessionStorage.getItem('usuarioId');

            jogadores.forEach(jog => {
                const card = document.createElement('div');
                card.className = 'bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] rounded-md p-4 w-full flex flex-col justify-between shadow-sm relative';

                const nomeConta = jog.username || 'Desconhecido';
                const nomeChar = jog.nome_personagem || 'Sem personagem ativo';
                const avatarJogador = (jog.avatar && !jog.avatar.includes('R0lGODlhAQAB')) ? jog.avatar : './assets/icon.jpg';

                const isEsteOMestre = (jog.usuario_id === jog.mestre_id);

                let controleHtml = '';
                if (isEsteOMestre) {
                    controleHtml = `<span class="text-orange-500 font-bold text-sm flex items-center justify-center gap-1 mt-3 w-full border-t border-gray-300 dark:border-gray-700 pt-2"><i data-lucide="crown" class="w-4 h-4"></i> Mestre</span>`;
                } else if (isMestreAtivo) {
                    controleHtml = `<button class="btn-remover-jogador-mesa mt-3 bg-rpg-red hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded text-xs uppercase font-rpg w-full transition-colors flex justify-center items-center gap-1" data-usuario="${jog.usuario_id}"><i data-lucide="user-x" class="w-4 h-4"></i> Expulsar</button>`;
                } else if (jog.usuario_id == meuId) {
                    controleHtml = `<span class="text-rpg-blue font-bold text-sm flex items-center justify-center gap-1 mt-3 w-full border-t border-gray-300 dark:border-gray-700 pt-2"><i data-lucide="user" class="w-4 h-4"></i> Você</span>`;
                }

                card.innerHTML = `
                    <div class="flex items-center gap-3 mb-2 border-b border-gray-300 dark:border-gray-700 pb-2">
                        <img src="${avatarJogador}" class="w-10 h-10 rounded-full border border-gray-400 object-cover shadow-sm">
                        <div class="overflow-hidden">
                            <h4 class="text-gray-800 dark:text-white font-bold text-base m-0 truncate" title="${window.escaparHTML(nomeConta)}">${window.escaparHTML(nomeConta)}</h4>
                        </div>
                    </div>
                    <div><p class="text-gray-500 text-xs font-bold uppercase m-0 mt-1 truncate" title="${window.escaparHTML(nomeChar)}"><i data-lucide="swords" class="w-3 h-3 inline"></i> ${window.escaparHTML(nomeChar)}</p></div>
                    ${controleHtml}
                `;
                gridJogadores.appendChild(card);
            });

            if (window.lucide) lucide.createIcons();

            document.querySelectorAll('.btn-remover-jogador-mesa').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    const usuarioIdRemover = event.currentTarget.getAttribute('data-usuario');
                    const cardJogador = event.currentTarget.closest('div');
                    const nomeContaStr = cardJogador.querySelector('h4').textContent;
                    window.prepararExpulsaoJogador(usuarioIdRemover, nomeContaStr.trim().toLowerCase(), cardJogador, campanhaId);
                });
            });
        } catch (erro) {
            console.error("❌ Erro ao renderizar Jogadores:", erro);
            gridJogadores.innerHTML = `<p class="text-rpg-red col-span-full">${erro.message}</p>`;
        }
    }

    // ==========================================
    // EXTRA: MOTOR DE UPLOAD DO BANNER
    // ==========================================
    const inputBanner = document.getElementById('input-banner-campanha');
    if (inputBanner) {
        inputBanner.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            const btnBanner = document.getElementById('btn-editar-banner');
            const iconOriginal = btnBanner.innerHTML;
            btnBanner.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Enviando...';

            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = async function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    // Otimiza para Banner panorâmico
                    const maxW = 1200;
                    const proporcao = img.width / img.height;
                    canvas.width = maxW;
                    canvas.height = maxW / proporcao;

                    ctx.imageSmoothingEnabled = true;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const base64Foto = canvas.toDataURL('image/webp', 0.8);

                    document.getElementById('campanha-banner-img').src = base64Foto;

                    try {
                        const campanhaId = sessionStorage.getItem('campanhaAtiva');
                        const res = await fetch(`${window.API_URL}/campanhas/${campanhaId}/banner`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                            body: JSON.stringify({ foto: base64Foto })
                        });
                        const data = await res.json();
                        if (res.ok) window.mostrarNotificacao(data.mensagem, 'sucesso');
                        else window.mostrarNotificacao(data.erro, 'erro');
                    } catch (err) {
                        window.mostrarNotificacao('Erro na transmissão.', 'erro');
                    } finally {
                        btnBanner.innerHTML = iconOriginal;
                        if (window.lucide) lucide.createIcons();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Lógica de Reposicionamento do Banner
        let isDraggingBanner = false;
        let startY = 0;
        let currentObjectPositionY = 50; // Começa em 50%
        let savedObjectPositionY = 50;

        const bannerImg = document.getElementById('campanha-banner-img');
        const btnReposicionar = document.getElementById('btn-reposicionar-banner');
        const btnSalvarPos = document.getElementById('btn-salvar-posicao');
        const btnCancelarPos = document.getElementById('btn-cancelar-posicao');
        const ctrlsPadrao = document.getElementById('controles-padrao-banner');
        const ctrlsEdicao = document.getElementById('controles-edicao-banner');

        if (btnReposicionar) {
            btnReposicionar.addEventListener('click', () => {
                ctrlsPadrao.classList.add('hidden');
                ctrlsEdicao.classList.remove('hidden');
                bannerImg.style.cursor = 'grab';

                // Pega a posição atual gravada
                const posicaoAtual = bannerImg.style.objectPosition || '50% 50%';
                savedObjectPositionY = parseFloat(posicaoAtual.split(' ')[1]) || 50;
                currentObjectPositionY = savedObjectPositionY;
            });

            bannerImg.addEventListener('mousedown', (e) => {
                if (ctrlsEdicao.classList.contains('hidden')) return;
                isDraggingBanner = true;
                startY = e.clientY;
                bannerImg.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDraggingBanner) return;
                const deltaY = e.clientY - startY;

                // Sensibilidade do arraste (ajuste o 0.15 se achar muito rápido/devagar)
                currentObjectPositionY = savedObjectPositionY - (deltaY * 0.15);

                // Trava o limite entre 0% (topo) e 100% (base)
                currentObjectPositionY = Math.max(0, Math.min(100, currentObjectPositionY));
                bannerImg.style.objectPosition = `50% ${currentObjectPositionY}%`;
            });

            window.addEventListener('mouseup', () => {
                if (isDraggingBanner) {
                    isDraggingBanner = false;
                    bannerImg.style.cursor = 'grab';
                    savedObjectPositionY = currentObjectPositionY; // Fixa a nova âncora
                }
            });

            btnCancelarPos.addEventListener('click', () => {
                // Reverte para a posição original
                bannerImg.style.objectPosition = `50% ${savedObjectPositionY}%`;
                sairModoEdicaoBanner();
            });

            btnSalvarPos.addEventListener('click', async () => {
                const posicaoFinal = currentObjectPositionY;
                const idCampanha = sessionStorage.getItem('campanhaAtiva');

                try {
                    const res = await fetch(`${window.API_URL}/campanhas/${idCampanha}/posicao-banner`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                        body: JSON.stringify({ posicao_y: posicaoFinal })
                    });
                    
                    if (res.ok) {
                        window.mostrarNotificacao("Posição do banner salva!", "sucesso");
                        sairModoEdicaoBanner();
                    } else {
                        window.mostrarNotificacao("Erro ao salvar posição no servidor.", "erro");
                    }
                } catch (error) {
                    window.mostrarNotificacao("Falha de conexão.", "erro");
                }
            });

            function sairModoEdicaoBanner() {
                ctrlsEdicao.classList.add('hidden');
                ctrlsPadrao.classList.remove('hidden');
                bannerImg.style.cursor = 'default';
            }
        }
    }

    // ==========================================
    // 5. MODAL DE EXPULSAR JOGADOR
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

    window.prepararExpulsaoJogador = function (id, nome, card, campId) {
        jogadorParaRemoverId = id;
        nomeJogadorLimpo = nome;
        cardJogadorParaRemover = card;
        campanhaIdAtual = campId;

        if (targetNameJogador) targetNameJogador.textContent = nomeJogadorLimpo;
        if (inputRemoveJogador) inputRemoveJogador.value = '';
        if (btnConfirmRemoveJogador) {
            btnConfirmRemoveJogador.disabled = true;
            btnConfirmRemoveJogador.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (modalRemoveJogador) modalRemoveJogador.classList.add('show');
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

    // ==========================================
    // 6. FERRAMENTAS DO MESTRE & AUTOSAVE (REFÚGIO RESTAURADO)
    // ==========================================
    function criarAmeaca(nome = '', desc = '') {
        const containerAmeacas = document.getElementById('container-ameacas');
        if (!containerAmeacas) return;

        const bloco = document.createElement('div');
        bloco.className = 'ameaca-item bg-white dark:bg-[#2a2a2a] p-4 rounded-md shadow-inner border border-gray-300 dark:border-gray-600 mb-3 focus-within:ring-2 focus-within:ring-rpg-red transition-all relative';
        bloco.innerHTML = `
            <div class="flex justify-between items-center mb-2 border-b-2 border-red-900 pb-1">
                <input type="text" class="item-nome w-full font-bold p-1 bg-transparent text-black dark:text-white text-base outline-none" placeholder="Nome da Ameaça" value="${window.escaparHTML(nome)}">
                <button type="button" class="btn-del-item ml-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow-sm border-none"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <textarea rows="2" class="item-desc w-full p-1 bg-transparent text-black dark:text-gray-300 outline-none resize-y text-sm" placeholder="Descrição e Status da Ameaça...">${window.escaparHTML(desc)}</textarea>
        `;
        containerAmeacas.appendChild(bloco);
    }

    function criarObjetivo(nome = '', atual = 0, max = 10, desc = '') {
        const containerObjetivos = document.getElementById('container-objetivos');
        if (!containerObjetivos) return;

        const bloco = document.createElement('div');
        bloco.className = 'objetivo-item bg-white dark:bg-[#2a2a2a] p-4 rounded-md shadow-inner border border-gray-300 dark:border-gray-600 mb-3 focus-within:ring-2 focus-within:ring-rpg-blue transition-all relative';
        const porcentagem = Math.min(100, Math.max(0, (atual / max) * 100)) || 0;

        bloco.innerHTML = `
            <div class="flex justify-between items-center mb-2 border-b-2 border-blue-900 pb-1">
                <input type="text" class="item-nome w-full font-bold p-1 bg-transparent text-black dark:text-white text-base outline-none" placeholder="Novo Objetivo" value="${window.escaparHTML(nome)}">
                <button type="button" class="btn-del-item ml-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow-sm border-none"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <div class="flex items-center gap-2 mb-3 bg-gray-100 dark:bg-[#1a1a1a] p-2 rounded border border-gray-300 dark:border-gray-700">
                <span class="text-xs font-bold text-gray-500 uppercase">Progresso:</span>
                <input type="number" class="obj-atual w-16 text-center bg-transparent text-black dark:text-white font-bold outline-none border-b border-gray-400 focus:border-rpg-blue" value="${atual}">
                <span class="text-gray-500 font-bold">/</span>
                <input type="number" class="obj-max w-16 text-center bg-transparent text-black dark:text-white font-bold outline-none border-b border-gray-400 focus:border-rpg-blue" value="${max}">
                <div class="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 ml-2 overflow-hidden shadow-inner">
                    <div class="bg-rpg-blue h-2.5 rounded-full obj-bar transition-all duration-300" style="width: ${porcentagem}%"></div>
                </div>
            </div>
            <textarea rows="2" class="item-desc w-full p-1 bg-transparent text-black dark:text-gray-300 outline-none resize-y text-sm" placeholder="Recompensas e Consequências...">${window.escaparHTML(desc)}</textarea>
        `;
        containerObjetivos.appendChild(bloco);
    }

    // 🔥 O REFÚGIO DA PARTITURA VOLTOU! 🔥
    function criarRefugio(nome = '', seg = '', rec = '', desc = '') {
        const containerRefugios = document.getElementById('container-refugios');
        if (!containerRefugios) return;

        const bloco = document.createElement('div');
        bloco.className = 'refugio-item bg-white dark:bg-[#2a2a2a] p-4 rounded-md shadow-inner border border-gray-300 dark:border-gray-600 mb-3 focus-within:ring-2 focus-within:ring-rpg-green transition-all relative';
        bloco.innerHTML = `
            <div class="flex justify-between items-center mb-2 border-b-2 border-green-900 pb-1">
                <div class="flex items-center gap-2 w-full">
                    <i data-lucide="tent" class="w-5 h-5 text-rpg-green"></i>
                    <input type="text" class="item-nome w-full font-bold p-1 bg-transparent text-black dark:text-white text-base outline-none" placeholder="Nome do Refúgio" value="${window.escaparHTML(nome)}">
                </div>
                <button type="button" class="btn-del-item ml-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow-sm border-none"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-2 mb-2">
                <input type="text" class="ref-seguranca p-1 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white outline-none w-full" placeholder="Segurança" value="${window.escaparHTML(seg)}">
                <input type="text" class="ref-recursos p-1 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white outline-none w-full" placeholder="Recursos" value="${window.escaparHTML(rec)}">
            </div>
            <textarea rows="2" class="item-desc w-full p-1 bg-transparent text-black dark:text-gray-300 outline-none resize-y text-sm" placeholder="Anotações do local...">${window.escaparHTML(desc)}</textarea>
        `;
        containerRefugios.appendChild(bloco);
    }

    const ligarBotao = (ids, funcao) => {
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => { funcao(); if (window.lucide) lucide.createIcons(); agendarAutosavePartitura(); });
        });
    };

    ligarBotao(['btn-add-ameaca', 'btn-criar-ameaca', 'btn-nova-ameaca'], criarAmeaca);
    ligarBotao(['btn-add-objetivo', 'btn-criar-objetivo', 'btn-novo-objetivo'], criarObjetivo);
    ligarBotao(['btn-add-refugio', 'btn-criar-refugio', 'btn-novo-refugio'], criarRefugio); // Ligado de volta!

    let timeoutPartitura;
    function agendarAutosavePartitura() {
        clearTimeout(timeoutPartitura);
        timeoutPartitura = setTimeout(salvarPartituraNoBanco, 1500);
    }

    function atualizarBarraObjetivo(bloco) {
        const atual = parseInt(bloco.querySelector('.obj-atual').value) || 0;
        const max = parseInt(bloco.querySelector('.obj-max').value) || 1;
        const porcentagem = Math.min(100, Math.max(0, (atual / max) * 100));
        bloco.querySelector('.obj-bar').style.width = `${porcentagem}%`;
    }

    document.addEventListener('input', (e) => {
        // Agora escuta os 3 containers!
        if (!e.target.closest('#container-ameacas') && !e.target.closest('#container-objetivos') && !e.target.closest('#container-refugios')) return;

        if (e.target.classList.contains('obj-atual') || e.target.classList.contains('obj-max')) {
            atualizarBarraObjetivo(e.target.closest('.objetivo-item'));
        }
        agendarAutosavePartitura();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#container-ameacas') && !e.target.closest('#container-objetivos') && !e.target.closest('#container-refugios')) return;

        const btnDel = e.target.closest('.btn-del-item');
        if (btnDel) {
            btnDel.closest('.ameaca-item, .objetivo-item, .refugio-item').remove();
            agendarAutosavePartitura();
        }
    });

    // --- ENVIAR PARA O BANCO ---
    async function salvarPartituraNoBanco() {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        if (!campanhaId) return;

        const dados = { ameacas: [], objetivos: [], refugios: [] };

        document.querySelectorAll('#container-ameacas .ameaca-item').forEach(el => {
            dados.ameacas.push({ nome: el.querySelector('.item-nome').value, desc: el.querySelector('.item-desc').value });
        });

        document.querySelectorAll('#container-objetivos .objetivo-item').forEach(el => {
            dados.objetivos.push({ nome: el.querySelector('.item-nome').value, atual: el.querySelector('.obj-atual').value, max: el.querySelector('.obj-max').value, desc: el.querySelector('.item-desc').value });
        });

        document.querySelectorAll('#container-refugios .refugio-item').forEach(el => {
            dados.refugios.push({ nome: el.querySelector('.item-nome').value, seguranca: el.querySelector('.ref-seguranca').value, recursos: el.querySelector('.ref-recursos').value, desc: el.querySelector('.item-desc').value });
        });

        try {
            await fetch(`${window.API_URL}/campanhas/${campanhaId}/partitura`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                body: JSON.stringify({ dados: JSON.stringify(dados) })
            });
        } catch (erro) {
            console.error("Erro no autosave da partitura.");
        }
    }

    // --- CARREGAR DO BANCO (BLINDADO) ---
    async function carregarPartituraDoBanco(campanhaId) {
        const containerAmeacas = document.getElementById('container-ameacas');
        const containerObjetivos = document.getElementById('container-objetivos');
        const containerRefugios = document.getElementById('container-refugios');

        if (containerAmeacas) containerAmeacas.innerHTML = '';
        if (containerObjetivos) containerObjetivos.innerHTML = '';
        if (containerRefugios) containerRefugios.innerHTML = '';

        try {
            const res = await fetch(`${window.API_URL}/campanhas/${campanhaId}/partitura`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const dadosStr = await res.json();

            if (dadosStr) {
                const dados = JSON.parse(dadosStr);
                if (dados.ameacas) dados.ameacas.forEach(a => criarAmeaca(a.nome, a.desc));
                if (dados.objetivos) dados.objetivos.forEach(o => criarObjetivo(o.nome, o.atual, o.max, o.desc));
                if (dados.refugios) dados.refugios.forEach(r => criarRefugio(r.nome, r.seguranca, r.recursos, r.desc));
            }
            if (window.lucide) lucide.createIcons();

        } catch (erro) {
            console.error("Erro ao puxar a partitura antiga.");
        }
    }

    // ==========================================
    // EXTRA: SISTEMA DE PEDIDOS DE ENTRADA (PORTARIA)
    // ==========================================

    // Escuta quando alguém bate na porta (em tempo real)
    window.socket.on('novo-pedido-entrada', () => {
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        if (isMestre) {
            window.mostrarNotificacao("🔔 Alguém está pedindo para entrar na mesa!", 'aviso');
            window.carregarPedidosMesa(); // Recarrega a lista para atualizar o número no balãozinho vermelho
        }
    });

    // Escuta quando o mestre aprova alguém, para recarregar as fichas de todo mundo
    window.socket.on('atualizar-jogadores', async () => {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        if (campanhaId) {
            await carregarFichasDaMesa(campanhaId, isMestre);
            await carregarJogadoresDaMesa(campanhaId, isMestre);
        }
    });

    // Função que o Mestre usa para ver os pedidos
    window.carregarPedidosMesa = async function () {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        const containerPedidos = document.getElementById('lista-pedidos-container');
        const badge = document.getElementById('badge-pedidos');

        if (!campanhaId || !containerPedidos) return;

        try {
            const res = await fetch(`${window.API_URL}/campanhas/${campanhaId}/pedidos`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const pedidos = await res.json();

            // Atualiza a bolinha vermelha de notificação
            if (badge) {
                if (pedidos.length > 0) {
                    badge.textContent = pedidos.length;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            containerPedidos.innerHTML = '';

            if (pedidos.length === 0) {
                containerPedidos.innerHTML = '<p class="text-gray-500 italic text-center py-4">Não há ninguém batendo nos portões.</p>';
                return;
            }

            pedidos.forEach(ped => {
                const imgAvatar = (ped.avatar && !ped.avatar.includes('R0lGODlhAQAB')) ? ped.avatar : './assets/icon.jpg';
                const charName = ped.nome_personagem || 'Nenhum Personagem Selecionado';

                const div = document.createElement('div');
                div.className = 'bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 p-3 rounded flex items-center justify-between shadow-sm';
                div.innerHTML = `
                    <div class="flex items-center gap-3 overflow-hidden">
                        <img src="${imgAvatar}" class="w-10 h-10 rounded-full border border-gray-400 object-cover shadow-sm">
                        <div>
                            <h4 class="text-black dark:text-white font-bold text-sm m-0">${window.escaparHTML(ped.username)}</h4>
                            <p class="text-gray-500 text-[10px] uppercase font-bold truncate">Acompanhado de: <span class="text-rpg-blue">${window.escaparHTML(charName)}</span></p>
                        </div>
                    </div>
                    <div class="flex gap-2 ml-2">
                        <button onclick="window.responderPedido(${ped.pedido_id}, true, '${ped.usuario_id}', '${ped.personagem_id}')" class="bg-rpg-green hover:bg-green-700 text-white p-2 rounded shadow transition-colors" title="Aprovar">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.responderPedido(${ped.pedido_id}, false, null, null)" class="bg-rpg-red hover:bg-red-800 text-white p-2 rounded shadow transition-colors" title="Rejeitar">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
                containerPedidos.appendChild(div);
            });
            if (window.lucide) lucide.createIcons();

        } catch (e) {
            containerPedidos.innerHTML = '<p class="text-rpg-red">Erro ao carregar a portaria.</p>';
        }
    };

    // Função que despacha a resposta do Mestre para o Servidor
    window.responderPedido = async function (pedidoId, aprovado, usuarioId, personagemId) {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        try {
            const res = await fetch(`${window.API_URL}/campanhas/${campanhaId}/pedidos/responder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                body: JSON.stringify({ pedido_id: pedidoId, aprovado: aprovado, usuario_id: usuarioId, personagem_id: personagemId })
            });
            const data = await res.json();

            if (res.ok) {
                window.mostrarNotificacao(data.mensagem, aprovado ? 'sucesso' : 'aviso');
                window.carregarPedidosMesa(); // Atualiza a lista
            } else {
                window.mostrarNotificacao(data.erro, 'erro');
            }
        } catch (e) {
            window.mostrarNotificacao("Erro de conexão.", 'erro');
        }
    };

    // ==========================================
    // EXTRA: MOTOR DA BIBLIOTECA DE PERSONAGENS
    // ==========================================
    window.carregarListaNpcsExistentes = async function(campanhaId) {
        const container = document.getElementById('lista-npcs-existentes');
        if(!container) return;
        container.innerHTML = '<p class="text-gray-500 italic text-center text-sm py-4"><i data-lucide="loader" class="w-5 h-5 animate-spin mx-auto"></i></p>';
        if (window.lucide) lucide.createIcons();
        
        try {
            const usuarioId = sessionStorage.getItem('usuarioId');
            const res = await fetch(`${window.API_URL}/personagens/usuario/${usuarioId}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const personagens = await res.json();
            
            container.innerHTML = '';
            if (personagens.length === 0) {
                container.innerHTML = '<p class="text-gray-500 italic text-center text-sm py-4">Nenhuma ficha salva no seu acervo.</p>';
                return;
            }
            
            personagens.forEach(p => {
                const div = document.createElement('div');
                div.className = 'bg-gray-50 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 p-2 rounded flex items-center justify-between shadow-sm hover:border-rpg-blue transition-colors cursor-pointer group';
                const imgSrc = (p.foto && !p.foto.includes('R0lGODlhAQAB')) ? p.foto : './assets/icon.jpg';
                
                div.innerHTML = `
                    <div class="flex items-center gap-3 overflow-hidden">
                        <img src="${imgSrc}" class="w-10 h-10 rounded border border-gray-400 object-cover shadow-sm bg-black">
                        <div>
                            <h4 class="text-black dark:text-white font-bold text-sm m-0 truncate max-w-[200px]" title="${window.escaparHTML(p.nome_personagem)}">${window.escaparHTML(p.nome_personagem)}</h4>
                            <p class="text-gray-500 text-[10px] uppercase font-bold truncate m-0">${window.escaparHTML(p.ocupacao)}</p>
                        </div>
                    </div>
                    <button class="bg-gray-800 hover:bg-rpg-blue text-white p-2 rounded shadow transition-colors opacity-0 group-hover:opacity-100" title="Puxar para a Mesa">
                        <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </button>
                `;
                div.addEventListener('click', async () => {
                    const btnInside = div.querySelector('button');
                    const originalIcon = btnInside.innerHTML;
                    btnInside.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i>';
                    if (window.lucide) lucide.createIcons();

                    try {
                        const addRes = await fetch(`${window.API_URL}/campanhas/${campanhaId}/adicionar-personagem`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                            body: JSON.stringify({ personagem_id: p.id })
                        });
                        const addData = await addRes.json();
                        
                        if (addRes.ok) {
                            window.mostrarNotificacao(addData.mensagem, 'sucesso');
                            document.getElementById('modal-selecionar-npc').classList.remove('show');
                            window.carregarFichasDaMesa(campanhaId, sessionStorage.getItem('isMestreAtivo') === 'true');
                            window.carregarJogadoresDaMesa(campanhaId, sessionStorage.getItem('isMestreAtivo') === 'true');
                        } else {
                            window.mostrarNotificacao(addData.erro, 'erro');
                            btnInside.innerHTML = originalIcon;
                            if (window.lucide) lucide.createIcons();
                        }
                    } catch(e) {
                        window.mostrarNotificacao('Falha na comunicação.', 'erro');
                        btnInside.innerHTML = originalIcon;
                        if (window.lucide) lucide.createIcons();
                    }
                });
                container.appendChild(div);
            });
            if (window.lucide) lucide.createIcons();
        } catch(e) {
            container.innerHTML = '<p class="text-rpg-red text-center text-sm py-4">Erro ao buscar banco de dados.</p>';
        }
    }

    // Configura o Botão de Forjar o Novo NPC em branco no Modal
    const btnCriarBlank = document.getElementById('btn-modal-criar-novo-npc');
    if (btnCriarBlank) {
        const clone = btnCriarBlank.cloneNode(true);
        btnCriarBlank.parentNode.replaceChild(clone, btnCriarBlank);
        
        clone.addEventListener('click', async () => {
            const campanhaId = sessionStorage.getItem('campanhaAtiva');
            const iconeOriginal = clone.innerHTML;
            clone.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Forjando...';
            if (window.lucide) lucide.createIcons();
            
            try {
                const res = await fetch(`${window.API_URL}/campanhas/${campanhaId}/criar-npc`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                const data = await res.json();
                
                if (res.ok) {
                    document.getElementById('modal-selecionar-npc').classList.remove('show');
                    window.idPersonagemAtual = data.id;
                    Router.navigate('ficha'); 
                    window.carregarPersonagem(data.id);
                } else {
                    window.mostrarNotificacao(data.erro, 'erro');
                }
            } catch (err) {
                window.mostrarNotificacao('Erro de conexão.', 'erro');
            } finally {
                clone.innerHTML = iconeOriginal;
                if (window.lucide) lucide.createIcons();
            }
        });
    }
});