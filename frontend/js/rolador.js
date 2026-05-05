// js/rolador.js

document.addEventListener('DOMContentLoaded', () => {

    // === DICIONÁRIOS DE ÍCONES (TEMA DINÂMICO DOS ASSETS) ===
    const iconesTemaClaro = {
        sucesso: 'assets/sucesso.png',
        pressao: 'assets/pressao.png',
        adaptacao: 'assets/adaptacao.png',
        nada: 'assets/nada.png'
    };

    const iconesTemaEscuro = {
        sucesso: 'assets/sucesso-branco.png',
        pressao: 'assets/pressao-branco.png',
        adaptacao: 'assets/adaptacao-branco.png',
        nada: 'assets/nada-branco.png'
    };

    function obterIconesAtuais() {
        return document.body.classList.contains('dark') ? iconesTemaEscuro : iconesTemaClaro;
    }

    const inputDados = document.getElementById('rolador-input');
    const rollButton = document.getElementById('rolador-btn-rolar');
    const clearButton = document.getElementById('rolador-btn-limpar');
    const resultsDiv = document.getElementById('rolador-resultados-atuais');
    const historicoDiv = document.getElementById('rolador-historico');

    // ==========================================
    // 1. CONSTRUTOR DE CARTÕES (ESTILO D&D BEYOND)
    // ==========================================
    function criarCardDndBeyond(pacote, animar = false) {
        const avatar = (pacote.avatar && !pacote.avatar.includes('R0lGODlhAQAB')) ? pacote.avatar : './assets/icon.jpg';
        const nomePersonagem = pacote.nome || 'Desconhecido';
        const timestamp = pacote.timestamp || new Date().toISOString();
        const dataFormatada = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(timestamp).toLocaleDateString('pt-BR');

        // 🔥 NOVIDADE: Mapeando os resultados numéricos para exibir no título 🔥
        let numerosRolados = "";
        if (pacote.resultados && pacote.resultados.length > 0) {
            // Pega apenas o número puro (faceMecanica) de cada dado e junta com vírgulas
            const faces = pacote.resultados.map(dado => dado.faceMecanica).join(', ');
            numerosRolados = ` - (${faces})`;
        }

        const rollGroup = document.createElement('div');
        rollGroup.className = 'flex flex-col w-full ' + (animar ? 'animate-fade-in py-4' : 'mb-1');

        let corBorda = 'border-gray-300 dark:border-gray-700';
        let corHover = 'group-hover:border-gray-400 dark:group-hover:border-gray-500';

        // Destaque se for rolagem do usuário atual
        const meuNomeLocal = sessionStorage.getItem('usuarioNome');
        const meuPersonagemLocal = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';
        if (pacote.nome === meuNomeLocal || pacote.nome === meuPersonagemLocal) {
            corBorda = 'border-rpg-red/40 dark:border-red-900/50';
            corHover = 'group-hover:border-rpg-red dark:group-hover:border-red-500';
        }

        rollGroup.innerHTML = `
            <div class="flex items-start gap-2 w-full">
                <img src="${avatar}" class="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm mt-1 bg-black object-cover flex-shrink-0">
                <div class="flex flex-col w-full overflow-hidden">
                    <span class="text-[15px] font-bold text-gray-500 dark:text-gray-400 mb-0.5 pl-1 truncate">${window.escaparHTML(nomePersonagem)}</span>

                    <div class="bg-white dark:bg-[#1a1a1a] border ${corBorda} rounded-lg p-3 shadow-sm flex flex-col group relative overflow-hidden transition-colors">
                        
                        <!-- 🔥 TÍTULO COM OS NÚMEROS AQUI 🔥 -->
                        <span class="text-[12px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate mb-2" title="${window.escaparHTML(pacote.input)}${numerosRolados}">
                            Rolagem: ${window.escaparHTML(pacote.input)} <span class="text-gray-500 dark:text-gray-600">${numerosRolados}</span>
                        </span>

                        <div class="sub-rolls-container flex flex-wrap gap-2 justify-center min-h-[45px]"></div>

                        <div class="bg-gray-50 dark:bg-[#0f172a] rounded p-1.5 text-center mt-3 border border-gray-100 dark:border-gray-800">
                            <span class="text-[10px] font-bold uppercase tracking-wide flex justify-center gap-2">
                                <span class="text-green-600 dark:text-green-500">${pacote.totais?.sucesso || 0} SUC</span>
                                <span class="text-gray-300 dark:text-gray-600">|</span>
                                <span class="text-rpg-red dark:text-red-500">${pacote.totais?.pressao || 0} PRE</span>
                                <span class="text-gray-300 dark:text-gray-600">|</span>
                                <span class="text-blue-600 dark:text-blue-500">${pacote.totais?.adaptacao || 0} ADA</span>
                            </span>
                        </div>

                        <div class="absolute inset-0 border-2 border-transparent ${corHover} rounded-lg pointer-events-none transition-colors duration-300"></div>
                    </div>

                    <span class="text-[13px] font-bold text-white dark:text-gray-600 text-right mt-1 mr-1">${dataFormatada}</span>
                </div>
            </div>
        `;

        const subRollsContainer = rollGroup.querySelector('.sub-rolls-container');
        const iconFilesAtuais = obterIconesAtuais();
        const tempoGiroLogo = 1000;
        const delaySuspense = 300;
        const tempoTotalAntesDados = tempoGiroLogo + delaySuspense;

        if (pacote.resultados) {
            pacote.resultados.forEach(dado => {
                const subRollDiv = document.createElement('div');
                subRollDiv.className = 'relative bg-white dark:bg-[#242424] border border-gray-200 dark:border-gray-700 rounded p-1 text-center shadow-sm min-w-[35px] flex flex-col items-center justify-center';
                subRollDiv.title = `${dado.tipo} rolou ${dado.faceMecanica}`;

                const subRollIcons = document.createElement('div');
                subRollIcons.className = 'icons-container flex flex-wrap gap-0.5 justify-center items-center';

                if (animar) {
                    subRollDiv.classList.add('opacity-0');
                    subRollDiv.style.transition = 'opacity 0.3s ease';

                    const logoImg = document.createElement('img');
                    logoImg.src = 'assets/icon.jpg';
                    logoImg.className = 'logo-animado absolute top-1/2 left-1/2 rounded-full w-[25px] h-[25px] object-contain z-10';
                    subRollDiv.appendChild(logoImg);

                    dado.icones.forEach((iconName, index) => {
                        const img = document.createElement('img');
                        img.src = iconFilesAtuais[iconName];
                        img.className = 'dado-animado w-[20px] h-[20px] object-contain';
                        const delayDados = tempoTotalAntesDados / 1000;
                        img.style.animationDelay = `${delayDados + (index * 0.1)}s`;
                        subRollIcons.appendChild(img);
                    });

                    setTimeout(() => {
                        subRollDiv.classList.remove('opacity-0');
                        subRollIcons.style.opacity = '1';
                    }, tempoTotalAntesDados);

                } else {
                    dado.icones.forEach(iconName => {
                        const img = document.createElement('img');
                        img.src = iconFilesAtuais[iconName];
                        img.className = 'w-[20px] h-[20px] object-contain opacity-100 visible';
                        subRollIcons.appendChild(img);
                    });
                }

                subRollDiv.appendChild(subRollIcons);
                subRollsContainer.appendChild(subRollDiv);
            });
        }

        return { card: rollGroup, tempoAnimacao: animar ? tempoTotalAntesDados : 0 };
    }

    function renderizarRolagem(pacote) {
        if (!resultsDiv || !historicoDiv) return;

        const emptyMsg = historicoDiv.querySelector('p.italic');
        if (emptyMsg) emptyMsg.remove();

        // 1. Renderiza animado no topo
        const { card, tempoAnimacao } = criarCardDndBeyond(pacote, true);
        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(card);

        // 2. Move para o histórico infinito após animação
        setTimeout(() => {
            const historyCard = criarCardDndBeyond(pacote, false).card;
            historicoDiv.prepend(historyCard);
            resultsDiv.innerHTML = '';
        }, tempoAnimacao + 600);
    }

    // ==========================================
    // 2. CONEXÃO MULTIPLAYER E ISOLAMENTO DE CONTEXTO
    // ==========================================
    function iniciarMultiplayer() {
        // Se a conexão não estiver pronta, tenta de novo em 50ms, evitando atrasos longos!
        if (!window.socket) {
            setTimeout(iniciarMultiplayer, 50); 
            return;
        }

        // Ouvindo novas rolagens dos aliados
        window.socket.off('nova-rolagem'); // Previne duplicação de ouvintes
        window.socket.on('nova-rolagem', (pacoteDeDados) => {
            const campanhaAtiva = sessionStorage.getItem('campanhaAtiva');
            if (!campanhaAtiva || pacoteDeDados.campanhaId !== campanhaAtiva) return; 

            renderizarRolagem(pacoteDeDados);

            const panel = document.getElementById('game-log-sidebar');
            if (panel && panel.classList.contains('translate-x-full')) {
                if (typeof window.mostrarNotificacao === 'function') {
                    window.mostrarNotificacao(`Rolagem de ${pacoteDeDados.nome || 'alguém'}!`, 'aviso');
                }
            }
        });

        // Carregando Histórico Antigo ao entrar na mesa
        window.socket.off('carregar-historico'); // Previne duplicação
        window.socket.on('carregar-historico', (historico) => {
            if (!historicoDiv) return;
            
            const campanhaAtiva = sessionStorage.getItem('campanhaAtiva');
            if (!campanhaAtiva) {
                historicoDiv.innerHTML = '<p class="text-center text-gray-500 text-xs italic font-bold mt-4">Terminal Local Ativo.<br>Acesse por uma campanha para ativar a rede multiplayer.</p>';
                return;
            }

            // Limpa a tela
            historicoDiv.innerHTML = '';
            
            // Se o histórico vier vazio do banco de dados, escreve a mensagem padrão!
            if (!historico || historico.length === 0) {
                historicoDiv.innerHTML = '<p class="text-center text-gray-400 text-xs italic font-bold mt-4">O destino aguarda os dados...</p>';
                return;
            }

            historico.forEach(pacoteBruto => {
                try {
                    const pacote = typeof pacoteBruto === 'string' ? JSON.parse(pacoteBruto) : pacoteBruto;
                    const meuNomeLocal = sessionStorage.getItem('usuarioNome');
                    const meuPersonagemLocal = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';
                    
                    const souMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
                    const meuId = sessionStorage.getItem('usuarioId');
                    const fuiEuQuemRolou = (pacote.usuarioId === meuId) ||
                        (!pacote.usuarioId && (pacote.nome === meuNomeLocal || pacote.nome === meuPersonagemLocal));

                    // Mantém as rolagens do mestre em segredo absoluto
                    if (!souMestre && !fuiEuQuemRolou && pacote.isMestre && !pacote.isRolagemPublica) return; 

                    const { card } = criarCardDndBeyond(pacote, false);
                    historicoDiv.prepend(card);
                } catch (err) {
                    console.error("❌ Erro ao desenhar rolagem antiga.");
                }
            });
        });
    }
    
    // Inicia a vigilância imediatamente!
    iniciarMultiplayer();

    // ==========================================
    // 3. MATEMÁTICA E LÓGICA DE ROLAGEM
    // ==========================================
    const diceTable = {
        d6: {
            1: ['nada'],
            2: ['nada'],
            3: ['pressao'],
            4: ['pressao'],
            5: ['adaptacao', 'pressao'],
            6: ['sucesso']
        },
        d10: {
            1: ['nada'],
            2: ['nada'],
            3: ['pressao'],
            4: ['pressao'],
            5: ['adaptacao', 'pressao'],
            6: ['sucesso'],
            7: ['sucesso', 'sucesso'],
            8: ['sucesso', 'adaptacao'],
            9: ['sucesso', 'adaptacao', 'pressao'],
            10: ['sucesso', 'sucesso', 'pressao']
        },
        d12: {
            1: ['nada'],
            2: ['nada'],
            3: ['pressao'],
            4: ['pressao'],
            5: ['adaptacao', 'pressao'],
            6: ['sucesso'],
            7: ['sucesso', 'sucesso'],
            8: ['sucesso', 'adaptacao'],
            9: ['sucesso', 'adaptacao', 'pressao'],
            10: ['sucesso', 'sucesso', 'pressao'],
            11: ['sucesso', 'adaptacao', 'adaptacao', 'pressao'],
            12: ['pressao', 'pressao']
        }
    };

    function rollDie(max) { return Math.floor(Math.random() * max) + 1; }

    function parseInput(inputString) {
        const diceRequests = [];
        const parts = inputString.trim().toLowerCase().split(/\s+/);
        for (const part of parts) {
            if (!part) continue;
            const match = part.match(/^(\d*)d(\d+)$/);
            if (!match) {
                if (typeof window.mostrarNotificacao === 'function') window.mostrarNotificacao(`Formato inválido: "${part}". Use "2d6", "1d10"`, 'erro');
                return null;
            }
            const quantity = parseInt(match[1] || '1', 10);
            const size = parseInt(match[2], 10);
            if (![6, 10, 12].includes(size)) {
                if (typeof window.mostrarNotificacao === 'function') window.mostrarNotificacao(`Dado inválido: "d${size}". Use d6, d10 ou d12.`, 'aviso');
                return null;
            }
            diceRequests.push({ quantity, size });
        }
        return diceRequests;
    }

    function handleRoll() {
        const inputString = inputDados.value;
        const parsedDice = parseInput(inputString);
        if (!parsedDice || parsedDice.length === 0) return;

        const campanhaAtiva = sessionStorage.getItem('campanhaAtiva');
        let nomeRolador = 'Operador Misterioso';
        const inputNome = document.getElementById('nome');

        if (inputNome && inputNome.value.trim() !== '') {
            nomeRolador = inputNome.value.trim();
        } else if (sessionStorage.getItem('usuarioNome') && sessionStorage.getItem('usuarioNome') !== 'undefined') {
            nomeRolador = sessionStorage.getItem('usuarioNome');
        }

        // 🔥 A MÁGICA VISUAL: Capturar a foto dependendo de onde o jogador está! 🔥
        let fotoAvatar = './assets/icon.jpg';
        const telaAtual = sessionStorage.getItem('telaAtual');
        
        if (telaAtual === 'ficha') {
            // Se estiver na ficha, pega a foto do personagem!
            const imgPersonagem = document.getElementById('char-photo-preview');
            if (imgPersonagem && imgPersonagem.src && !imgPersonagem.src.includes('R0lGODlhAQAB')) {
                fotoAvatar = imgPersonagem.src;
            }
        } else {
            // Se estiver na mesa da campanha, pega a foto de perfil do usuário!
            const imgPerfil = document.getElementById('nav-avatar-img');
            if (imgPerfil && imgPerfil.src && !imgPerfil.src.includes('R0lGODlhAQAB')) {
                fotoAvatar = imgPerfil.src;
            }
        }

        const pacoteDeDados = {
            nome: nomeRolador,
            usuarioId: sessionStorage.getItem('usuarioId'),
            avatar: fotoAvatar,
            timestamp: new Date().toISOString(),
            input: inputString,
            campanhaId: campanhaAtiva,
            
            isRolagemPublica: (sessionStorage.getItem('isMestreAtivo') === 'true' && document.getElementById('toggle-rolagem-mestre')) ? !document.getElementById('toggle-rolagem-mestre').checked : true,
            
            resultados: [],
            totais: { sucesso: 0, pressao: 0, adaptacao: 0, nada: 0 }
        };

        let dieCounter = { d6: 0, d10: 0, d12: 0 };

        parsedDice.forEach(die => {
            const dieType = 'd' + die.size;
            for (let i = 0; i < die.quantity; i++) {
                dieCounter[dieType]++;
                const rollNumber = rollDie(die.size);
                const icons = diceTable[dieType][rollNumber];

                icons.forEach(iconName => pacoteDeDados.totais[iconName]++);

                pacoteDeDados.resultados.push({
                    tipo: dieType,
                    numero: dieCounter[dieType],
                    faceMecanica: rollNumber,
                    icones: icons
                });
            }
        });
        
        renderizarRolagem(pacoteDeDados);

        // SINCRONIZAÇÃO BLINDADA
        if (campanhaAtiva && window.socket) {
            pacoteDeDados.token = sessionStorage.getItem('token'); 
            window.socket.emit('rolar-dados', pacoteDeDados);
        }

        window.limparRoladorLocal(); 
    }

    if (rollButton) rollButton.addEventListener('click', handleRoll);
    if (inputDados) inputDados.addEventListener('keypress', (event) => { if (event.key === 'Enter') handleRoll(); });
   
    // ==========================================
    // 4. ROLADOR INTELIGENTE E VIGIA DO TERMINAL
    // ==========================================
    const labelsAptidoes = document.querySelectorAll('.aptidao-box label');
    let avisoAssimilada = document.getElementById('aviso-assimilada');
    const containerAviso = document.getElementById('aviso-assimilada-container');
    
    if (!avisoAssimilada && containerAviso) {
        avisoAssimilada = document.createElement('div');
        avisoAssimilada.id = 'aviso-assimilada';
        avisoAssimilada.className = 'hidden w-full text-center text-rpg-red dark:text-red-500 font-black font-rpg text-sm mb-2 animate-pulse uppercase tracking-widest bg-red-100 dark:bg-red-900/30 p-1 rounded border border-red-500 shadow-sm';
        avisoAssimilada.innerHTML = '<i data-lucide="flame" class="w-4 h-4 inline-block align-text-bottom"></i> Rolagem Assimilada <i data-lucide="flame" class="w-4 h-4 inline-block align-text-bottom"></i>';
        containerAviso.appendChild(avisoAssimilada);
        if (window.lucide) lucide.createIcons();
    }

    // 🔥 FUNÇÃO GLOBAL PARA APAGAR AS LUZES 🔥
    window.limparRoladorLocal = function() {
        if (inputDados) inputDados.value = '';
        labelsAptidoes.forEach(lbl => {
            lbl.classList.remove('label-selecionado', 'ring-2', 'ring-rpg-red', 'ring-offset-2', 'dark:ring-offset-[#1a1a1a]');
            lbl.removeAttribute('data-clicks');
        });
        if (avisoAssimilada) avisoAssimilada.classList.add('hidden');
    }

    // 👁️ O OLHO QUE TUDO VÊ (Vigia se a gaveta foi fechada de qualquer forma)
    const sidebarLog = document.getElementById('game-log-sidebar');
    if (sidebarLog) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    // Se a gaveta ganhou a classe "translate-x-full", significa que ela fechou!
                    if (sidebarLog.classList.contains('translate-x-full')) {
                        window.limparRoladorLocal(); // Limpa as aptidões silenciosamente
                    }
                }
            });
        });
        observer.observe(sidebarLog, { attributes: true });
    }

    // Função que "Lê" a ficha e monta a rolagem!
    function recalcularRolagemInput() {
        if (!inputDados) return;

        const selecionados = document.querySelectorAll('.aptidao-box label.label-selecionado');
        let instintos = [];
        let outrasAptidoes = [];
        let contadorDeMarcacoes = 0; 

        selecionados.forEach(lbl => {
            const box = lbl.closest('.aptidao-box');
            const dots = box.querySelectorAll('input[type="checkbox"]:checked').length;
            
            if (box.closest('#secao-instintos')) {
                let clicks = parseInt(lbl.getAttribute('data-clicks') || '1');
                contadorDeMarcacoes += clicks; 
                for(let i = 0; i < clicks; i++) {
                    instintos.push(dots);
                }
            } else {
                contadorDeMarcacoes += 1; 
                outrasAptidoes.push(dots);
            }
        });

        let isAssimilada = false;
        
        if (instintos.length >= 2) {
            isAssimilada = true;
            document.querySelectorAll('.aptidao-box label.label-selecionado').forEach(lbl => {
                if (!lbl.closest('#secao-instintos')) {
                    lbl.classList.remove('label-selecionado');
                }
            });
            outrasAptidoes = []; 
        }

        let partes = [];
        if (isAssimilada) {
            if (avisoAssimilada) avisoAssimilada.classList.remove('hidden');
            instintos.forEach(dots => partes.push(`${dots}d12`));
        } else {
            if (avisoAssimilada) avisoAssimilada.classList.add('hidden');
            instintos.forEach(dots => partes.push(`${dots}d6`));
            outrasAptidoes.forEach(dots => partes.push(`${dots}d10`));
        }

        inputDados.value = partes.join(' '); 

        if (partes.length > 0) {
            inputDados.classList.add('ring-2', 'ring-rpg-red');
            setTimeout(() => inputDados.classList.remove('ring-2', 'ring-rpg-red'), 200);
        }

        // Abertura automática a partir de 2 marcações
        if (contadorDeMarcacoes >= 2 && sidebarLog) {
            if (sidebarLog.classList.contains('translate-x-full')) {
                sidebarLog.classList.remove('translate-x-full');
            }
        }
    }

    // O Clique Mágico Inteligente
    labelsAptidoes.forEach(label => {
        label.addEventListener('click', function() {
            const box = this.closest('.aptidao-box');
            const checkedCount = box.querySelectorAll('input[type="checkbox"]:checked').length;
            if (checkedCount === 0) return; 

            const isInstinto = box.closest('#secao-instintos') !== null;

            if (isInstinto) {
                // Instintos: Sistema de 3 Estados (1 clique, 2 cliques, desliga)
                if (!this.classList.contains('label-selecionado')) {
                    this.classList.add('label-selecionado');
                    this.setAttribute('data-clicks', '1');
                } else {
                    let clicks = parseInt(this.getAttribute('data-clicks') || '1');
                    if (clicks === 1) {
                        this.setAttribute('data-clicks', '2');
                        this.classList.add('ring-2', 'ring-rpg-red', 'ring-offset-2', 'dark:ring-offset-[#1a1a1a]');
                    } else {
                        this.classList.remove('label-selecionado', 'ring-2', 'ring-rpg-red', 'ring-offset-2', 'dark:ring-offset-[#1a1a1a]');
                        this.removeAttribute('data-clicks');
                    }
                }
            } else {
                // Conhecimento/Prática: Troca Inteligente!
                if (!this.classList.contains('label-selecionado')) {
                    // Desliga todos os outros conhecimentos e práticas antes de ligar este
                    document.querySelectorAll('.aptidao-box label.label-selecionado').forEach(lbl => {
                        if (!lbl.closest('#secao-instintos')) {
                            lbl.classList.remove('label-selecionado');
                        }
                    });
                    this.classList.add('label-selecionado');
                } else {
                    this.classList.remove('label-selecionado');
                }
            }
            
            recalcularRolagemInput();
        });
    });

    // ==========================================
    // 5. BOTÃO LIMPAR E FILTRO DE HISTÓRICO
    // ==========================================
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (resultsDiv) resultsDiv.innerHTML = '';
            if (historicoDiv) historicoDiv.innerHTML = '<p class="text-center text-gray-400 text-xs italic font-bold">O destino aguarda os dados...</p>';
            
            const inputFiltroHistorico = document.getElementById('filtro-historico');
            if (inputFiltroHistorico) inputFiltroHistorico.value = '';
            
            window.limparRoladorLocal(); 
        });
    }

    const inputFiltroHistorico = document.getElementById('filtro-historico');
    if (inputFiltroHistorico) {
        inputFiltroHistorico.addEventListener('input', (e) => {
            const termoBusca = e.target.value.toLowerCase().trim();
            const rolagensSalvas = historicoDiv.children;

            Array.from(rolagensSalvas).forEach(caixaDeRolagem => {
                if (caixaDeRolagem.tagName.toLowerCase() === 'p') return; 

                const nomeSpan = caixaDeRolagem.querySelector('span.truncate');
                const rolagemSpan = caixaDeRolagem.querySelector('.tracking-widest');
                
                let texto = '';
                if (nomeSpan) texto += nomeSpan.textContent.toLowerCase() + ' ';
                if (rolagemSpan) texto += rolagemSpan.textContent.toLowerCase();

                if (texto.includes(termoBusca)) {
                    caixaDeRolagem.style.display = 'flex';
                } else {
                    caixaDeRolagem.style.display = 'none';
                }
            });
        });
    }
    
    // CSS Dinâmico na memória (Somente Animações)
    const style = document.createElement('style');
    style.textContent = `
        @keyframes logoGiraEntra {
            0% { transform: translate(-50%, -50%) rotate(0deg) scale(0); opacity: 0; }
            50% { transform: translate(-50%, -50%) rotate(720deg) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) rotate(1080deg) scale(1); opacity: 1; }
        }
        @keyframes fadeSumi {
            to { opacity: 0; visibility: hidden; }
        }
        .logo-animado {
            animation: logoGiraEntra 1s cubic-bezier(0.17, 0.89, 0.32, 1.28) forwards, fadeSumi 0.3s ease-out forwards;
            animation-delay: 0s, 1s;
        }
        @keyframes rolarAnimado {
            0% { transform: rotate(-540deg) scale(0.1); opacity: 0; }
            50% { transform: rotate(20deg) scale(1.2); opacity: 1; }
            100% { transform: rotate(0deg) scale(1); opacity: 1; visibility: visible; }
        }
        .dado-animado {
            animation: rolarAnimado 0.6s cubic-bezier(0.17, 0.89, 0.32, 1.28) forwards;
            opacity: 0;
        }
        .label-selecionado {
            transform: scale(0.95) !important;
            filter: brightness(1.3) !important;
            box-shadow: inset 0 0 0 2px #ffffff, 0 0 10px rgba(255, 255, 255, 0.5) !important;
        }
        .dark .label-selecionado {
            box-shadow: inset 0 0 0 2px #f97316, 0 0 10px rgba(249, 115, 22, 0.5) !important;
        }
    `;
    document.head.appendChild(style);
});