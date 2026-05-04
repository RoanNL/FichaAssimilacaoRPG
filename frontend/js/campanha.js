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
    // 2. CARREGAR LOBBY DA CAMPANHA
    // ==========================================
    window.carregarLobbyCampanha = async function() {
        const campanhaId = sessionStorage.getItem('campanhaAtiva');
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        const nomeCampanha = sessionStorage.getItem('campanhaNome');
        const codigoCampanha = sessionStorage.getItem('campanhaCodigo');

        if (!campanhaId) return;

        document.getElementById('campanha-titulo-view').textContent = nomeCampanha || 'Mesa Desconhecida';
        document.getElementById('campanha-codigo-view').textContent = codigoCampanha || '---';

        const painelMestre = document.getElementById('painel-mestre-botoes');
        if (isMestre) {
            if(painelMestre) painelMestre.classList.remove('hidden');
        } else {
            if(painelMestre) painelMestre.classList.add('hidden');
        }

        if (window.socket.connected) {
            window.socket.emit('entrar-na-campanha', {
                campanhaId: campanhaId,
                token: sessionStorage.getItem('token')
            });
        }

        await carregarFichasDaMesa(campanhaId, isMestre);
        
        const secaoJogadores = document.getElementById('grid-jogadores-mesa-view')?.parentElement;
        if (isMestre) {
            if(secaoJogadores) secaoJogadores.style.display = 'block'; 
            await carregarJogadoresDaMesa(campanhaId);
            await carregarPartituraDoBanco(campanhaId); 
        } else {
            if(secaoJogadores) secaoJogadores.style.display = 'none'; 
        }
    };

    // ==========================================
    // 3. RENDERIZAR FICHAS DOS ALIADOS (COM FOTO)
    // ==========================================
    async function carregarFichasDaMesa(campanhaId, isMestre) {
        const gridFichas = document.getElementById('grid-fichas-mesa-view');
        if(!gridFichas) return;
        
        gridFichas.innerHTML = '<p class="text-gray-500 italic animate-pulse">Procurando sobreviventes...</p>';

        try {
            const endpoint = isMestre ? `/campanhas/${campanhaId}/fichas-mesa` : `/campanhas/${campanhaId}/personagens`;
            const resposta = await fetch(`${window.API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            
            if (!resposta.ok) throw new Error("Erro ao buscar fichas");
            let fichas = await resposta.json();

            const meuId = sessionStorage.getItem('usuarioId');
            if (isMestre) fichas = fichas.filter(char => char.usuario_id != meuId);

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
                const avatarJogador = (char.avatar && !char.avatar.includes('R0lGODlhAQAB')) ? char.avatar : './assets/icon.jpg';

                card.innerHTML = `
                    <img src="${imgSrc}" class="w-[110px] h-[130px] min-h-[130px] object-cover flex-shrink-0 border-r border-gray-300 dark:border-[#333] bg-black" alt="Foto">
                    <div class="flex flex-col justify-start p-3 flex-grow overflow-hidden">
                        <h3 class="text-gray-800 dark:text-white font-bold text-[15px] m-0 truncate" title="${window.escaparHTML(char.nome_personagem)}">
                            ${window.escaparHTML(char.nome_personagem) || 'Sem Nome'}
                        </h3>
                        
                        <div class="flex items-center gap-1.5 mt-1">
                            <img src="${avatarJogador}" class="w-5 h-5 rounded-full object-cover border border-gray-400 dark:border-gray-600 shadow-sm">
                            <p class="text-rpg-red dark:text-orange-500 font-bold text-[10px] uppercase m-0 truncate">${window.escaparHTML(nomeJogador)}</p>
                        </div>
                        
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
        if(!gridJogadores) return;
        
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
                const avatarJogador = (jog.avatar && !jog.avatar.includes('R0lGODlhAQAB')) ? jog.avatar : './assets/icon.jpg'; 
                
                const meuId = sessionStorage.getItem('usuarioId');
                const isEsteOMestre = jog.usuario_id == meuId;

                const controleHtml = isEsteOMestre 
                    ? `<span class="text-orange-500 font-bold text-sm flex items-center justify-center gap-1 mt-3 w-full border-t border-gray-300 dark:border-gray-700 pt-2"><i data-lucide="crown" class="w-4 h-4"></i> Mestre</span>`
                    : `<button class="btn-remover-jogador-mesa mt-3 bg-rpg-red hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded text-xs uppercase font-rpg w-full transition-colors flex justify-center items-center gap-1" data-usuario="${jog.usuario_id}"><i data-lucide="user-x" class="w-4 h-4"></i> Expulsar</button>`;

                card.innerHTML = `
                    <div class="flex items-center gap-3 mb-2 border-b border-gray-300 dark:border-gray-700 pb-2">
                        <img src="${avatarJogador}" class="w-10 h-10 rounded-full border border-gray-400 object-cover shadow-sm">
                        <div class="overflow-hidden">
                            <h4 class="text-gray-800 dark:text-white font-bold text-base m-0 truncate" title="${window.escaparHTML(nomeConta)}">${window.escaparHTML(nomeConta)}</h4>
                        </div>
                    </div>
                    <div>
                        <p class="text-gray-500 text-xs font-bold uppercase m-0 mt-1 truncate" title="${window.escaparHTML(nomeChar)}"><i data-lucide="user" class="w-3 h-3 inline"></i> ${window.escaparHTML(nomeChar)}</p>
                    </div>
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
            gridJogadores.innerHTML = '<p class="text-rpg-red">Erro ao buscar jogadores na matriz.</p>';
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

    window.prepararExpulsaoJogador = function(id, nome, card, campId) {
        jogadorParaRemoverId = id;
        nomeJogadorLimpo = nome;
        cardJogadorParaRemover = card;
        campanhaIdAtual = campId;

        if(targetNameJogador) targetNameJogador.textContent = nomeJogadorLimpo;
        if(inputRemoveJogador) inputRemoveJogador.value = '';
        if(btnConfirmRemoveJogador) {
            btnConfirmRemoveJogador.disabled = true;
            btnConfirmRemoveJogador.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if(modalRemoveJogador) modalRemoveJogador.classList.add('show');
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
    // 6. FERRAMENTAS DO MESTRE & AUTOSAVE
    // ==========================================
    const containerAmeacas = document.getElementById('container-ameacas');
    const containerObjetivos = document.getElementById('container-objetivos');
    const containerRefugios = document.getElementById('container-refugios');

    function criarAmeaca(nome = '', desc = '') {
        if(!containerAmeacas) return;
        const bloco = document.createElement('div');
        bloco.className = 'ameaca-item bg-white dark:bg-[#2a2a2a] p-4 rounded-md shadow-inner border border-gray-300 dark:border-gray-600 mb-3 focus-within:ring-2 focus-within:ring-rpg-red transition-all relative';
        bloco.innerHTML = `
            <div class="flex justify-between items-center mb-2 border-b-2 border-red-900 pb-1">
                <input type="text" class="item-nome w-full font-bold p-1 bg-transparent text-black dark:text-white text-base outline-none" placeholder="Nome da Ameaça" value="${window.escaparHTML(nome)}">
                <button type="button" class="btn-del-item ml-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow-sm border-none"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <textarea rows="2" class="item-desc w-full p-1 bg-transparent text-black dark:text-gray-300 outline-none resize-y text-sm" placeholder="Descrição e Status do Relógio...">${window.escaparHTML(desc)}</textarea>
        `;
        containerAmeacas.appendChild(bloco);
    }

    function criarObjetivo(nome = '', atual = 0, max = 10, desc = '') {
        if(!containerObjetivos) return;
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

    function criarRefugio(nome = '', seg = '', rec = '', desc = '') {
        if(!containerRefugios) return;
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

    // --- EVENTOS DOS BOTÕES DE "ADICIONAR" (Blindagem Máxima contra IDs diferentes) ---
    const ligarBotao = (ids, funcao) => {
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => { funcao(); if(window.lucide) lucide.createIcons(); agendarAutosavePartitura(); });
        });
    };

    ligarBotao(['btn-add-ameaca', 'btn-criar-ameaca', 'btn-nova-ameaca'], criarAmeaca);
    ligarBotao(['btn-add-objetivo', 'btn-criar-objetivo', 'btn-novo-objetivo'], criarObjetivo);
    ligarBotao(['btn-add-refugio', 'btn-criar-refugio', 'btn-novo-refugio'], criarRefugio);

    // --- AUTOSAVE E LÓGICA DA BARRA ---
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

    [containerAmeacas, containerObjetivos, containerRefugios].forEach(container => {
        if (!container) return;
        
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('obj-atual') || e.target.classList.contains('obj-max')) {
                atualizarBarraObjetivo(e.target.closest('.objetivo-item'));
            }
            agendarAutosavePartitura();
        });

        container.addEventListener('click', (e) => {
            const btnDel = e.target.closest('.btn-del-item');
            if (btnDel) {
                btnDel.closest('.ameaca-item, .objetivo-item, .refugio-item').remove();
                agendarAutosavePartitura();
            }
        });
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
            if(window.lucide) lucide.createIcons();
            
        } catch (erro) {
            console.error("Erro ao puxar a partitura antiga.");
        }
    }
});