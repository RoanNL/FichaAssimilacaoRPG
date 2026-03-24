// ==========================================
// SISTEMA DE NOTIFICAÇÕES (TOAST) DA FICHA
// ==========================================
window.mostrarNotificacao = function (mensagem, tipo = 'sucesso') {

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        Object.assign(container.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '9999999',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none'
        });
        document.body.appendChild(container);
    }


    const card = document.createElement('div');

    const corBorda = tipo === 'erro' ? '#f44336' : (tipo === 'aviso' ? '#ff9800' : '#4caf50');

    Object.assign(card.style, {
        backgroundColor: '#1a1a1a',
        color: '#f0f0f0',
        padding: '15px 20px',
        borderRadius: '5px',
        borderLeft: `5px solid ${corBorda}`,
        boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
        fontFamily: "'Special Elite', monospace",
        fontSize: '1rem',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease-out'
    });

    card.innerHTML = `<strong>${mensagem}</strong>`;
    container.appendChild(card);

    requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(100%)';
        setTimeout(() => card.remove(), 300);
    }, 2500);
};

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://fichaassimilacaorpg.onrender.com';

    function escaparHTML(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

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

    if (btnAbrirGaleria) {
        btnAbrirGaleria.addEventListener('click', async (e) => {
            e.preventDefault();

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
    const authEmailContainer = document.getElementById('auth-email-container');
    const authEmailInput = document.getElementById('auth-email');
    const esqueciSenhaWrapper = document.getElementById('esqueci-senha-wrapper');
    const subtitleTexto = document.querySelector('.auth-subtitle');

    authToggleLink.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authMensagem.textContent = '';

        if (isLoginMode) {
            authTitle.textContent = 'Acesso Restrito';
            authSubmitBtn.textContent = 'Entrar';
            authToggleText.innerHTML = 'Não possui credenciais? <span id="auth-toggle-link" style="color: #a04040; cursor: pointer; text-decoration: underline; font-weight: bold;">Criar nova conta</span>';
            document.getElementById('auth-confirm-container').style.display = 'none';

            authEmailContainer.style.display = 'none';
            esqueciSenhaWrapper.style.display = 'block';
        } else {
            document.getElementById('auth-confirm-container').style.display = 'block';
            authTitle.textContent = 'Novo Registro de Assimilado';
            authSubmitBtn.textContent = 'Registrar Conta';
            authToggleText.innerHTML = 'Já possui Conta? <span id="auth-toggle-link" style="color: #a04040; cursor: pointer; text-decoration: underline; font-weight: bold;">Fazer Login</span>';

            authEmailContainer.style.display = 'block';
            esqueciSenhaWrapper.style.display = 'none';
        }
        document.getElementById('auth-toggle-link').addEventListener('click', () => authToggleLink.click());
    });

    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = document.getElementById('auth-confirm-password').value.trim(); // Pega a confirmação
        const email = authEmailInput.value.trim();
        const endpoint = isLoginMode ? '/login' : '/registro';


        if (!isLoginMode && password !== confirmPassword) {
            authMensagem.textContent = 'As senhas não coincidem!';
            authMensagem.style.color = '#a04040';
            return; 
        }

        // Prepara os dados. No registro, manda o e-mail junto.
        const bodyData = { username: username, password: password };
        if (!isLoginMode) bodyData.email = email;

        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Aguarde...';

            const resposta = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                authMensagem.textContent = dados.erro;
                authMensagem.style.color = '#a04040';
            } else {
                if (isLoginMode) {
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
                    mostrarNotificacao(dados.mensagem, 'sucesso');
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


    // ==========================================
    // LÓGICA DE RECUPERAÇÃO DE SENHA 
    // ==========================================
    const btnEsqueciSenha = document.getElementById('btn-esqueci-senha');
    const btnVoltarLogin = document.getElementById('btn-voltar-login');
    const recuperarForm = document.getElementById('recuperar-form');
    const recuperarEmailStep = document.getElementById('recuperar-email-step');
    const recuperarCodigoStep = document.getElementById('recuperar-codigo-step');

    const btnEnviarCodigo = document.getElementById('btn-enviar-codigo');
    const btnSalvarNovaSenha = document.getElementById('btn-salvar-nova-senha');

    // Abre a tela de Esqueci a Senha
    btnEsqueciSenha.addEventListener('click', () => {
        authForm.style.display = 'none';
        authToggleText.style.display = 'none';
        recuperarForm.style.display = 'block';
        authTitle.textContent = 'Recuperar Senha';
        subtitleTexto.textContent = 'Enviaremos um código para o seu e-mail.';
        authMensagem.textContent = '';
    });

    // Volta para o Login
    btnVoltarLogin.addEventListener('click', () => {
        recuperarForm.style.display = 'none';
        authForm.style.display = 'block';
        authToggleText.style.display = 'block';
        authTitle.textContent = 'Acesso Restrito';
        subtitleTexto.textContent = 'Identifique-se para acessar o sistema.';
        authMensagem.textContent = '';
        recuperarEmailStep.style.display = 'block';
        recuperarCodigoStep.style.display = 'none';
    });

    // Botão de Pedir o Código pro Carteiro
    btnEnviarCodigo.addEventListener('click', async () => {
        const emailRec = document.getElementById('recuperar-email').value.trim();
        if (!emailRec) return mostrarNotificacao('Por favor, digite o seu e-mail.', 'aviso');

        btnEnviarCodigo.textContent = 'Enviando...';
        try {
            const res = await fetch(`${API_URL}/esqueci-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailRec })
            });
            const data = await res.json();

            if (res.ok) {
                mostrarNotificacao(data.mensagem, 'sucesso');
                recuperarEmailStep.style.display = 'none';
                recuperarCodigoStep.style.display = 'block';
                subtitleTexto.textContent = 'Verifique sua caixa de entrada (e o Spam).';
                authMensagem.textContent = '';
            } else {
                authMensagem.textContent = data.erro;
                authMensagem.style.color = '#a04040';
            }
        } catch (err) {
            authMensagem.textContent = 'Erro de comunicação com o servidor.';
        } finally {
            btnEnviarCodigo.textContent = 'Receber Código';
        }
    });

    // Botão de Validar Código e Redefinir Senha
    btnSalvarNovaSenha.addEventListener('click', async () => {
        const emailRec = document.getElementById('recuperar-email').value.trim();
        const token = document.getElementById('recuperar-token').value.trim();
        const novaSenha = document.getElementById('recuperar-nova-senha').value.trim();
        const confirmNovaSenha = document.getElementById('recuperar-confirmar-senha').value.trim(); 

        if (!token || !novaSenha || !confirmNovaSenha) return mostrarNotificacao('Preencha todos os campos!!', 'aviso');

        if (novaSenha !== confirmNovaSenha) {
            return mostrarNotificacao('As senhas não coincidem!', 'erro');
        }

        btnSalvarNovaSenha.textContent = 'Validando...';
        try {
            const res = await fetch(`${API_URL}/resetar-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailRec, token, novaSenha })
            });
            const data = await res.json();

            if (res.ok) {
                mostrarNotificacao(data.mensagem, 'sucesso');
                btnVoltarLogin.click();
            } else {
                authMensagem.textContent = data.erro;
                authMensagem.style.color = '#a04040';
            }
        } catch (err) {
            authMensagem.textContent = 'Erro de comunicação com o servidor.';
        } finally {
            btnSalvarNovaSenha.textContent = 'Redefinir Senha';
        }
    });

    // ==========================================
    // SISTEMA DE LOGOUT (DESCONECTAR)
    // ==========================================
        if (btnSair) {
            btnSair.addEventListener('click', (e) => {
                e.preventDefault();

                sessionStorage.clear();

                token = null;
                usuarioLogadoId = null;
                nomeOperador = null;
                idPersonagemAtual = null;

                document.querySelectorAll('form').forEach(f => {
                    if (f.id !== 'auth-form' && f.id !== 'recuperar-form') f.reset();
                });


                const photoPreview = document.getElementById('char-photo-preview');
                if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";


                const appContainer = document.getElementById('app-container');
                const authContainer = document.getElementById('auth-container');

                if (appContainer) appContainer.style.display = 'none';
                if (authContainer) authContainer.style.display = 'block';

                if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao('Você foi desconectado com segurança.', 'aviso');
                }
            });
        }

    // ==========================================
    // SISTEMA DA FICHA E DETALHES 
    // ==========================================

    async function carregarPersonagem(id) {
        try {
            const resposta = await fetch(`${API_URL}/personagem/${id}`);
            const personagem = await resposta.json();

            if (!resposta.ok) {
                return mostrarNotificacao(personagem.erro || "Erro ao carregar a ficha.", 'erro');
            }


            document.getElementById('nome').value = personagem.nome_personagem || '';
            document.getElementById('ocupacao').value = personagem.ocupacao || '';

            const ficha = personagem.dados_ficha || {};

            preencherFicha(ficha);

            idPersonagemAtual = id;
            sessionStorage.setItem('personagemAtivoId', id);

            if(typeof window.atualizarPreviewAnotacoes === 'function') {
            window.atualizarPreviewAnotacoes();
        }


        } catch (err) {
            console.error("Erro ao carregar personagem:", err);
            mostrarNotificacao("Erro de conexão ao carregar a ficha.", 'erro');
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

                    const img = new Image();
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
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
                        
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/webp', 0.95);
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

            const gridPersonagens = document.getElementById('grid-personagens');
            if (gridPersonagens) gridPersonagens.innerHTML = '';
            
            const charSelectCampanha = document.getElementById('char-select-campanha');
            if (charSelectCampanha) {
                charSelectCampanha.innerHTML = '<option value="">-- Selecione seu Personagem --</option>';
            }

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
                    modalGaleria.classList.remove('show');
                });
                gridPersonagens.appendChild(cardNovo);
            }

            personagensCarregados.forEach(char => {
                if (charSelectCampanha) {
                    const option = document.createElement('option');
                    option.value = char.id;
                    option.textContent = char.nome_personagem || 'Sem Nome';
                    charSelectCampanha.appendChild(option);
                }
                if (gridPersonagens) {
                    const fotoBase64 = char.foto;
                    const ocupacao = char.ocupacao || 'Desconhecido';

                    const placeholderInterno = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='130'%3E%3Crect width='110' height='130' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' font-size='40' fill='%23555' dominant-baseline='middle' text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E";
                    const imgSrc = (fotoBase64 && !fotoBase64.includes('R0lGODlhAQAB')) ? fotoBase64 : placeholderInterno;

                    const card = document.createElement('div');
                    card.className = 'char-card';
                    card.dataset.nome = (char.nome_personagem || 'sem nome').toLowerCase();

                    card.innerHTML = `
                        <img src="${imgSrc}" class="char-card-img" alt="Foto">
                        <div class="char-card-info">
                            <h3 class="char-card-nome" style="margin: 0 0 5px 0; line-height: normal; font-size: 1.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">
                                ${escaparHTML(char.nome_personagem) || 'Sem Nome'}
                            </h3>
                            <p class="char-card-detalhe">${escaparHTML(ocupacao)}</p>
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
    async function salvarFicha(silencioso = false) {
        if (!usuarioLogadoId) return;

        const dadosFicha = coletarDadosFicha();
        const nomePersonagem = nomeInput.value || 'Assimilado';
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
                    mostrarNotificacao(resultado.mensagem, 'sucesso');
                    await carregarListaPersonagens();
                } else {
                    console.log("Autosave concluído com sucesso!");
                    btnSave.textContent = 'Salvo!';
                    setTimeout(() => btnSave.textContent = 'SALVAR', 2000);
                }
            } else {
                if (!silencioso) mostrarNotificacao("Servidor diz: " + (resultado.erro || "Erro desconhecido."), 'erro');
            }
        } catch (erro) {
            console.error("❌ Erro no Front-end ao tentar enviar:", erro);
            if (!silencioso) mostrarNotificacao("Erro de comunicação com o servidor!", 'erro');
        } finally {
            if (!silencioso) btnSave.textContent = 'SALVAR';
        }
    }

    btnSave.addEventListener('click', () => salvarFicha(false));

    // BOTÃO DELETAR
    btnDelete.addEventListener('click', async () => {
        if (!idPersonagemAtual) return mostrarNotificacao('Selecione um personagem para excluir.', 'aviso');

        const confirmacao = confirm('Tem certeza que deseja apagar esta ficha permanentemente?');
        if (!confirmacao) return;

        try {
            await fetch(`${API_URL}/personagens/${idPersonagemAtual}`, { method: 'DELETE' });
            mostrarNotificacao('Ficha deletada com sucesso.', 'sucesso');

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
    // CONTROLE DE TEMA (DARK MODE) 
    // ==========================================
    const btnToggleTemaApp = document.getElementById('btn-toggle-tema'); 
    const btnToggleTemaAuth = document.getElementById('auth-theme-toggle'); 
    const corpoDoSite = document.body;

    function atualizarBotoesTema(isDark) {
        const iconHtml = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // Atualiza o botão interno (do menu)
        if (btnToggleTemaApp) {
            btnToggleTemaApp.innerHTML = iconHtml;
        }
        
        // Atualiza o botão externo (do login)
        if (btnToggleTemaAuth) {
            btnToggleTemaAuth.innerHTML = iconHtml;
        }
    }

    function alternarTema(e) {
        if(e) e.preventDefault();
        corpoDoSite.classList.toggle('dark');
        const isDark = corpoDoSite.classList.contains('dark');
        
        localStorage.setItem('tema-rpg-assimilacao', isDark ? 'dark' : 'light');
        
        atualizarBotoesTema(isDark);

        document.querySelectorAll('#rolador-historico img, #rolador-resultados-atuais img').forEach(img => {
            if (img.src.includes('icon.jpg')) return; 

            if (isDark) {
                if (!img.src.includes('-branco.png')) {
                    img.src = img.src.replace('.png', '-branco.png');
                }
            } else {
                img.src = img.src.replace('-branco.png', '.png');
            }
        });
    }

    if (btnToggleTemaApp) btnToggleTemaApp.addEventListener('click', alternarTema);
    if (btnToggleTemaAuth) btnToggleTemaAuth.addEventListener('click', alternarTema);


    const temaSalvo = localStorage.getItem('tema-rpg-assimilacao');

    if (temaSalvo === 'dark') {
        corpoDoSite.classList.add('dark');
        atualizarBotoesTema(true);
    } else {
        atualizarBotoesTema(false);
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
            if (!campanhaId) return mostrarNotificacao('Você não está em nenhuma mesa ativa!', 'erro');

            btnFichasMesa.textContent = "Buscando...";

            try {
                const resposta = await fetch(`${API_URL}/campanhas/${campanhaId}/fichas-mesa`);
                let fichas = await resposta.json();

                const meuId = sessionStorage.getItem('usuarioId');
                fichas = fichas.filter(char => char.usuario_id != meuId);

                gridPersonagensMesa.innerHTML = '';

                if (fichas.length === 0) {
                    gridPersonagensMesa.innerHTML = '<p style="color: var(--color-text-medium); padding: 20px;">Nenhum jogador criou ficha nesta mesa ainda.</p>';
                } else {
                    fichas.forEach(char => {
                        const card = document.createElement('div');
                        card.className = 'char-card';

                        card.innerHTML = `
                            <img src="${char.foto || './assets/icon.jpg'}" class="char-card-img" alt="Foto">
                            <div class="char-card-info" style="display: flex; flex-direction: column; justify-content: flex-start; padding: 10px; overflow: visible;">
                                
                                <div class="nome-container" style="display: block; width: 100%; margin-bottom: 5px;">
                                    <h3 class="char-card-nome" style="margin: 0; line-height: 1.2; font-size: 1.1em; word-wrap: break-word; white-space: normal; overflow: visible; color: white;">
                                        ${escaparHTML(char.nome_personagem) || 'Sem Nome'}
                                    </h3>
                                </div>

                                <p class="char-card-detalhe" style="color: #ff9800; font-weight: bold; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">👤 Jogador: ${escaparHTML(char.nome_conta)}</p>
                                <p class="char-card-detalhe" style="margin: 2px 0 10px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">Ocupação: ${escaparHTML(char.ocupacao) || 'Nenhuma'}</p>
                                <button class="btn-acessar-ficha mt-2" data-id="${char.id}" style="margin-top: auto;">Inspecionar</button>
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
                            mostrarNotificacao('Ficha do jogador carregada na tela!', 'aviso');
                        });
                    });
                }

                modalGaleria.classList.add('show');

            } catch (erro) {
                console.error(erro);
                mostrarNotificacao("Erro ao buscar as fichas da mesa.", 'erro');
            } finally {
                btnFichasMesa.textContent = "👑 Fichas da Mesa";
            }
        });
    }

    // ==========================================
    // PODERES DO MESTRE: GERENCIAR JOGADORES 
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
            if (!campanhaId) return mostrarNotificacao('Você não está em nenhuma mesa ativa!', 'aviso');

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

                        const meuId = sessionStorage.getItem('usuarioId');
                        const isEsteOMestre = jog.usuario_id == meuId;


                        const controleHtml = isEsteOMestre 
                            ? `<span style="color: #ff9800; font-weight: bold; font-size: 1.1em;">👑 Mestre</span>`
                            : `<button class="btn-remover-jogador" data-usuario="${jog.usuario_id}">Remover</button>`;

                        card.innerHTML = `
                            <div>
                                <h4 style="margin-bottom: 5px;">${nomeConta}</h4>
                                <p style="color: #888; font-size: 0.8em; margin-top: 0; margin-bottom: 25px;">👤 ${nomeChar}</p>
                            </div>
                            ${controleHtml}
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
                                        mostrarNotificacao("Erro ao remover jogador.", 'erro');
                                    }
                                } catch (err) {
                                    mostrarNotificacao("Erro de conexão.", 'erro');
                                }
                            }
                        });
                    });
                }

                modalGerenciarJogadores.classList.add('show');
            } catch (erro) {
                console.error(erro);
                mostrarNotificacao("Erro ao buscar jogadores.", 'erro');
            } finally {
                btnGerenciarJogadores.innerHTML = "👥 Jogadores";
            }
        });
    }

    // ==========================================
    // SISTEMA DE AUTOSAVE 
    // ==========================================
    let timeoutAutosave;

    function agendarAutosave() {

        if (!idPersonagemAtual) return;

        clearTimeout(timeoutAutosave);

        timeoutAutosave = setTimeout(() => {
            salvarFicha(true);
        }, 2000);
    }

    const todosInputs = document.querySelectorAll('#app-container input, #app-container textarea');

    todosInputs.forEach(el => {
        if (el.type === 'file' || el.id === 'char-select' || el.id === 'busca-personagem') return;

        el.addEventListener('input', agendarAutosave);
        el.addEventListener('change', agendarAutosave);
    });

    // ==========================================
    // SISTEMA DE REVELAR SENHAS (OLHINHO)
    // ==========================================
    function configurarOlhinho(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        
        if (input && icon) {
            icon.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash'); 
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
    }

    configurarOlhinho('auth-password', 'toggle-auth-password');
    configurarOlhinho('auth-confirm-password', 'toggle-auth-confirm');
    configurarOlhinho('recuperar-nova-senha', 'toggle-recuperar-senha');
    configurarOlhinho('recuperar-confirmar-senha', 'toggle-recuperar-confirmar');

    
    
   // ==========================================
    // SISTEMA DE CARACTERÍSTICAS DINÂMICAS 
    // ==========================================
    window.contadorCarac = 0;
    
    window.adicionarCaracteristicaDOM = function() {
        window.contadorCarac++;
        const indice = window.contadorCarac;
        const container = document.getElementById('caracteristicas-container');
        if(!container) return;

        const bloco = document.createElement('div');

        bloco.className = 'carac-item flex flex-col w-full mb-2 bg-white dark:bg-[#2a2a2a] p-3 rounded-md shadow-inner border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-rpg-blue transition-all';
        bloco.innerHTML = `
            <div class="flex justify-between items-center mb-2 border-b-2 border-[#6b2c2c] pb-1">
                <input type="text" id="carac-nome-${indice}" placeholder="Nome da Característica" class="w-full font-bold p-1 bg-transparent text-black dark:text-white text-base outline-none">
                
                <button type="button" class="btn-remover-carac ml-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow-sm border-none">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <textarea id="carac-desc-${indice}" rows="2" placeholder="Descrição..." class="w-full p-1 bg-transparent text-black dark:text-gray-300 outline-none resize-y text-sm"></textarea>
        `;
        container.appendChild(bloco);

        if (typeof agendarAutosave === 'function') {
            bloco.querySelector('input').addEventListener('input', agendarAutosave);
            bloco.querySelector('textarea').addEventListener('input', agendarAutosave);
        }
    };

    document.body.addEventListener('click', function(event) {
        
        if (event.target.id === 'btn-add-carac') {
            event.preventDefault(); 
            window.adicionarCaracteristicaDOM();
        }

        if (event.target.closest('.btn-remover-carac')) {
            event.preventDefault();
            const blocoParaRemover = event.target.closest('.carac-item');
            if (blocoParaRemover) {
                blocoParaRemover.remove();
                if (typeof agendarAutosave === 'function') agendarAutosave(); 
            }
        }
    });

    setTimeout(() => {
        const caracContainer = document.getElementById('caracteristicas-container');
        if (caracContainer && caracContainer.children.length === 0) {
            for(let i = 0; i < 6; i++) window.adicionarCaracteristicaDOM();
        }
    }, 500);

    // ==========================================
    // SISTEMA DE ANOTAÇÕES EM MODAL (PREVIEW)
    // ==========================================
    const anotacoesPreview = document.getElementById('anotacoes-preview');
    const anotacoesTextoPreview = document.getElementById('anotacoes-texto-preview');
    const modalAnotacoes = document.getElementById('anotacoes-modal');
    const btnFecharAnotacoes = document.getElementById('fechar-anotacoes');
    const textareaAnotacoes = document.getElementById('anotacoes');

    window.atualizarPreviewAnotacoes = function() {
        if (!anotacoesTextoPreview || !textareaAnotacoes) return;
        const texto = textareaAnotacoes.value.trim();
        
        if (texto === '') {
            anotacoesTextoPreview.innerHTML = '<span class="text-gray-400 dark:text-gray-500 italic font-bold">Clique aqui para escrever suas anotações...</span>';
        } else {
            const divSegura = document.createElement('div');
            divSegura.textContent = texto;
            anotacoesTextoPreview.innerHTML = divSegura.innerHTML.replace(/\n/g, '<br>');
        }
    };

    if (anotacoesPreview) {
        anotacoesPreview.addEventListener('click', () => {
            modalAnotacoes.classList.add('show');
            textareaAnotacoes.focus();
        });
    }

    if (btnFecharAnotacoes) {
        btnFecharAnotacoes.addEventListener('click', () => {
            modalAnotacoes.classList.remove('show');
            window.atualizarPreviewAnotacoes();
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == modalAnotacoes) {
            modalAnotacoes.classList.remove('show');
            window.atualizarPreviewAnotacoes();
        }
    });

    if (textareaAnotacoes) {
        textareaAnotacoes.addEventListener('input', () => {
            window.atualizarPreviewAnotacoes();
            if (typeof agendarAutosave === 'function') agendarAutosave();
        });
    }
});