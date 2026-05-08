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

            // Privaciade
            const checkPrivado = document.getElementById('char-is-private');
            if (checkPrivado) checkPrivado.checked = (personagem.is_privada === true);

            // 🔥 CARREGA A FOTO DIRETO DA FONTE 🔥
            const photoPreview = document.getElementById('char-photo-preview');
            if (photoPreview) {
                photoPreview.src = (personagem.foto && !personagem.foto.includes('R0lGODlhAQAB'))
                    ? personagem.foto
                    : "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
            }

            const ficha = personagem.dados_ficha || {};
            preencherFicha(ficha);

            window.idPersonagemAtual = id;
            sessionStorage.setItem('personagemAtivoId', id);

            if (typeof window.atualizarPreviewAnotacoes === 'function') window.atualizarPreviewAnotacoes();

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
    // 2. SISTEMA DE FOTO E COMPRESSÃO (COM SUPORTE A GIF)
    // ==========================================
    const photoInput = document.getElementById('char-photo-input');
    const photoPreview = document.getElementById('char-photo-preview');

    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    
                    // 🔥 ROTA DE FUGA DO GIF: Pula o compressor! 🔥
                    if (file.type === 'image/gif') {
                        const base64Gif = e.target.result;
                        photoPreview.src = base64Gif;
                        agendarAutosave(); // Salva a foto automaticamente
                    } 
                    // SE NÃO FOR GIF, USA O COMPRESSOR NORMAL
                    else {
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
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // 3. COLETAR, PREENCHER E SALVAR DADOS
    // ==========================================
    function coletarDadosFicha() {
        const dados = {};

        const elementos = document.querySelectorAll('input, textarea, select');

        elementos.forEach(el => {
            // Ignora botões e campos sem identificação
            if (el.type === 'button' || el.type === 'submit' || el.type === 'file') return;
            if (!el.id && !el.name) return;

            const chave = el.name || el.id;

            if (el.type === 'checkbox') {
                dados[chave] = el.checked;
            } else if (el.type === 'radio') {
                if (el.checked) {
                    dados[chave] = el.value;
                }
            } else {
                // Salva inputs normais, textareas (características) e ranges (cabo de guerra)
                dados[chave] = el.value;
            }
        });

        // Caso você use uma imagem de personagem, garantimos que ela não vá no meio do JSON bagunçando tudo
        delete dados['char-photo'];
        delete dados['input-foto-personagem'];

        return dados;
    }

    function preencherFicha(dados) {
        if (!dados || typeof dados !== 'object') return;


        // 1. RECONSTRÓI AS CARACTERÍSTICAS
        const caracContainer = document.getElementById('caracteristicas-container');
        if (caracContainer) {
            caracContainer.innerHTML = '';
            window.contadorCarac = 0;
        }

        let caracCount = 0;
        for (const key in dados) {
            if (key.startsWith('carac-nome-')) caracCount++;
        }
        for (let i = 0; i < (caracCount > 0 ? caracCount : 6); i++) {
            window.adicionarCaracteristicaDOM();
        }

        // 2. PREENCHEDOR UNIVERSAL
        for (const key in dados) {
            // Ignora o processamento de foto, pois agora ela é tratada no carregarPersonagem
            if (key === 'char-photo' || key === 'input-foto-personagem') continue;

            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = (dados[key] === true || dados[key] === 'true');
                } else {
                    el.value = dados[key];
                }
                continue;
            }

            const radios = document.querySelectorAll(`input[name="${key}"]`);
            if (radios.length > 0) {
                radios.forEach(radio => {
                    if (radio.value == dados[key]) radio.checked = true;
                });
            }
        }

        if (typeof window.calcularSaudeMax === 'function') window.calcularSaudeMax(false);

    }

    window.salvarFicha = async function (silencioso = false) {
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

        // 🔥 PUXA A FOTO DA MOLDURA E NÃO DO JSON 🔥
        const imgPreview = document.getElementById('char-photo-preview');
        const fotoFinal = (imgPreview && imgPreview.src && !imgPreview.src.includes('R0lGODlhAQAB')) ? imgPreview.src : null;

        const checkboxPrivacidade = document.getElementById('char-is-private');
        const isPrivada = checkboxPrivacidade ? checkboxPrivacidade.checked : false;

        const payload = {
            usuarioId: usuarioLogadoId,
            personagemId: window.idPersonagemAtual,
            nome: nomePersonagem,
            ocupacao: ocupacao,
            dadosFicha: dadosFicha,
            foto: fotoFinal, // A FOTO VAI CORRETA AGORA!
            isPrivada: isPrivada
        };

        const btnSaveNav = document.getElementById('btn-save-char-nav');
        const btnDeleteCharNav = document.getElementById('btn-delete-char-nav');
        const htmlPadrao = '<i data-lucide="save" class="w-4 h-4"></i> <span class="hidden md:inline">Salvar</span>';

        if (btnSaveNav && !silencioso) {
            btnSaveNav.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> <span class="hidden md:inline">Salvando...</span>';
            if (window.lucide) lucide.createIcons();
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
                    if (typeof window.carregarListaPersonagens === 'function') window.carregarListaPersonagens();
                }

                if (btnSaveNav && !silencioso) {
                    btnSaveNav.classList.remove('bg-rpg-green', 'hover:bg-green-700');
                    btnSaveNav.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    btnSaveNav.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> <span class="hidden md:inline">Salvo!</span>';
                    if (window.lucide) lucide.createIcons();

                    setTimeout(() => {
                        btnSaveNav.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                        btnSaveNav.classList.add('bg-rpg-green', 'hover:bg-green-700');
                        btnSaveNav.innerHTML = htmlPadrao;
                        if (window.lucide) lucide.createIcons();
                    }, 2000);
                }
            } else {
                if (!silencioso) window.mostrarNotificacao(resultado.erro || "Erro.", 'erro');
                if (btnSaveNav && !silencioso) btnSaveNav.innerHTML = htmlPadrao;
            }
        } catch (erro) {
            if (!silencioso) window.mostrarNotificacao("Erro de comunicação!", 'erro');
            if (btnSaveNav && !silencioso) btnSaveNav.innerHTML = htmlPadrao;
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
    // 8. SINCRONIZAÇÃO DET / ASSIM (GASTO DE PONTOS)
    // ==========================================
    window.sincronizarTrilhas = function () {
        // Essa função só é chamada quando o jogador muda o número TOTAL no input
        const detNum = parseInt(document.getElementById('det-num')?.value) || 0;
        for (let i = 1; i <= 10; i++) {
            const check = document.getElementById(`det-${i}`);
            if (check) check.checked = (i <= detNum);
        }

        const assimNum = parseInt(document.getElementById('assim-num')?.value) || 0;
        for (let i = 1; i <= 10; i++) {
            const check = document.getElementById(`assim-${i}`);
            if (check) check.checked = (i >= 11 - assimNum);
        }
    };

    const inputDetNum = document.getElementById('det-num');
    const inputAssimNum = document.getElementById('assim-num');

    // Ao digitar o número, ele calcula a proporção e "reseta" as bolinhas
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

    // 🔥 AS BOLINHAS AGORA SÃO O SEU BOLSO (GASTO) 🔥
    // O jogador pode desmarcar bolinhas sem alterar os números de reserva máxima!
    for (let i = 1; i <= 10; i++) {
        const checkDet = document.getElementById(`det-${i}`);
        if (checkDet) {
            checkDet.addEventListener('change', agendarAutosave); // Só salva, não mexe na proporção
        }

        const checkAssim = document.getElementById(`assim-${i}`);
        if (checkAssim) {
            checkAssim.addEventListener('change', agendarAutosave); // Só salva, não mexe na proporção
        }
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
        { nome: "Assimilação Sensitiva A", desc: "O(a) Infectado(a) desenvolve uma percepção intuitiva para criaturas assimiladas e eventos futuros, navegando pelas tensões do ambiente usando o sexto sentido" },
        { nome: "Assimilação Reativa 2", desc: "Os reflexos do(a) Infectado(a) se tornam cada vez mais precisos, reagindo de forma instintiva e assertiva a perigos ou situações inusitadas" },
        { nome: "Assimilação Sensorial 3", desc: "Os sentidos do(a) Infectado(a) atingem níveis extraordinários, captando detalhes sutis com precisão." },
        { nome: "Assimilação Vigorosa 4", desc: "A resiliência física e mental do(a) Infectado(a) é reforçada. Corpo e mente são capazes de resistir a pressões e traumas." },
        { nome: "Assimilação Persuasiva 5", desc: "O carisma e a influência do(a) Infectado(a) se ampliam de forma sensível, facilitando a comunicação e o convencimento, além de ampliar seu magnetismo e sua autoridade" },
        { nome: "Assimilação Brutal 6", desc: "A capacidade do(a) Infectado(a) em empregar força bruta e gerar aceleração é aumentada, alcançando proeza física sobre-humana." },
        { nome: "Assimilação Perspicaz 7", desc: "O raciocínio e a cognição do(a) Infectado(a) são aprimorados, despertando sua genialidade, revelando conexões ocultas, padrões complexos e soluções brilhantes em meio ao caos." },
        { nome: "Assimilação Regenerativa 8", desc: "A capacidade regenerativa do corpo do(a) Infectado(a) é ampliada além dos limites humanos." },
        { nome: "Assimilação Silvestre 9", desc: "A conexão do(a) Infectado(a) com a natureza se aprofunda, concedendo habilidades extraordinárias que podem curar, comandar animais ou até modificar ambientes vivos." },
        { nome: "Assimilação Opressora 10", desc: "A presença do(a) Infectado(a) deixa seus rivais acuados, hesitantes e mais suscetíveis à dominância." },
        { nome: "Assimilação Esguia J", desc: "A motricidade do(a) Infectado(a) é adaptada para interagir de forma mais eficiente com o ambiente à sua volta, auxiliando a ocultação." },
        { nome: "Assimilação Indomável Q", desc: "A perseverança do(a) Infectado(a) supera os seus limites, permitindo que continue lutando mesmo nas condições mais adversas." },
        { nome: "Assimilação Primordial K", desc: "O DNA do(a) Infectado(a) integra a mais pura essência da Assimilação, permitindo-o interagir com a própria força evolutiva e com a Assimilação presente nos seres à sua volta." },
        { nome: "Coringa Joker", desc: "Apenas o Assimilador saberá oque vai acontecer." }
    ];

    const baralhoAdaptativas = [
        { nome: "Assimilação Anatômica A", desc: "O(a) Infectado(a) sofre transformações físicas profundas, moldando seu corpo para combate e deslocamento, porém distorce a alimentação e a motricidade fina" },
        { nome: "Assimilação Cutânea 2", desc: "A pele do(a) Infectado(a) ganha novas capacidades, auxiliando ao mesmo tempo que dificulta sua interação com o ambiente." },
        { nome: "Assimilação Camaleônica 3", desc: "O(a) Infectado(a) desenvolve camuflagem natural, se ajusta ao ambiente e aos outros, mas perde controle sobre impulsos visuais e compromete suas sensibilidades." },
        { nome: "Assimilação Escamosa 4", desc: "Escamas cobrem o corpo do(a) Infectado(a), fortalecendo sua resistência mas atrapalhando a maneira que reage aos seus arredores." },
        { nome: "Assimilação Óssea 5", desc: "Mutações no sistema ósseo do(a) Infectado(a), alterando sua estrutura e composição para exceder os limites do ser humano comum, porém a peculiaridade de sua anatomia traz novos desafios." },
        { nome: "Assimilação Gastrointestinal 6", desc: "O sistema digestivo do(a) Infectado(a) pode consumir ampla variedade de nutrientes, mas exclui a dieta humana, o prazer na alimentação e pode gerar desconfortos." },
        { nome: "Assimilação Respiratória 7", desc: "Aprimora o controle respiratório permitindo que o(a) Infectado(a) sobreviva em ambientes hostis, mas perturba a comunicação e amplifica reações sensoriais." },
        { nome: "Assimilação Termorreguladora 8", desc: "O corpo do(a) Infectado(a) regula calor com precisão letal, alterando o ambiente ao redor, mas exige cautela com toques, desgastes e equilíbrio térmico." },
        { nome: "Assimilação Neural 9", desc: "O(a) Infectado(a) gera sinapses hiperativas que decifram padrões e ameaças com precisão inumana, à custa do descanso, do afeto e da criatividade espontânea." },
        { nome: "Assimilação Cardiovascular 10", desc: "O(a) Infectado(a) consegue controlar seu coração ao extremo, melhorando sua resposta a crises, porém pode passar por instabilidades ao longo do dia." },
        { nome: "Assimilação Fitomórfica J", desc: "Fusão com o mundo vegetal transforma o corpo do(a) Infectado(a) em raiz, escudo e fonte de cura, desde que jamais perca o contato com o solo." },
        { nome: "Assimilação Quimiorreceptora Q", desc: "O olfato do(a) Infectado(a) evolui, possibilitando que leia rastros, mentiras e histórias químicas, mas torna o mundo um tormento sensorial" },
        { nome: "Assimilação Metabólica K", desc: "Um metabolismo fora de controle gera força, cura e resistência, mas cobra energia constante e consome o corpo do(a) Infectado(a) de dentro para fora." },
        { nome: "Coringa Joker", desc: "Apenas o Assimilador saberá oque vai acontecer." }
    ];

    const baralhoInoportunas = [
        { nome: "Assimilação Atrofiante A", desc: "Músculos e tendões definham; o corpo do(a) Infectado(a) se move em esforço contido, aprendendo a sobreviver com menos, sempre à beira de ruir." },
        { nome: "Assimilação Neuropática 2", desc: "Nervos disparam sinais confusos: dor fantasma, tremores e reflexos tardios tornam o corpo do(a) Infectado(a) uma marionete de si mesmo." },
        { nome: "Assimilação Devoradora 3", desc: "O metabolismo exige alimento constante; se negado, devora as reservas internas, corroendo a carne, a paciência e o foco do(a) Infectado(a)." },
        { nome: "Assimilação Secretora 4", desc: "Glândulas hiperativas liberam fluidos e odores; funcionam como defesa instintiva, mas denunciam a presença do(a) Infectado(a) e afastam seus aliados." },
        { nome: "Assimilação Calcificante 5", desc: "Placas endurecidas formam ossos rígidos; roubam mobilidade, impondo rigidez crescente, atrapalhando a agilidade do(a) Infectado(a)." },
        { nome: "Assimilação Fotossensível 6", desc: "Luz e claridade tornam-se agressivas; pele e olhos ardem, empurrando o(a) Infectado(a) para sombras e isolamento." },
        { nome: "Assimilação Litodérmica 7", desc: "A pele transforma-se em uma mistura metálica; enfraquece sua resistência, atrapalha sua interação e em última instância afeta até mesmo o sangue do(a) Infectado(a)" },
        { nome: "Assimilação Entorpecida 8", desc: "Os sentidos se arrastam, amortecidos; proteção contra a dor que embota a reação do(a) Infectado(a) e distorce sua orientação." },
        { nome: "Assimilação Aberrante 9", desc: "Tecidos e órgãos redundantes surgem sem harmonia; aumentam o consumo e reduzem a eficiência da fisiologia do(a) Infectado(a)." },
        { nome: "Assimilação Hipersensível 10", desc: "O mundo é áspero e invasivo, especialmente ao(à) Infectado(a) que sofre de hipersensibilidade; dor ou ruídos intensos podem ser particularmente agressivos." },
        { nome: "Assimilação Mioclônica J", desc: "Espasmos e tiques rompem o controle; movimentos erráticos minam a sutileza e inviabilizam a precisão do(a) Infectado(a)." },
        { nome: "Assimilação Disfásica Q", desc: "A fala se rompe em falhas e sons truncados; pensamento rápido, mas voz irregular, distante da comunicação habitual." },
        { nome: "Assimilação Terminal K", desc: "A vitalidade se esgota lentamente; capacidades desaparecem enquanto a Assimilação toma o corpo do(a) Infectado(a) por completo." },
        { nome: "Coringa Joker", desc: "Apenas o Assimilador saberá oque vai acontecer." }
    ];

    const baralhoSingulares = [
        { nome: "Adaptação do Bosque A", desc: "Tecidos lenhosos e raízes internas permitem ao(à) Infectado(a) regenerar-se em meio a árvores, mas longe de vegetação seu corpo definha, exigindo contato com solo fértil." },
        { nome: "Camuflagem da Campina 2", desc: "O corpo do(a) Infectado(a) se adapta ao campo aberto: postura baixa, movimentos ágeis e percepção aguçada pelo vento e vibrações do solo, garantindo vigilância constante em áreas planas." },
        { nome: "Camuflagem do Cerrado 3", desc: "Casca grossa protege o(a) Infectado(a) contra lesões e aridez; o organismo armazena água em reservas internas e consegue se recuperar após longos períodos de calor intenso e seca." },
        { nome: "Camuflagem da Colina 4", desc: "Músculos e tendões do(a) Infectado(a) se avolumam para ganhar força; a resistência se prolonga em terrenos inclinados e o corpo aprende a economizar energia durante subidas íngremes." },
        { nome: "Camuflagem Desértica 5", desc: "Suor e metabolismo se adaptam à baixa umidade e a temperaturas extremas; o(a) Infectado(a) consome quantidades reduzidas de água e desenvolve outras maneiras de se proteger." },
        { nome: "Camuflagem Florestal 6", desc: "O corpo do(a) Infectado(a) aprimora seu equilíbrio e sua capacidade de se esgueirar em terrenos densos; visão e audição se adaptam à penumbra e a movimentação entre árvores é quase imperceptível aos predadores." },
        { nome: "Camuflagem do Manguezal 7", desc: "Poros filtram sal e membros se adaptam ao lodo; o(a) Infectado(a) respira e se move em áreas encharcadas, resistindo a infecções típicas de ambientes lamacentos." },
        { nome: "Camuflagem Marinha 8", desc: "Pulmões e músculos se adaptam à pressão e correntes marinhas; o(a) Infectado(a) nada com eficiência e tolera longas imersões, explorando o oceano sem risco de colapso." },
        { nome: "Camuflagem da Montanha 9", desc: "O sangue engrossa e a circulação se ajusta; o(a) Infectado(a) suporta ar rarefeito e frio intenso, mantendo energia e estabilidade mesmo em grandes altitudes." },
        { nome: "Camuflagem do Pântano 10", desc: "Pele e pulmões toleram gases e microrganismos da água estagnada; o(a) Infectado(a) detecta movimentos sutis no brejo, usando o terreno alagado como proteção natural." },
        { nome: "Camuflagem da Caatinga J", desc: "O organismo do(a) Infectado(a) aprende a reduzir funções em longos períodos secos; desperta com chuvas ocasionais e protege-se de predadores com pele espessa e pontiaguda." },
        { nome: "Camuflagem Subterrânea Q", desc: "Visão perde relevância entre os sentidos; pele e ouvido detectam vibrações e correntes de ar em túneis. O(a) Infectado(a) se orienta no escuro e resiste a confinamento e baixa oxigenação." },
        { nome: "Camuflagem da Tundra K", desc: "O metabolismo do(a) Infectado(a) regula calor em ambientes congelados; seu sangue não congela e seu corpo suporta longos períodos em torpor, reduzindo desgaste no frio extremo." },
        { nome: "Coringa Joker", desc: "Apenas o Assimilador saberá oque vai acontecer." }
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

            const drawCards = (qtd, baralho, bgClass, borderClass, textClass, assetName, label) => {
                for (let i = 0; i < qtd; i++) {
                    const carta = puxarCartaAleatoria(baralho);

                    // 🔥 Lógica corrigida: Asset normal (preto) no Claro, e Asset "-branco" no Escuro 🔥
                    const iconHtml = `
                        <img src="./assets/${assetName}.png" class="w-5 h-5 object-contain block dark:hidden" alt="${label}">
                        <img src="./assets/${assetName}-branco.png" class="w-5 h-5 object-contain hidden dark:block" alt="${label}">
                    `;

                    // Removemos a tag <i> do Lucide e colocamos o seu iconHtml super customizado!
                    containerCartas.innerHTML += `
                        <div class="${bgClass} border-l-4 ${borderClass} p-4 rounded shadow-sm">
                            <h4 class="font-black font-rpg ${textClass} text-lg uppercase mb-1 flex items-center gap-2">
                                ${iconHtml} ${carta.nome} <span class="text-sm font-sans font-bold ml-auto">${label}</span>
                            </h4>
                            <p class="text-gray-700 dark:text-gray-300">${carta.desc}</p>
                        </div>`;
                }
            };

            // 🔥 Chamando o Javascript passando OS NOMES EXATOS dos seus arquivos (sem o .png) 🔥
            drawCards(qtdA, baralhoEvolutivas, 'bg-green-100 dark:bg-green-900/30', 'border-green-500', 'text-green-800 dark:text-green-400', 'sucesso', 'Evolutiva (A)');
            drawCards(qtdB, baralhoAdaptativas, 'bg-blue-100 dark:bg-blue-900/30', 'border-blue-500', 'text-blue-800 dark:text-blue-400', 'adaptacao', 'Adaptativa (B)');
            drawCards(qtdC, baralhoInoportunas, 'bg-red-100 dark:bg-red-900/30', 'border-rpg-red', 'text-rpg-red dark:text-red-400', 'pressao', 'Inoportuna (C)');
            drawCards(qtdI, baralhoSingulares, 'bg-amber-100 dark:bg-amber-900/30', 'border-amber-500', 'text-amber-800 dark:text-amber-400', 'singulares', 'Singular (I)');

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
    window.salvarFicha = async function (silencioso = false) {
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

        // Puxa a foto da tela perfeitamente
        const imgPreview = document.getElementById('char-photo-preview');
        const fotoFinal = (imgPreview && imgPreview.src && !imgPreview.src.includes('R0lGODlhAQAB')) ? imgPreview.src : null;

        const checkboxPrivacidade = document.getElementById('char-is-private');
        const isPrivada = checkboxPrivacidade ? checkboxPrivacidade.checked : false;

        const payload = {
            usuarioId: usuarioLogadoId,
            personagemId: window.idPersonagemAtual,
            nome: nomePersonagem,
            ocupacao: ocupacao,
            dadosFicha: dadosFicha,
            foto: fotoFinal,
            isPrivada: isPrivada
        };

        const btnSaveNav = document.getElementById('btn-save-char-nav');
        const btnDeleteCharNav = document.getElementById('btn-delete-char-nav');
        const htmlPadrao = '<i data-lucide="save" class="w-4 h-4"></i> <span class="hidden md:inline">Salvar</span>';

        // 🔥 ANIMAÇÃO "SALVANDO..." RESTAURADA PARA TODOS OS CLIQUES E AUTOSAVES 🔥
        if (btnSaveNav) {
            btnSaveNav.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> <span class="hidden md:inline">Salvando...</span>';
            if (window.lucide) lucide.createIcons();
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
                }

                if (!silencioso) {
                    window.mostrarNotificacao(resultado.mensagem, 'sucesso');
                    if (typeof window.carregarListaPersonagens === 'function') window.carregarListaPersonagens();
                }

                // 🔥 TRAVA DE TELA: Só manipula os botões da navbar se o jogador AINDA ESTIVER na tela da Ficha! 🔥
                if (typeof Router !== 'undefined' && Router.telaAtual === 'ficha') {
                    if (btnDeleteCharNav) {
                        btnDeleteCharNav.classList.remove('hidden');
                        btnDeleteCharNav.style.display = 'flex';
                    }

                    if (btnSaveNav) {
                        btnSaveNav.classList.remove('bg-rpg-green', 'hover:bg-green-700');
                        btnSaveNav.classList.add('bg-blue-600', 'hover:bg-blue-700');
                        btnSaveNav.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> <span class="hidden md:inline">Salvo!</span>';
                        if (window.lucide) lucide.createIcons();

                        setTimeout(() => {
                            // Confirma de novo se o cara não saiu da ficha nesses 2 segundos do setTimeout!
                            if (Router.telaAtual === 'ficha') {
                                btnSaveNav.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                                btnSaveNav.classList.add('bg-rpg-green', 'hover:bg-green-700');
                                btnSaveNav.innerHTML = htmlPadrao;
                                if (window.lucide) lucide.createIcons();
                            }
                        }, 2000);
                    }
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

    // ==========================================
    // 11. AUTOMAÇÃO DE ROLAGEM (SISTEMA ABSOLUTO E INTEGRADO)
    // ==========================================
    window.selecaoRolagem = [];

    window.limparSelecaoRolagem = function (apagarTerminal = true) {
        // Varre a ficha e apaga as luzes (incluindo a classe 'label-selecionado' do rolador.js!)
        document.querySelectorAll('.aptidao-box label').forEach(label => {
            label.classList.remove('bg-gray-300', 'dark:bg-[#333]', 'text-rpg-red', 'dark:text-orange-500', 'scale-105', 'label-selecionado');
        });
        window.selecaoRolagem = [];

        // Esconde o letreiro de "Rolagem Assimilada!" caso ele esteja aparecendo
        const avisoAssimilada = document.getElementById('aviso-assimilada');
        if (avisoAssimilada) avisoAssimilada.classList.add('hidden');

        if (apagarTerminal) {
            // O setTimeout garante que limpamos logo após o rolador.js terminar o que estava fazendo
            setTimeout(() => {
                // Apaga a caixa de texto do terminal
                const inputRolador = document.getElementById('rolador-input');
                if (inputRolador) inputRolador.value = '';

                // Apaga os dados desenhados na tela daquela rolagem
                const resultadosAtuais = document.getElementById('rolador-resultados-atuais');
                if (resultadosAtuais) resultadosAtuais.innerHTML = '';
            }, 50);
        }
    };

    const labelsAptidoesFicha = document.querySelectorAll('.aptidao-box label');

    labelsAptidoesFicha.forEach(label => {
        // Fase de captura: ouvimos o clique ANTES do rolador.js intervir
        label.addEventListener('click', (e) => {
            // Se tentar selecionar um 3º atributo com a janela aberta, limpa tudo e recomeça
            if (window.selecaoRolagem.length >= 2) {
                window.limparSelecaoRolagem(true);
            }

            const nomeAtributo = label.textContent.trim();
            const grupo = label.closest('.grupo-aptidoes');
            const categoria = grupo ? grupo.id : '';

            // 🔥 BLOQUEIO ABSOLUTO DO SISTEMA 🔥
            if (window.selecaoRolagem.length === 1) {
                const primeiraFoiInstinto = window.selecaoRolagem[0].categoria === 'secao-instintos';
                const segundaFoiInstinto = categoria === 'secao-instintos';

                // Se as DUAS escolhas NÃO forem Instinto (Ex: Biologia + Armas) -> BLOQUEIA!
                if (!primeiraFoiInstinto && !segundaFoiInstinto) {
                    e.stopImmediatePropagation(); // Enforca a ação aqui, o rolador.js nem fica sabendo!
                    e.preventDefault();
                    window.mostrarNotificacao("Teste Inválido: É obrigatório usar pelo menos 1 Instinto na rolagem!", 'erro');
                    window.limparSelecaoRolagem(true);
                    return;
                }
            }

            // Aprovado! Guarda na memória. (O visual será aplicado tanto por nós quanto pelo rolador.js)
            window.selecaoRolagem.push({ label, nome: nomeAtributo, categoria });

            // Bateu 2 escolhas válidas -> Abre o Terminal
            if (window.selecaoRolagem.length === 2) {
                const attr1 = window.selecaoRolagem[0].nome;
                const attr2 = window.selecaoRolagem[1].nome;

                window.mostrarNotificacao(`Preparando Teste: ${attr1} + ${attr2}`, 'aviso');

                const modalRolador = document.getElementById('rolador-modal');
                if (modalRolador) {
                    modalRolador.classList.add('show');
                    setTimeout(() => { document.getElementById('rolador-input')?.focus(); }, 100);
                }
            }
        }, true);
    });

    // ==========================================
    // GATILHOS INQUEBRÁVEIS DE FECHAMENTO
    // ==========================================
    document.addEventListener('click', (e) => {
        const modalRolador = document.getElementById('rolador-modal');

        // 1. Fechou no "X"
        if (e.target.closest('#fechar-rolador')) {
            if (modalRolador) modalRolador.classList.remove('show');
            window.limparSelecaoRolagem(true);
        }
        // 2. Fechou clicando no fundo escuro
        else if (e.target.id === 'rolador-modal') {
            if (modalRolador) modalRolador.classList.remove('show');
            window.limparSelecaoRolagem(true);
        }
        // 3. Clicou no botão "Limpar" dentro do terminal
        else if (e.target.closest('#rolador-btn-limpar')) {
            window.limparSelecaoRolagem(true);
        }
    }, true);

    // 4. Fechou apertando ESC no teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalRolador = document.getElementById('rolador-modal');
            if (modalRolador && modalRolador.classList.contains('show')) {
                modalRolador.classList.remove('show');
                window.limparSelecaoRolagem(true);
            }
        }
    }, true);
});