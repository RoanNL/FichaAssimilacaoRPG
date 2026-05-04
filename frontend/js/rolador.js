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

    // ==========================================
    // 1. CONEXÃO MULTIPLAYER DAS ROLAGENS
    // ==========================================
    // Aguarda um milissegundo para garantir que o 'window.socket' foi criado no 'campanha.js'
    setTimeout(() => {
        if (window.socket) {
            
            // Ouvindo novas rolagens dos aliados
            window.socket.on('nova-rolagem', (pacoteDeDados) => {
                const souMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
                const meuId = sessionStorage.getItem('usuarioId');
                const meuNomeLocal = sessionStorage.getItem('usuarioNome');
                const meuPersonagemLocal = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';

                const fuiEuQuemRolou = (pacoteDeDados.usuarioId === meuId) ||
                    (!pacoteDeDados.usuarioId && (pacoteDeDados.nome === meuNomeLocal || pacoteDeDados.nome === meuPersonagemLocal));

                if (!souMestre && !fuiEuQuemRolou) {
                    return; 
                }
                renderizarRolagem(pacoteDeDados);
            });

            // Carregando Histórico Antigo ao dar F5
            window.socket.on('carregar-historico', (historico) => {
                const historicoDiv = document.getElementById('rolador-historico');
                if (!historicoDiv) return;
                historicoDiv.innerHTML = '';
                const iconFilesSeguro = obterIconesAtuais();

                historico.forEach(pacoteBruto => {
                    try {
                        const pacote = typeof pacoteBruto === 'string' ? JSON.parse(pacoteBruto) : pacoteBruto;
                        const historyEntry = document.createElement('div');
                        const meuNomeLocal = sessionStorage.getItem('usuarioNome');
                        const meuPersonagemLocal = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';
                        
                        historyEntry.style.borderBottom = '1px solid var(--color-border-medium)';
                        historyEntry.style.paddingBottom = '15px';
                        historyEntry.style.marginBottom = '15px';

                        const souMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
                        const meuId = sessionStorage.getItem('usuarioId');
                        const fuiEuQuemRolou = (pacote.usuarioId === meuId) ||
                            (!pacote.usuarioId && (pacote.nome === meuNomeLocal || pacote.nome === meuPersonagemLocal));

                        if (!souMestre && !fuiEuQuemRolou) return;

                        const header = document.createElement('h3');
                        header.textContent = `${pacote.nome} rolou: ${pacote.input}`;
                        header.style.marginTop = '0';

                        if (pacote.nome !== meuNomeLocal && pacote.nome !== meuPersonagemLocal) {
                            header.style.color = '#3a7c8c'; // azul da assimilação
                        }
                        historyEntry.appendChild(header);

                        const subRollsContainer = document.createElement('div');
                        subRollsContainer.className = 'sub-rolls-container flex flex-wrap gap-3 mt-3 justify-center';

                        if (pacote.resultados) {
                            pacote.resultados.forEach(dado => {
                                const subRollDiv = document.createElement('div');
                                subRollDiv.className = 'sub-roll bg-white dark:bg-[#242424] border border-gray-300 dark:border-[#444] rounded-lg p-2 text-center shadow-sm w-[120px]';

                                const subRollHeader = document.createElement('h4');
                                subRollHeader.textContent = `${dado.tipo} #${dado.numero} (rolou ${dado.faceMecanica})`;
                                subRollHeader.className = 'text-xs font-bold text-gray-500 border-b border-gray-200 dark:border-[#555] pb-1 mb-2';

                                const subRollIcons = document.createElement('div');
                                subRollIcons.className = 'icons-container flex flex-wrap gap-1 justify-center min-h-[40px] items-center';

                                if (dado.icones) {
                                    dado.icones.forEach(iconName => {
                                        const img = document.createElement('img');
                                        img.src = iconFilesSeguro[iconName];
                                        img.alt = iconName;
                                        img.className = 'w-[35px] h-[35px] object-contain';
                                        
                                        // 🔥 AS LINHAS MÁGICAS (Força os ícones a aparecerem ignorando o CSS global)
                                        img.style.opacity = '1';
                                        img.style.visibility = 'visible';

                                        subRollIcons.appendChild(img);
                                    });
                                }

                                subRollDiv.appendChild(subRollHeader);
                                subRollDiv.appendChild(subRollIcons);
                                subRollsContainer.appendChild(subRollDiv);
                            });
                        }

                        historyEntry.appendChild(subRollsContainer);

                        const summary = document.createElement('p');
                        summary.className = 'rolador-summary text-center bg-[#e9e5d9] dark:bg-[#0f172a] p-2 rounded-md font-bold mt-3 text-sm';
                        summary.textContent = `Total: ${pacote.totais?.sucesso || 0} Sucesso, ${pacote.totais?.pressao || 0} Pressão, ${pacote.totais?.adaptacao || 0} Adaptação.`;
                        historyEntry.appendChild(summary);

                        historicoDiv.prepend(historyEntry);
                    } catch (err) {
                        console.error("❌ Erro ao desenhar rolagem antiga:", err);
                    }
                });
            });
        }
    }, 500);

    // ==========================================
    // 2. MATEMÁTICA E LÓGICA DE ROLAGEM
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

    const inputDados = document.getElementById('rolador-input');
    const rollButton = document.getElementById('rolador-btn-rolar');
    const clearButton = document.getElementById('rolador-btn-limpar');
    const resultsDiv = document.getElementById('rolador-resultados-atuais');
    const historicoDiv = document.getElementById('rolador-historico');

    function rollDie(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    function parseInput(inputString) {
        const diceRequests = [];
        const parts = inputString.trim().toLowerCase().split(/\s+/);
        for (const part of parts) {
            if (!part) continue;
            const match = part.match(/^(\d*)d(\d+)$/);
            if (!match) {
                if (typeof window.mostrarNotificacao === 'function') window.mostrarNotificacao(`Formato inválido: "${part}". Use "2d6", "1d10", etc.`, 'erro');
                return null;
            }
            const quantity = parseInt(match[1] || '1', 10);
            const size = parseInt(match[2], 10);
            if (![6, 10, 12].includes(size)) {
                if (typeof window.mostrarNotificacao === 'function') window.mostrarNotificacao(`Dado inválido: "d${size}". Use apenas d6, d10 ou d12.`, 'aviso');
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

        const pacoteDeDados = {
            nome: nomeRolador,
            usuarioId: sessionStorage.getItem('usuarioId'),
            input: inputString,
            campanhaId: campanhaAtiva,
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

        if (campanhaAtiva && window.socket) {
            pacoteDeDados.token = sessionStorage.getItem('token'); 
            window.socket.emit('rolar-dados', pacoteDeDados);
        }
    }

    // ==========================================
    // 3. ANIMAÇÃO DE GIRO E RENDERIZAÇÃO
    // ==========================================
    function renderizarRolagem(pacote) {
        resultsDiv.innerHTML = '';

        const rollGroup = document.createElement('div');
        rollGroup.style.borderBottom = '1px solid var(--color-border-medium)';
        rollGroup.style.paddingBottom = '15px';
        rollGroup.style.marginBottom = '15px';

        const header = document.createElement('h3');
        header.textContent = `${pacote.nome} rolou: ${pacote.input}`;
        header.style.marginTop = '0';

        const meuNomeLocal = sessionStorage.getItem('usuarioNome');
        const meuPersonagemLocal = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';

        if (pacote.nome !== meuNomeLocal && pacote.nome !== meuPersonagemLocal) {
            header.style.color = '#3a7c8c'; 
        }

        rollGroup.appendChild(header);

        const subRollsContainer = document.createElement('div');
        subRollsContainer.className = 'sub-rolls-container flex flex-wrap gap-3 justify-center mt-3';

        const tempoGiroLogo = 1000;
        const delaySuspense = 300;
        const tempoTotalAntesDados = tempoGiroLogo + delaySuspense;

        const iconFilesAtuais = obterIconesAtuais();

        pacote.resultados.forEach(dado => {
            const subRollDiv = document.createElement('div');
            subRollDiv.className = 'sub-roll relative bg-white dark:bg-[#242424] border border-gray-300 dark:border-[#444] rounded-lg p-2 text-center shadow-sm w-[120px]';

            const subRollHeader = document.createElement('h4');
            subRollHeader.textContent = `${dado.tipo} #${dado.numero} (rolou ${dado.faceMecanica})`;
            subRollHeader.className = 'text-xs font-bold text-gray-500 border-b border-gray-200 dark:border-[#555] pb-1 mb-2 opacity-0 transition-opacity duration-300';

            const subRollIcons = document.createElement('div');
            subRollIcons.className = 'icons-container flex flex-wrap gap-1 justify-center min-h-[40px] items-center opacity-0 transition-opacity duration-300';

            const logoImg = document.createElement('img');
            logoImg.src = 'assets/icon.jpg';
            logoImg.className = 'logo-animado absolute top-1/2 left-1/2 rounded-full w-[50px] h-[50px] object-contain z-10';
            subRollDiv.appendChild(logoImg);

            dado.icones.forEach((iconName, index) => {
                const img = document.createElement('img');
                img.src = iconFilesAtuais[iconName];
                img.alt = iconName;
                img.className = 'dado-animado w-[35px] h-[35px] object-contain';
                
                const delayDados = tempoTotalAntesDados / 1000;
                img.style.animationDelay = `${delayDados + (index * 0.1)}s`;

                subRollIcons.appendChild(img);
            });

            setTimeout(() => {
                subRollIcons.style.opacity = '1';
                subRollHeader.style.opacity = '1';
            }, tempoTotalAntesDados);

            subRollDiv.appendChild(subRollHeader);
            subRollDiv.appendChild(subRollIcons);
            subRollsContainer.appendChild(subRollDiv);
        });

        rollGroup.appendChild(subRollsContainer);

        const summary = document.createElement('p');
        summary.className = 'rolador-summary text-center bg-[#e9e5d9] dark:bg-[#0f172a] p-2 rounded-md font-bold mt-3 text-sm';
        summary.textContent = `Total: ${pacote.totais.sucesso} Sucesso, ${pacote.totais.pressao} Pressão, ${pacote.totais.adaptacao} Adaptação.`;
        rollGroup.appendChild(summary);

        resultsDiv.appendChild(rollGroup);

        setTimeout(() => {
            const historyEntry = rollGroup.cloneNode(true);
            historyEntry.querySelectorAll('h4').forEach(h => h.style.opacity = '1');
            historyEntry.querySelectorAll('.icons-container').forEach(c => c.style.opacity = '1');
            historyEntry.querySelectorAll('.logo-animado').forEach(logo => logo.remove());
            historyEntry.querySelectorAll('.dado-animado').forEach(die => {
                die.classList.remove('dado-animado');
                die.style.opacity = '1';
                die.style.visibility = 'visible';
                die.style.transform = 'scale(1) rotate(0deg)';
                die.style.animation = 'none';
            });
            historicoDiv.prepend(historyEntry);
        }, tempoTotalAntesDados);
    }

    if (rollButton) rollButton.addEventListener('click', handleRoll);
    if (inputDados) inputDados.addEventListener('keypress', (event) => { if (event.key === 'Enter') handleRoll(); });

    // ==========================================
    // 4. ROLADOR INTELIGENTE (Clique nas Perícias)
    // ==========================================
    const labelsAptidoes = document.querySelectorAll('.aptidao-box label');
    let avisoAssimilada = document.getElementById('aviso-assimilada');
    
    if (!avisoAssimilada && inputDados) {
        avisoAssimilada = document.createElement('div');
        avisoAssimilada.id = 'aviso-assimilada';
        avisoAssimilada.className = 'hidden w-full text-center text-rpg-red dark:text-red-500 font-black font-rpg text-lg md:text-xl mb-3 animate-pulse uppercase tracking-widest';
        avisoAssimilada.innerHTML = '<i data-lucide="flame" class="w-6 h-6 inline-block align-text-bottom"></i> Rolagem Assimilada! <i data-lucide="flame" class="w-6 h-6 inline-block align-text-bottom"></i>';
        inputDados.parentNode.insertBefore(avisoAssimilada, inputDados);
        if (window.lucide) lucide.createIcons();
    }

    labelsAptidoes.forEach(label => {
        label.addEventListener('click', function() {
            const box = this.closest('.aptidao-box');
            const checkedCount = box.querySelectorAll('input[type="checkbox"]:checked').length;
            if (checkedCount === 0) return; 

            this.classList.add('label-selecionado');
            let diceType = 'd10'; 
            if (this.closest('#secao-instintos')) {
                diceType = 'd6';
            }

            if (inputDados) {
                let currentVal = inputDados.value.trim();

                // Regra Mágica de ROLAGEM ASSIMILADA 
                if (diceType === 'd6' && (currentVal.includes('d6') || currentVal.includes('d12'))) {
                    currentVal = currentVal.replace(/\b\d+d10\b/g, '').replace(/\s+/g, ' ').trim();
                    currentVal = currentVal.replace(/d6/g, 'd12');
                    diceType = 'd12'; 

                    if (avisoAssimilada) avisoAssimilada.classList.remove('hidden');
                    
                    // Apaga os outros botões de conhecimento
                    labelsAptidoes.forEach(lbl => {
                        if (!lbl.closest('#secao-instintos')) lbl.classList.remove('label-selecionado');
                    });
                }

                const diceString = `${checkedCount}${diceType}`;
                if (currentVal !== '') {
                    inputDados.value = currentVal + ' ' + diceString;
                } else {
                    inputDados.value = diceString;
                }

                // Efeito Pulsante na barra
                inputDados.classList.add('ring-4', 'ring-rpg-red', 'scale-105');
                setTimeout(() => inputDados.classList.remove('ring-4', 'ring-rpg-red', 'scale-105'), 200);
            }
        });
    });

    // ==========================================
    // 5. BOTÃO LIMPAR E FILTRO DE HISTÓRICO
    // ==========================================
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            resultsDiv.innerHTML = '';
            historicoDiv.innerHTML = '';
            inputDados.value = '';
            const inputFiltroHistorico = document.getElementById('filtro-historico');
            if (inputFiltroHistorico) inputFiltroHistorico.value = '';
            
            // Apaga as luzes dos botões pressionados
            labelsAptidoes.forEach(label => label.classList.remove('label-selecionado'));
            if (avisoAssimilada) avisoAssimilada.classList.add('hidden');
        });
    }

    const inputFiltroHistorico = document.getElementById('filtro-historico');
    if (inputFiltroHistorico) {
        inputFiltroHistorico.addEventListener('input', (e) => {
            const termoBusca = e.target.value.toLowerCase().trim();
            const rolagensSalvas = historicoDiv.children;

            Array.from(rolagensSalvas).forEach(caixaDeRolagem => {
                const tituloRolagem = caixaDeRolagem.querySelector('h3');
                if (tituloRolagem) {
                    const textoDoTitulo = tituloRolagem.textContent.toLowerCase();
                    if (textoDoTitulo.includes(termoBusca)) {
                        caixaDeRolagem.style.display = 'block';
                    } else {
                        caixaDeRolagem.style.display = 'none';
                    }
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