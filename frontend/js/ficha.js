// js/ficha.js

// Variável global para sabermos qual ficha está aberta
window.idPersonagemAtual = null;

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. CARREGAR E LIMPAR FICHA
    // ==========================================
    window.carregarPersonagem = async function (id) {
        try {
            const resposta = await fetch(`${window.API_URL}/personagem/${id}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            const personagem = await resposta.json();

            if (!resposta.ok) {
                return window.mostrarNotificacao(personagem.erro || "Erro ao carregar a ficha.", 'erro');
            }

            document.getElementById('nome').value = personagem.nome_personagem || '';
            document.getElementById('ocupacao').value = personagem.ocupacao || '';

            const ficha = personagem.dados_ficha || {};
            preencherFicha(ficha);

            window.idPersonagemAtual = id;
            sessionStorage.setItem('personagemAtivoId', id);

            if (typeof window.atualizarPreviewAnotacoes === 'function') {
                window.atualizarPreviewAnotacoes();
            }

            // Garante que o nome do header bate com o logado
            const spanNomeFicha = document.getElementById('nome-usuario-logado-ficha');
            if (spanNomeFicha) spanNomeFicha.textContent = `Bem-vindo, ${sessionStorage.getItem('usuarioNome')}`;

        } catch (err) {
            console.error("Erro ao carregar personagem:", err);
            window.mostrarNotificacao("Erro de conexão ao carregar a ficha.", 'erro');
        }
    };

    window.limparFicha = function () {
        window.idPersonagemAtual = null;
        sessionStorage.removeItem('personagemAtivoId');

        document.querySelectorAll('#tela-ficha input, #tela-ficha textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else if (el.type !== 'file' && el.type !== 'button') {
                el.value = '';
            }
        });

        // Valores Padrão (Determinação 9, Assimilação 1)
        const detNum = document.getElementById('det-num');
        const assimNum = document.getElementById('assim-num');
        if (detNum) detNum.value = 9;
        if (assimNum) assimNum.value = 1;
        if (typeof window.sincronizarTrilhas === 'function') window.sincronizarTrilhas();

        const photoPreview = document.getElementById('char-photo-preview');
        if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

        const caracContainer = document.getElementById('caracteristicas-container');
        if (caracContainer) {
            caracContainer.innerHTML = '';
            for (let i = 0; i < 6; i++) window.adicionarCaracteristicaDOM();
        }

        if (typeof window.calcularSaudeMax === 'function') window.calcularSaudeMax(true);
        if (typeof window.atualizarPreviewAnotacoes === 'function') window.atualizarPreviewAnotacoes();

        const spanNomeFicha = document.getElementById('nome-usuario-logado-ficha');
        if (spanNomeFicha) spanNomeFicha.textContent = `Nova Ficha`;
    };

    // ==========================================
    // 2. SISTEMA DE FOTO E COMPRESSÃO (CANVAS)
    // ==========================================
    const photoInput = document.getElementById('char-photo-input');
    const photoPreview = document.getElementById('char-photo-preview');

    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const img = new Image();
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                        } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/webp', 0.95);
                        photoPreview.src = compressedBase64;
                        agendarAutosave(); // Salva a foto automaticamente
                    };
                    img.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // 3. COLETAR, PREENCHER E SALVAR DADOS
    // ==========================================
    function coletarDadosFicha() {
        const dados = {};
        const elementos = document.querySelectorAll('#tela-ficha input, #tela-ficha textarea');

        elementos.forEach(el => {
            if (!el.id || el.type === 'file' || el.tagName === 'BUTTON') return;
            if (el.id === 'busca-personagem' || el.id === 'nome' || el.id === 'ocupacao') return; // Tratados por fora

            if (el.type === 'checkbox' || el.type === 'radio') {
                dados[el.id] = el.checked;
            } else {
                dados[el.id] = el.value;
            }
        });

        if (photoPreview && photoPreview.src && !photoPreview.src.includes('R0lGODlhAQABAAD')) {
            dados['char-photo'] = photoPreview.src;
        }
        return dados;
    }

    function preencherFicha(dados) {
        if (photoPreview) {
            photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        }

        // Restaura Características Dinâmicas primeiro, se existirem na base
        const caracContainer = document.getElementById('caracteristicas-container');
        if (caracContainer) caracContainer.innerHTML = '';
        let caracCount = 0;

        for (const key in dados) {
            if (key.startsWith('carac-nome-')) caracCount++;
        }
        for (let i = 0; i < (caracCount > 0 ? caracCount : 6); i++) {
            window.adicionarCaracteristicaDOM();
        }

        for (const key in dados) {
            if (key === 'char-photo') {
                if (photoPreview) photoPreview.src = dados[key];
                continue;
            }

            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') el.checked = dados[key];
                else el.value = dados[key];
            }
        }

        if (typeof window.calcularSaudeMax === 'function') window.calcularSaudeMax(false);
        if (typeof window.sincronizarTrilhas === 'function') window.sincronizarTrilhas();
    }

    window.salvarFicha = async function (silencioso = false) {
        const usuarioLogadoId = sessionStorage.getItem('usuarioId');
        if (!usuarioLogadoId) return;

        const nomeInput = document.getElementById('nome');
        const nomePersonagem = nomeInput ? nomeInput.value.trim() : '';
        if (!nomePersonagem || nomePersonagem === "") {
            return window.mostrarNotificacao("O personagem precisa de pelo menos um Nome para ser salvo!", "aviso");
        }

        const dadosFicha = coletarDadosFicha();
        const ocupacao = document.getElementById('ocupacao') ? document.getElementById('ocupacao').value : '';
        const foto = dadosFicha['char-photo'] || null;

        const payload = {
            usuarioId: usuarioLogadoId,
            personagemId: window.idPersonagemAtual,
            nome: nomePersonagem,
            ocupacao: ocupacao,
            dadosFicha: dadosFicha,
            foto: foto
        };

        const btnSaveNav = document.getElementById('btn-save-char-nav');
        const iconOriginal = btnSaveNav ? btnSaveNav.innerHTML : '';

        if (!silencioso && btnSaveNav) {
            btnSaveNav.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Salvando...';
            if (window.lucide) lucide.createIcons();
        }

        try {
            const resposta = await fetch(`${window.API_URL}/personagens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const resultado = await resposta.json();

            if (resposta.ok) {
                if (resultado.id) {
                    window.idPersonagemAtual = resultado.id;
                    sessionStorage.setItem('personagemAtivoId', resultado.id);
                }

                if (!silencioso) {
                    window.mostrarNotificacao(resultado.mensagem, 'sucesso');
                    // Atualiza a listagem lá no dashboard em background
                    if (typeof window.carregarListaPersonagens === 'function') window.carregarListaPersonagens();
                }
            } else {
                if (!silencioso) window.mostrarNotificacao(resultado.erro || "Erro desconhecido.", 'erro');
            }
        } catch (erro) {
            console.error("❌ Erro ao salvar ficha:", erro);
            if (!silencioso) window.mostrarNotificacao("Erro de comunicação com o servidor!", 'erro');
        } finally {
            if (!silencioso && btnSaveNav) {
                btnSaveNav.innerHTML = iconOriginal;
                if (window.lucide) lucide.createIcons();
            }
        }
    };

    // Botão de Salvar da Barra de Navegação Superior
    const btnSaveCharNav = document.getElementById('btn-save-char-nav');
    if (btnSaveCharNav) btnSaveCharNav.addEventListener('click', () => window.salvarFicha(false));

    // ==========================================
    // 4. AUTOSAVE E DELEGAÇÃO DE EVENTOS
    // ==========================================
    let timeoutAutosave;
    function agendarAutosave() {
        if (!window.idPersonagemAtual) return; // Só autosalva fichas que já foram criadas/salvas manualmente uma vez
        clearTimeout(timeoutAutosave);
        timeoutAutosave = setTimeout(() => { window.salvarFicha(true); }, 2000);
    }

    const todosInputs = document.querySelectorAll('#tela-ficha input, #tela-ficha textarea');
    todosInputs.forEach(el => {
        if (el.type === 'file' || el.tagName === 'BUTTON') return;
        el.addEventListener('input', agendarAutosave);
        el.addEventListener('change', agendarAutosave);
    });

    // ==========================================
    // 5. EXCLUSÃO DE PERSONAGEM
    // ==========================================
    const modalDeleteChar = document.getElementById('delete-char-modal');
    const inputDeleteChar = document.getElementById('delete-char-input');
    const btnConfirmDeleteChar = document.getElementById('btn-confirm-delete-char');
    const btnCancelDeleteChar = document.getElementById('btn-cancel-delete-char');
    const targetNameChar = document.getElementById('delete-char-target-name');

    let nomePersonagemLimpo = '';

    // Modificamos a forma de chamar o delete (talvez adicionar um botão "Excluir" dentro da própria ficha ou no menu superior depois)
    window.abrirModalDeletarPersonagem = function () {
        if (!window.idPersonagemAtual) return window.mostrarNotificacao('Salve a ficha antes de excluí-la.', 'aviso');

        const nomePersonagemCru = document.getElementById('nome').value || '';
        nomePersonagemLimpo = nomePersonagemCru.trim().toLowerCase() || 'sem nome';

        if (targetNameChar) targetNameChar.textContent = nomePersonagemLimpo;
        if (inputDeleteChar) inputDeleteChar.value = '';

        if (btnConfirmDeleteChar) {
            btnConfirmDeleteChar.disabled = true;
            btnConfirmDeleteChar.classList.add('opacity-50', 'cursor-not-allowed');
        }

        if (modalDeleteChar) modalDeleteChar.classList.add('show');
    };

    if (inputDeleteChar) {
        inputDeleteChar.oninput = (e) => {
            const textoDigitado = e.target.value.trim().toLowerCase();
            if (textoDigitado === nomePersonagemLimpo) {
                btnConfirmDeleteChar.disabled = false;
                btnConfirmDeleteCamp.classList.remove('opacity-50', 'cursor-not-allowed'); // Correção do bug de classe
                btnConfirmDeleteChar.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btnConfirmDeleteChar.disabled = true;
                btnConfirmDeleteChar.classList.add('opacity-50', 'cursor-not-allowed');
            }
        };
    }

    if (btnCancelDeleteChar) {
        btnCancelDeleteChar.onclick = () => modalDeleteChar.classList.remove('show');
    }

    if (btnConfirmDeleteChar) {
        btnConfirmDeleteChar.onclick = async () => {
            if (!window.idPersonagemAtual) return;
            const iconeOriginal = btnConfirmDeleteChar.innerHTML;
            btnConfirmDeleteChar.innerHTML = "Apagando...";

            try {
                const res = await fetch(`${window.API_URL}/personagens/${window.idPersonagemAtual}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });

                if (res.ok) {
                    window.mostrarNotificacao('Ficha deletada com sucesso.', 'sucesso');
                    window.limparFicha();
                    modalDeleteChar.classList.remove('show');
                    if (typeof window.carregarListaPersonagens === 'function') window.carregarListaPersonagens();
                    Router.navigate('dashboard'); // Volta pro painel
                } else {
                    window.mostrarNotificacao('Erro ao deletar ficha.', 'erro');
                }
            } catch (erro) {
                console.error('Erro ao deletar:', erro);
                window.mostrarNotificacao('Erro de comunicação.', 'erro');
            } finally {
                btnConfirmDeleteChar.innerHTML = iconeOriginal;
            }
        };
    }

    // ==========================================
    // 6. CARACTERÍSTICAS DINÂMICAS
    // ==========================================
    window.contadorCarac = 0;
    window.adicionarCaracteristicaDOM = function () {
        window.contadorCarac++;
        const indice = window.contadorCarac;
        const container = document.getElementById('caracteristicas-container');
        if (!container) return;

        const bloco = document.createElement('div');
        bloco.className = 'carac-item flex flex-col w-full mb-2 bg-white dark:bg-[#2a2a2a] p-3 rounded-md shadow-inner border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-rpg-blue transition-all';
        bloco.innerHTML = `
            <div class="flex justify-between items-center mb-2 border-b-2 border-[#6b2c2c] pb-1">
                <input type="text" id="carac-nome-${indice}" placeholder="Nome da Característica" class="w-full font-bold p-1 bg-transparent text-black dark:text-white text-base outline-none">
                <button type="button" class="btn-remover-carac ml-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow-sm border-none">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
            <textarea id="carac-desc-${indice}" rows="2" placeholder="Descrição..." class="w-full p-1 bg-transparent text-black dark:text-gray-300 outline-none resize-y text-sm"></textarea>
        `;
        container.appendChild(bloco);

        bloco.querySelector('input').addEventListener('input', agendarAutosave);
        bloco.querySelector('textarea').addEventListener('input', agendarAutosave);
        if (window.lucide) lucide.createIcons();
    };

    document.getElementById('btn-add-carac')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.adicionarCaracteristicaDOM();
    });

    document.getElementById('caracteristicas-container')?.addEventListener('click', (e) => {
        const btnRemover = e.target.closest('.btn-remover-carac');
        if (btnRemover) {
            e.preventDefault();
            btnRemover.closest('.carac-item').remove();
            agendarAutosave();
        }
    });

    // ==========================================
    // 7. PREVIEW DE ANOTAÇÕES NO MODAL
    // ==========================================
    const anotacoesTextoPreview = document.getElementById('anotacoes-texto-preview');
    const textareaAnotacoes = document.getElementById('anotacoes');

    window.atualizarPreviewAnotacoes = function () {
        if (!anotacoesTextoPreview || !textareaAnotacoes) return;
        const texto = textareaAnotacoes.value.trim();

        if (texto === '') {
            anotacoesTextoPreview.innerHTML = '<span class="font-rpg text-gray-400 dark:text-gray-500 italic font-bold">Clique aqui para escrever suas anotações...</span>';
        } else {
            const divSegura = document.createElement('div');
            divSegura.textContent = texto;
            anotacoesTextoPreview.innerHTML = divSegura.innerHTML.replace(/\n/g, '<br>');
        }
    };

    if (textareaAnotacoes) {
        textareaAnotacoes.addEventListener('input', () => {
            window.atualizarPreviewAnotacoes();
            agendarAutosave();
        });
    }

    // ==========================================
    // 8. SINCRONIZAÇÃO DET / ASSIM
    // ==========================================
    window.sincronizarTrilhas = function () {
        const detNum = parseInt(document.getElementById('det-num').value) || 0;
        for (let i = 1; i <= 10; i++) {
            const check = document.getElementById(`det-${i}`);
            if (check) check.checked = (i <= detNum);
        }

        const assimNum = parseInt(document.getElementById('assim-num').value) || 0;
        for (let i = 1; i <= 10; i++) {
            const check = document.getElementById(`assim-${i}`);
            if (check) check.checked = (i >= 11 - assimNum);
        }
    };

    const inputDetNum = document.getElementById('det-num');
    const inputAssimNum = document.getElementById('assim-num');

    if (inputDetNum) {
        inputDetNum.addEventListener('input', () => {
            let val = parseInt(inputDetNum.value) || 0;
            if (val > 10) val = 10; if (val < 0) val = 0;
            inputDetNum.value = val;
            if (inputAssimNum) inputAssimNum.value = 10 - val;
            window.sincronizarTrilhas();
            agendarAutosave();
        });
    }

    if (inputAssimNum) {
        inputAssimNum.addEventListener('input', () => {
            let val = parseInt(inputAssimNum.value) || 0;
            if (val > 10) val = 10; if (val < 0) val = 0;
            inputAssimNum.value = val;
            if (inputDetNum) inputDetNum.value = 10 - val;
            window.sincronizarTrilhas();
            agendarAutosave();
        });
    }

    // ==========================================
    // 9. SAÚDE AUTOMÁTICA
    // ==========================================
    const inputSaudeMax = document.getElementById('saude-max');
    if (inputSaudeMax) {
        inputSaudeMax.readOnly = true;
        inputSaudeMax.style.cursor = 'default';
        inputSaudeMax.style.pointerEvents = 'none';
    }

    window.calcularSaudeMax = function (forcarPreenchimento = false) {
        let pontosPotencia = 0;
        let pontosResolucao = 0;

        for (let i = 1; i <= 5; i++) {
            const pot = document.getElementById(`pot-${i}`);
            if (pot && pot.checked) pontosPotencia++;
            const res = document.getElementById(`res-${i}`);
            if (res && res.checked) pontosResolucao++;
        }

        const gotasPorCaixa = 1 + pontosPotencia + pontosResolucao;

        if (forcarPreenchimento) {
            for (let caixa = 1; caixa <= 6; caixa++) {
                for (let gota = 1; gota <= 11; gota++) {
                    const checkGota = document.getElementById(`saude-${caixa}-${gota}`);
                    if (checkGota) checkGota.checked = (gota <= gotasPorCaixa);
                }
            }
        }

        let totalGotasMarcadas = 0;
        document.querySelectorAll('.saude-drops-track input[type="checkbox"]').forEach(gota => {
            if (gota.checked) totalGotasMarcadas++;
        });

        if (inputSaudeMax) inputSaudeMax.value = totalGotasMarcadas;
    };

    // Monitores de Atributos que afetam a Saúde
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`pot-${i}`)?.addEventListener('change', () => { window.calcularSaudeMax(true); agendarAutosave(); });
        document.getElementById(`res-${i}`)?.addEventListener('change', () => { window.calcularSaudeMax(true); agendarAutosave(); });
    }

    document.querySelectorAll('.saude-drops-track input[type="checkbox"]').forEach(gota => {
        gota.addEventListener('change', () => { window.calcularSaudeMax(false); agendarAutosave(); });
    });

    // ==========================================
    // 10. RASTREADOR DE EGO E MUTAÇÕES
    // ==========================================
    const egoChecks = document.querySelectorAll('.ego-check');
    const avisoPerdaEgo = document.getElementById('aviso-perda-ego');

    egoChecks.forEach(check => {
        check.addEventListener('change', () => {
            const pressoesAcumuladas = document.querySelectorAll('.ego-check:checked').length;
            if (pressoesAcumuladas >= 10) {
                avisoPerdaEgo.classList.remove('hidden');
            } else {
                avisoPerdaEgo.classList.add('hidden');
            }
            agendarAutosave();
        });
    });

    const baralhoEvolutivas = [
        { nome: "Assimilação Sensitiva", desc: "Desenvolve percepção intuitiva para criaturas assimiladas e eventos futuros. Sexto sentido aguçado." },
        { nome: "Assimilação Reativa", desc: "Reflexos se tornam cada vez mais precisos, reagindo de forma instintiva a perigos ou situações inusitadas." },
        { nome: "Assimilação Vigorosa", desc: "A resiliência física e mental é reforçada. Corpo e mente capazes de resistir a pressões extremas." }
    ];

    const baralhoAdaptativas = [
        { nome: "Assimilação Anatômica", desc: "Transformações físicas profundas. Pode criar presas ou alterar membros, mas distorce a motricidade fina." },
        { nome: "Assimilação Cutânea", desc: "A pele ganha novas capacidades (ex: aderência ou controle térmico), dificultando sua interação com o ambiente natural." },
        { nome: "Assimilação Óssea", desc: "Mutações no sistema ósseo, excedendo limites humanos, mas impondo desafios anatômicos dolorosos." }
    ];

    const baralhoInoportunas = [
        { nome: "Assimilação Atrofiante", desc: "Músculos e tendões definham. O corpo se move em esforço contido, sempre à beira de ruir." },
        { nome: "Assimilação Neuropática", desc: "Nervos disparam sinais confusos: dor fantasma, tremores e reflexos tardios. O corpo vira marionete de si." },
        { nome: "Assimilação Devoradora", desc: "O metabolismo exige alimento constante. Se negado, devora reservas internas corroendo a carne e a sanidade." }
    ];

    const baralhoSingulares = [
        { nome: "Adaptação Biológica Local", desc: "Seu corpo se ajusta perfeitamente ao clima ou terreno da região atual, ignorando penalidades de deslocamento ou temperatura extrema." },
        { nome: "Camuflagem Endêmica", desc: "A cor e textura da sua pele copiam os padrões da flora e fauna predominantes do local, garantindo vantagem absurda em furtividade neste bioma." },
        { nome: "Metabolismo Regional", desc: "Permite extrair nutrientes e água de fontes locais que seriam tóxicas para outros, como plantas venenosas ou água contaminada." }
    ];

    const btnPuxarCartas = document.getElementById('btn-puxar-cartas');
    const containerCartas = document.getElementById('container-cartas');

    if (btnPuxarCartas) {
        btnPuxarCartas.addEventListener('click', () => {
            const qtdA = parseInt(document.getElementById('sorteio-a').value) || 0;
            const qtdB = parseInt(document.getElementById('sorteio-b').value) || 0;
            const qtdC = parseInt(document.getElementById('sorteio-c').value) || 0;
            const qtdI = parseInt(document.getElementById('sorteio-i').value) || 0;

            containerCartas.innerHTML = '';

            if (qtdA === 0 && qtdB === 0 && qtdC === 0 && qtdI === 0) {
                containerCartas.innerHTML = '<p class="text-center text-gray-500">Insira valores maiores que 0 para sortear.</p>';
                return;
            }

            function puxarCartaAleatoria(baralho) {
                return baralho[Math.floor(Math.random() * baralho.length)];
            }

            const drawCards = (qtd, baralho, bgClass, borderClass, textClass, icon, label) => {
                for (let i = 0; i < qtd; i++) {
                    const carta = puxarCartaAleatoria(baralho);
                    containerCartas.innerHTML += `
                        <div class="${bgClass} border-l-4 ${borderClass} p-4 rounded shadow-sm">
                            <h4 class="font-black font-rpg ${textClass} text-lg uppercase mb-1 flex items-center gap-1">
                                <i data-lucide="${icon}" class="w-5 h-5"></i> ${carta.nome} <span class="text-sm font-sans font-bold ml-auto">${label}</span>
                            </h4>
                            <p class="text-gray-700 dark:text-gray-300">${carta.desc}</p>
                        </div>`;
                }
            };

            drawCards(qtdA, baralhoEvolutivas, 'bg-green-100 dark:bg-green-900/30', 'border-green-500', 'text-green-800 dark:text-green-400', 'leaf', 'Evolutiva (A)');
            drawCards(qtdB, baralhoAdaptativas, 'bg-blue-100 dark:bg-blue-900/30', 'border-blue-500', 'text-blue-800 dark:text-blue-400', 'settings', 'Adaptativa (B)');
            drawCards(qtdC, baralhoInoportunas, 'bg-red-100 dark:bg-red-900/30', 'border-rpg-red', 'text-rpg-red dark:text-red-400', 'droplet', 'Inoportuna (C)');
            drawCards(qtdI, baralhoSingulares, 'bg-amber-100 dark:bg-amber-900/30', 'border-amber-500', 'text-amber-800 dark:text-amber-400', 'mountain', 'Singular (I)');

            if (window.lucide) lucide.createIcons();
        });
    }

    // Inicialização da Ficha Vazia se necessário
    if (!window.idPersonagemAtual) {
        const caracContainer = document.getElementById('caracteristicas-container');
        if (caracContainer && caracContainer.children.length === 0) {
            for (let i = 0; i < 6; i++) window.adicionarCaracteristicaDOM();
        }
    }

    // ==========================================
    // LIGAÇÃO DOS BOTÕES SUPERIORES DA FICHA
    // ==========================================

    // Liga o botão de Excluir
    const btnDeleteCharNav = document.getElementById('btn-delete-char-nav');
    if (btnDeleteCharNav) {
        btnDeleteCharNav.addEventListener('click', () => {
            if (typeof window.abrirModalDeletarPersonagem === 'function') {
                window.abrirModalDeletarPersonagem();
            }
        });
    }

    const funcaoSalvarOriginal = window.salvarFicha;
    window.salvarFicha = async function(silencioso = false) {
        const usuarioLogadoId = sessionStorage.getItem('usuarioId');
        if (!usuarioLogadoId) return;

        const nomeInput = document.getElementById('nome');
        const nomePersonagem = nomeInput ? nomeInput.value.trim() : '';
        
        if (!nomePersonagem || nomePersonagem === "") {
            if (!silencioso) window.mostrarNotificacao("O personagem precisa de pelo menos um Nome para ser salvo!", "aviso");
            return; 
        }

        const dadosFicha = coletarDadosFicha();
        const ocupacao = document.getElementById('ocupacao') ? document.getElementById('ocupacao').value : '';
        const foto = dadosFicha['char-photo'] || null;

        // 🔥 LÊ A ESCOLHA DO JOGADOR
        const checkboxPrivacidade = document.getElementById('char-is-private');
        const isPrivada = checkboxPrivacidade ? checkboxPrivacidade.checked : false;

        const payload = {
            usuarioId: usuarioLogadoId,
            personagemId: window.idPersonagemAtual,
            nome: nomePersonagem, 
            ocupacao: ocupacao,
            dadosFicha: dadosFicha,
            foto: foto,
            isPrivada: isPrivada // 🔥 MANDA PRO SERVIDOR
        };

        const btnSaveNav = document.getElementById('btn-save-char-nav');
        const btnDeleteCharNav = document.getElementById('btn-delete-char-nav');
        const htmlPadrao = '<i data-lucide="save" class="w-4 h-4"></i> <span class="hidden md:inline">Salvar</span>';
        
        if (btnSaveNav) {
            btnSaveNav.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> <span class="hidden md:inline">Salvando...</span>';
            if(window.lucide) lucide.createIcons();
        }

        try {
            const resposta = await fetch(`${window.API_URL}/personagens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                body: JSON.stringify(payload)
            });

            const resultado = await resposta.json();

            if (resposta.ok) {
                if (resultado.id) {
                    window.idPersonagemAtual = resultado.id;
                    sessionStorage.setItem('personagemAtivoId', resultado.id);
                    if (btnDeleteCharNav) btnDeleteCharNav.classList.remove('hidden');
                }

                if (!silencioso) {
                    window.mostrarNotificacao(resultado.mensagem, 'sucesso');
                    if(typeof window.carregarListaPersonagens === 'function') window.carregarListaPersonagens();
                }
                
                if (btnSaveNav) {
                    btnSaveNav.classList.remove('bg-rpg-green', 'hover:bg-green-700');
                    btnSaveNav.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    btnSaveNav.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> <span class="hidden md:inline">Salvo!</span>';
                    if(window.lucide) lucide.createIcons();
                    
                    setTimeout(() => {
                        btnSaveNav.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                        btnSaveNav.classList.add('bg-rpg-green', 'hover:bg-green-700');
                        btnSaveNav.innerHTML = htmlPadrao;
                        if(window.lucide) lucide.createIcons();
                    }, 2000);
                }
            } else {
                if (!silencioso) window.mostrarNotificacao(resultado.erro || "Erro.", 'erro');
                if (btnSaveNav) btnSaveNav.innerHTML = htmlPadrao;
            }
        } catch (erro) {
            if (!silencioso) window.mostrarNotificacao("Erro de comunicação!", 'erro');
            if (btnSaveNav) btnSaveNav.innerHTML = htmlPadrao;
        } 
    };

});