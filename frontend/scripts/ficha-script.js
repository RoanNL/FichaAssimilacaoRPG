document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';

    // Variável que guarda o ID do usuário apenas na memória RAM 
    let token = sessionStorage.getItem('token')
    let usuarioLogadoId = sessionStorage.getItem('usuarioId');
    let nomeOperador = sessionStorage.getItem('usuarioNome');
    let isLoginMode = true;

    // Elementos de Autenticação
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authMensagem = document.getElementById('auth-mensagem');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    const btnSair = document.getElementById('btn-sair');

    // Elementos da Ficha
    const charSelect = document.getElementById('char-select');
    const btnLoad = document.getElementById('btn-load-char');
    const btnSave = document.getElementById('btn-save-char');
    const btnDelete = document.getElementById('btn-delete-char');
    const nomeInput = document.getElementById('nome');

    let personagensCarregados = [];
    let idPersonagemAtual = sessionStorage.getItem('personagemAtivoId') || null;

    // === CONTROLES DA GALERIA ===
    const btnAbrirGaleria = document.getElementById('btn-abrir-galeria');
    const modalGaleria = document.getElementById('galeria-modal');
    const btnFecharGaleria = document.getElementById('fechar-galeria');
    const inputBuscaGaleria = document.getElementById('busca-personagem');

    if(btnAbrirGaleria) {
        btnAbrirGaleria.addEventListener('click', async (e) => {
            e.preventDefault();
            // 🛡️ A MÁGICA 1: Recarrega a sua pasta pessoal antes de abrir a tela!
            await carregarListaPersonagens(); 
            modalGaleria.classList.add('show');
        });
    }

    if (btnFecharGaleria) {
        btnFecharGaleria.addEventListener('click', () => {
            modalGaleria.classList.remove('show');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == modalGaleria) {
            modalGaleria.classList.remove('show');
        }
    });

    if (inputBuscaGaleria) {
        inputBuscaGaleria.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            document.querySelectorAll('.char-card').forEach(card => {
                if (card.dataset.nome) {
                    card.style.display = card.dataset.nome.includes(termo) ? 'flex' : 'none';
                }
            });
        });
    }

    //Função de verificação de sessão
    function verificarSessao() {
        if (usuarioLogadoId && usuarioLogadoId !== 'undefined') {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            const nomeUsuarioLogado = document.getElementById('nome-usuario-logado');
            if (nomeUsuarioLogado) nomeUsuarioLogado.textContent = `Bem-vindo, ${nomeOperador}`;

            carregarListaPersonagens();
        }
    }
    verificarSessao();

    // ==========================================
    // SISTEMA DE LOGIN E CRIAÇÃO DE CONTA
    // ==========================================
    authToggleLink.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authMensagem.textContent = '';

        if (isLoginMode) {
            authTitle.textContent = 'Acesso Restrito';
            authSubmitBtn.textContent = 'Entrar no Sistema';
            authToggleText.innerHTML = 'Não possui credenciais? <span id="auth-toggle-link" style="color: #a04040; cursor: pointer; text-decoration: underline; font-weight: bold;">Criar nova conta</span>';
        } else {
            authTitle.textContent = 'Novo Registro de Operador';
            authSubmitBtn.textContent = 'Registrar Conta';
            authToggleText.innerHTML = 'Já possui cadastro? <span id="auth-toggle-link" style="color: #a04040; cursor: pointer; text-decoration: underline; font-weight: bold;">Fazer Login</span>';
        }
        document.getElementById('auth-toggle-link').addEventListener('click', () => authToggleLink.click());
    });

    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const endpoint = isLoginMode ? '/login' : '/registro';

        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Aguarde...';

            const resposta = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                authMensagem.textContent = dados.erro;
                authMensagem.style.color = '#a04040';
            } else {
                if (isLoginMode) {
                    // VACINA ANTI-UNDEFINED
                    const nomeParaSalvar = dados.usuario?.nome || dados.usuario?.username || dados.nome || dados.username || 'Operador';
                    const idParaSalvar = dados.usuario?.id || dados.id;

                    sessionStorage.setItem('usuarioId', idParaSalvar);
                    sessionStorage.setItem('usuarioNome', nomeParaSalvar);

                    usuarioLogadoId = idParaSalvar;
                    nomeOperador = nomeParaSalvar;

                    authContainer.style.display = 'none';
                    appContainer.style.display = 'block';

                    const nomeUsuarioLogado = document.getElementById('nome-usuario-logado');
                    if (nomeUsuarioLogado) nomeUsuarioLogado.textContent = `Bem-vindo, ${nomeOperador}`;

                    usernameInput.value = '';
                    passwordInput.value = '';

                    carregarListaPersonagens();

                    alert(dados.mensagem);
                } else {
                    authMensagem.textContent = 'Conta criada com sucesso! Faça login.';
                    authMensagem.style.color = 'green';
                    authToggleLink.click();
                }
            }
        } catch (erro) {
            authMensagem.textContent = 'Erro de conexão com o servidor SQL.';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Entrar no Sistema' : 'Registrar Conta';
        }
    });

    btnSair.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.clear();

        token = null;
        usuarioLogadoId = null;
        nomeOperador = null;
        idPersonagemAtual = null;

        document.querySelectorAll('form').forEach(f => {
            if (f.id !== 'auth-form') f.reset();
        });

        const photoPreview = document.getElementById('char-photo-preview');
        if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

        appContainer.style.display = 'none';
        authContainer.style.display = 'block';
    });


    // ==========================================
    // SISTEMA DA FICHA E DETALHES (A MÁGICA DO CARREGAMENTO)
    // ==========================================

    // FUNÇÃO CENTRAL PARA BUSCAR E CARREGAR UMA FICHA DO POSTGRESQL
    async function carregarPersonagem(id) {
        try {
            const resposta = await fetch(`${API_URL}/personagem/${id}`);
            const personagem = await resposta.json();

            if (!resposta.ok) {
                return alert(personagem.erro || "Erro ao carregar a ficha.");
            }


            document.getElementById('nome').value = personagem.nome_personagem || '';
            document.getElementById('ocupacao').value = personagem.ocupacao || '';

            const ficha = personagem.dados_ficha || {};

            preencherFicha(ficha);

            idPersonagemAtual = id;
            sessionStorage.setItem('personagemAtivoId', id);

            if (charSelect) charSelect.value = id;

        } catch (err) {
            console.error("Erro ao carregar personagem:", err);
            alert("Erro de conexão ao carregar a ficha.");
        }
    }

    const photoInput = document.getElementById('char-photo-input');
    const photoPreview = document.getElementById('char-photo-preview');

    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    // O COMPRESSOR DE VELOCIDADE 🚀
                    const img = new Image();
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // Reduz a imagem para no máximo 400x400 pixels (Tamanho perfeito pra token)
                        const MAX_WIDTH = 400;
                        const MAX_HEIGHT = 400;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        // Converte para WebP (preserva fundo transparente e é hiper leve) com 80% de qualidade
                        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
                        photoPreview.src = compressedBase64;
                    };
                    img.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    function coletarDadosFicha() {
        const dados = {};

        const elementos = document.querySelectorAll('#app-container input, #app-container textarea');

        elementos.forEach(el => {
            if (!el.id || el.type === 'file' || el.id === 'char-select' || el.id === 'busca-personagem' || el.tagName === 'BUTTON') {
                return;
            }

            if (el.type === 'checkbox' || el.type === 'radio') {
                dados[el.id] = el.checked;
            } else {
                dados[el.id] = el.value;
            }
        });

        const photoPreview = document.getElementById('char-photo-preview');
        if (photoPreview && photoPreview.src && !photoPreview.src.includes('R0lGODlhAQABAAD')) {
            dados['char-photo'] = photoPreview.src;
        }
        return dados;
    }

    function preencherFicha(dados) {
        document.querySelectorAll('form').forEach(f => {
            if (f.id !== 'auth-form') f.reset();
        });

        if (photoPreview) {
            photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        }

        for (const key in dados) {
            if (key === 'char-photo') {
                if (photoPreview) photoPreview.src = dados[key];
                continue;
            }

            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = dados[key];
                } else {
                    el.value = dados[key];
                }
            }
        }
    }


    async function carregarListaPersonagens() {
        if (!usuarioLogadoId) return;

        try {
            const resposta = await fetch(`${API_URL}/personagens/usuario/${usuarioLogadoId}`);
            personagensCarregados = await resposta.json();

            charSelect.innerHTML = '<option value="">-- Novo Personagem --</option>';

            const gridPersonagens = document.getElementById('grid-personagens');
            if (gridPersonagens) gridPersonagens.innerHTML = '';

            if (gridPersonagens) {
                const cardNovo = document.createElement('div');
                cardNovo.className = 'char-card';
                cardNovo.style.cursor = 'pointer';
                cardNovo.innerHTML = `
                    <div class="char-card-img" style="display: flex; align-items: center; justify-content: center; font-size: 3em; color: #555;">+</div>
                    <div class="char-card-info">
                        <h3 class="char-card-nome" style="color: #4CAF50;">Criar Novo</h3>
                        <p class="char-card-detalhe">Ficha em branco</p>
                    </div>
                `;
                cardNovo.addEventListener('click', () => {
                    document.querySelectorAll('form').forEach(f => {
                        if (f.id !== 'auth-form') f.reset();
                    });
                    if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                    idPersonagemAtual = null;
                    sessionStorage.removeItem('personagemAtivoId');
                    charSelect.value = "";
                    modalGaleria.classList.remove('show');
                });
                gridPersonagens.appendChild(cardNovo);
            }

            personagensCarregados.forEach(char => {
                const option = document.createElement('option');
                option.value = char.id;
                option.textContent = char.nome_personagem || 'Sem Nome';
                charSelect.appendChild(option);

                if (gridPersonagens) {
                    // Puxamos a foto direto do banco agora!
                    const fotoBase64 = char.foto;
                    const ocupacao = char.ocupacao || 'Desconhecido';

                    const placeholderInterno = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='130'%3E%3Crect width='110' height='130' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' font-size='40' fill='%23555' dominant-baseline='middle' text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E";
                    const imgSrc = (fotoBase64 && !fotoBase64.includes('R0lGODlhAQAB')) ? fotoBase64 : placeholderInterno;

                    const card = document.createElement('div');
                    card.className = 'char-card';
                    card.dataset.nome = (char.nome_personagem || 'sem nome').toLowerCase();

                    card.innerHTML = `
                        <img src="${imgSrc}" class="char-card-img" alt="Foto de ${char.nome_personagem}">
                        <div class="char-card-info">
                            <h3 class="char-card-nome">${char.nome_personagem || 'Sem Nome'}</h3>
                            <p class="char-card-detalhe">${ocupacao}</p>
                            <button class="btn-acessar-ficha" data-id="${char.id}">Acessar Ficha</button>
                        </div>
                    `;
                    gridPersonagens.appendChild(card);
                }
            });

            // Adiciona a ação nos botões usando nossa função central!
            document.querySelectorAll('.btn-acessar-ficha').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const idSelecionado = e.target.getAttribute('data-id');
                    await carregarPersonagem(idSelecionado);
                    modalGaleria.classList.remove('show');
                });
            });

        } catch (erro) {
            console.error('Erro ao buscar lista:', erro);
        }
    }

   // === FUNÇÃO CENTRAL DE SALVAMENTO ===
    // Se "silencioso" for true, ele não emite alerts na tela
    async function salvarFicha(silencioso = false) {
        if (!usuarioLogadoId) return;

        const dadosFicha = coletarDadosFicha();
        const nomePersonagem = nomeInput.value || 'Cobaia Desconhecida';
        const foto = dadosFicha['char-photo'] || null;

        const payload = {
            usuarioId: usuarioLogadoId,
            personagemId: idPersonagemAtual, 
            nome: nomePersonagem, 
            ocupacao: document.getElementById('ocupacao').value,
            dadosFicha: dadosFicha,
            foto: foto
        };

        if (!silencioso) btnSave.textContent = 'Salvando...';

        try {
            const resposta = await fetch(`${API_URL}/personagens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const resultado = await resposta.json();
            
            if (resposta.ok) {
                if (resultado.id) { 
                    sessionStorage.setItem('personagemAtivoId', resultado.id);
                    idPersonagemAtual = resultado.id;
                }
                
                if (!silencioso) {
                    alert(resultado.mensagem);
                    await carregarListaPersonagens();
                } else {
                    // Feedback visual sutil (Opcional)
                    console.log("Autosave concluído com sucesso!");
                    btnSave.textContent = 'Salvo!';
                    setTimeout(() => btnSave.textContent = 'SALVAR', 2000);
                }
            } else {
                if (!silencioso) alert("Servidor diz: " + (resultado.erro || "Erro desconhecido."));
            }
        } catch (erro) {
            console.error("❌ Erro no Front-end ao tentar enviar:", erro);
            if (!silencioso) alert("Erro de comunicação com o servidor!");
        } finally {
            if (!silencioso) btnSave.textContent = 'SALVAR';
        }
    }

    // O botão agora apenas chama a função em modo barulhento (com alerts)
    btnSave.addEventListener('click', () => salvarFicha(false));

    // BOTÃO CARREGAR (DO DROPDOWN MENU)
    btnLoad.addEventListener('click', () => {
        const idSelecionado = charSelect.value;
        if (!idSelecionado) {
            document.querySelector('.ficha-container').reset();
            idPersonagemAtual = null;
            sessionStorage.removeItem('personagemAtivoId');
            return;
        }
        carregarPersonagem(idSelecionado);
    });

    // BOTÃO DELETAR
    btnDelete.addEventListener('click', async () => {
        if (!idPersonagemAtual) return alert('Selecione um personagem para excluir.');

        const confirmacao = confirm('Tem certeza que deseja apagar esta ficha permanentemente?');
        if (!confirmacao) return;

        try {
            await fetch(`${API_URL}/personagens/${idPersonagemAtual}`, { method: 'DELETE' });
            alert('Ficha deletada com sucesso.');

            document.querySelectorAll('form').forEach(f => {
                if (f.id !== 'auth-form') f.reset();
            });
            idPersonagemAtual = null;
            sessionStorage.removeItem('personagemAtivoId');
            if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

            await carregarListaPersonagens();
        } catch (erro) {
            console.error('Erro ao deletar:', erro);
        }
    });


    // ==========================================
    // VERSÃO 1.6: CONTROLE DE TEMA (DARK MODE)
    // ==========================================
    const btnToggleTema = document.getElementById('btn-toggle-tema');
    const corpoDoSite = document.body;

    const temaSalvo = localStorage.getItem('tema-rpg-assimilacao');

    if (temaSalvo === 'dark') {
        corpoDoSite.classList.add('dark');
        if (btnToggleTema) btnToggleTema.textContent = '☀️ Tema Claro';
    }

    if (btnToggleTema) {
        btnToggleTema.addEventListener('click', (e) => {
            e.preventDefault();
            corpoDoSite.classList.toggle('dark');
            if (corpoDoSite.classList.contains('dark')) {
                localStorage.setItem('tema-rpg-assimilacao', 'dark');
                btnToggleTema.textContent = '☀️ Tema Claro';
            } else {
                localStorage.setItem('tema-rpg-assimilacao', 'light');
                btnToggleTema.textContent = '🌙 Tema Escuro';
            }
        });
    }

    // ==========================================
    // PODER DO MESTRE: ABRIR FICHAS DA MESA
    // ==========================================
    const btnFichasMesa = document.getElementById('btn-fichas-mesa');
    const gridPersonagensMesa = document.getElementById('grid-personagens');

    if (btnFichasMesa) {
        btnFichasMesa.addEventListener('click', async (e) => {
            e.preventDefault();
            const campanhaId = sessionStorage.getItem('campanhaAtiva');
            if (!campanhaId) return alert('Você não está em nenhuma mesa ativa!');

            btnFichasMesa.textContent = "Buscando...";
            
            try {
                const resposta = await fetch(`${API_URL}/campanhas/${campanhaId}/fichas-mesa`);
                let fichas = await resposta.json();

                // 🛡️ A MÁGICA 2: Remove as fichas do próprio Mestre da lista!
                const meuId = sessionStorage.getItem('usuarioId');
                fichas = fichas.filter(char => char.usuario_id != meuId);

                gridPersonagensMesa.innerHTML = ''; 

                if (fichas.length === 0) {
                    gridPersonagensMesa.innerHTML = '<p style="color: var(--color-text-medium); padding: 20px;">Nenhum jogador criou ficha nesta mesa ainda.</p>';
                } else {
                    fichas.forEach(char => {
                        // Como filtramos o Mestre, todos aqui são 100% Jogadores
                        const card = document.createElement('div');
                        card.className = 'char-card'; 
                        
                        // Aplicamos uma trava de segurança com flexbox e margens zeradas no H3
                        card.innerHTML = `
                            <img src="${char.foto || './assets/icon.jpg'}" class="char-card-img" alt="Foto">
                            <div class="char-card-info" style="display: flex; flex-direction: column; justify-content: center; padding: 10px;">
                            <h3 class="char-card-nome" style="margin: 0 0 5px 0; line-height: normal; font-size: 1.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${char.nome_personagem || 'Sem Nome'}</h3>                                <p class="char-card-detalhe" style="color: #ff9800; font-weight: bold; margin: 0;">👤 Jogador: ${char.nome_conta}</p>
                                <p class="char-card-detalhe" style="margin: 2px 0 10px 0;">Ocupação: ${char.ocupacao || 'Nenhuma'}</p>
                                <button class="btn-acessar-ficha mt-2" data-id="${char.id}">Inspecionar</button>
                            </div>
                        `;
                        gridPersonagensMesa.appendChild(card);
                    });

                    // O botão Inspecionar continua usando a função central
                    document.querySelectorAll('.btn-acessar-ficha').forEach(btn => {
                        btn.addEventListener('click', async (event) => {
                            const fichaId = event.target.getAttribute('data-id');
                            await carregarPersonagem(fichaId); 
                            modalGaleria.classList.remove('show'); 
                            alert('Ficha do jogador carregada na tela!');
                        });
                    });
                }
                
                modalGaleria.classList.add('show');
                
            } catch (erro) {
                console.error(erro);
                alert("Erro ao buscar as fichas da mesa.");
            } finally {
                btnFichasMesa.textContent = "👑 Fichas da Mesa";
            }
        });
    }

    // ==========================================
    // PODERES DO MESTRE: GERENCIAR JOGADORES (V1.6)
    // ==========================================
    const btnGerenciarJogadores = document.getElementById('btn-gerenciar-jogadores');
    const modalGerenciarJogadores = document.getElementById('gerenciar-jogadores-modal');
    const btnFecharGerenciar = document.getElementById('fechar-gerenciar-jogadores');

    setInterval(() => {
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        
        // Revela o botão de Gerenciar Jogadores
        if (btnGerenciarJogadores) {
            btnGerenciarJogadores.style.display = isMestre ? 'inline-block' : 'none';
        }
        
        // Revela o botão de Fichas da Mesa
        if (btnFichasMesa) {
            btnFichasMesa.style.display = isMestre ? 'inline-block' : 'none';
        }
    }, 1000);

    if (btnFecharGerenciar) {
        btnFecharGerenciar.addEventListener('click', () => modalGerenciarJogadores.classList.remove('show'));
    }

    if (btnGerenciarJogadores) {
        btnGerenciarJogadores.addEventListener('click', async (e) => {
            e.preventDefault();
            const campanhaId = sessionStorage.getItem('campanhaAtiva');
            if (!campanhaId) return alert('Você não está em nenhuma mesa ativa!');

            btnGerenciarJogadores.textContent = "Buscando...";
            try {
                const resposta = await fetch(`${API_URL}/campanhas/${campanhaId}/jogadores`);
                const jogadores = await resposta.json();

                const gridJogadores = document.getElementById('grid-jogadores-mesa');
                gridJogadores.innerHTML = '';

                if (jogadores.length === 0) {
                    gridJogadores.innerHTML = '<p style="color: var(--color-text-medium);">Nenhum jogador na mesa ainda.</p>';
                } else {
                    jogadores.forEach(jog => {
                        const card = document.createElement('div');
                        card.className = 'jogador-card-mestre';

                        const nomeConta = jog.username || 'Operador Desconhecido';
                        const nomeChar = jog.nome_personagem || 'Sem personagem ativo';

                        card.innerHTML = `
                            <div>
                                <h4 style="margin-bottom: 5px;">${nomeConta}</h4>
                                <p style="color: #888; font-size: 0.8em; margin-top: 0; margin-bottom: 25px;">👤 ${nomeChar}</p>
                            </div>
                            <button class="btn-remover-jogador" data-usuario="${jog.usuario_id}">Remover</button>
                        `;
                        gridJogadores.appendChild(card);
                    });

                    document.querySelectorAll('.btn-remover-jogador').forEach(btn => {
                        btn.addEventListener('click', async (event) => {
                            const usuarioIdRemover = event.target.getAttribute('data-usuario');

                            if (confirm("Tem certeza que deseja remover este jogador da campanha?")) {
                                try {
                                    const delRes = await fetch(`${API_URL}/campanhas/${campanhaId}/membros/${usuarioIdRemover}`, {
                                        method: 'DELETE'
                                    });
                                    if (delRes.ok) {
                                        event.target.closest('.jogador-card-mestre').remove();
                                    } else {
                                        alert("Erro ao remover jogador.");
                                    }
                                } catch (err) {
                                    alert("Erro de conexão.");
                                }
                            }
                        });
                    });
                }

                modalGerenciarJogadores.classList.add('show');
            } catch (erro) {
                console.error(erro);
                alert("Erro ao buscar jogadores.");
            } finally {
                btnGerenciarJogadores.innerHTML = "👥 Jogadores";
            }
        });
    }

    // ==========================================
    // SISTEMA DE AUTOSAVE (DEBOUNCE)
    // ==========================================
    let timeoutAutosave;

    function agendarAutosave() {
        // Só salva automaticamente se já for um personagem existente (evita criar fichas vazias à toa)
        if (!idPersonagemAtual) return;

        // Cancela o timer anterior se o jogador continuou digitando
        clearTimeout(timeoutAutosave);
        
        // Inicia um novo timer de 2 segundos (2000 milissegundos)
        timeoutAutosave = setTimeout(() => {
            salvarFicha(true); // O "true" faz o salvamento ser silencioso
        }, 2000); 
    }

    // Instala os sensores em todos os inputs e textareas do app
    const todosInputs = document.querySelectorAll('#app-container input, #app-container textarea');
    
    todosInputs.forEach(el => {
        // Ignora campos de pesquisa ou arquivos
        if (el.type === 'file' || el.id === 'char-select' || el.id === 'busca-personagem') return;
        
        // Escuta quando digita ou marca checkbox
        el.addEventListener('input', agendarAutosave);
        el.addEventListener('change', agendarAutosave);
    });
});