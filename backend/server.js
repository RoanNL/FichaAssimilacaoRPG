require('dotenv').config()

// bibliotecas
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');

const { pool, criarTabelas } = require('./database');

pool.query('SELECT NOW()', async (err, res) => {
    if (err) {
        console.error('❌ Erro ao conectar no PostgreSQL:', err);
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        criarTabelas(); 
    }
});

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;
const SEGREDO_JWT = process.env.SEGREDO_JWT

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// =========================================================================
// 🛡️ MIDDLEWARE ANTI-NAVEGADOR (BLOQUEIA ACESSO DIRETO PELA URL)
// =========================================================================
app.use((req, res, next) => {
    const pediuPeloNavegador = req.headers.accept && req.headers.accept.includes('text/html');
    
    if (pediuPeloNavegador) {
        return res.status(403).send(`
            <body style="background-color: #121212; color: #ff9800; font-family: 'Courier New', monospace; text-align: center; padding-top: 20vh;">
                <h1 style="font-size: 3rem; color: #8c3a3a;">🛡️ FICHA BLINDADA 🛡️</h1>
                <p style="font-size: 1.2rem; color: #a97b53;">Acesso direto à matriz de dados foi bloqueado pelo Mestre.</p>
                <p style="font-size: 1rem; color: #666;">Por favor, retorne à interface principal do jogo, SEU SAFADO!!!!!</p>
            </body>
        `);
    }
    next();
});

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('☁️ Conectado ao Supabase Storage!');
} else {
    console.log('⚠️ Chaves do Supabase não encontradas no .env. O upload de imagens será ignorado.');
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});
app.set('io', io);

// Regex global para validar formato UUID
const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

io.on('connection', (socket) => {
    console.log('Um jogador conectou! ID:', socket.id);

    // 🛡️ A CATRACA VIP E O HISTÓRICO LIGADO
    socket.on('entrar-na-campanha', async (dados) => {
        const { campanhaId, token } = dados; 
        
        if (!token || !campanhaId) return;

        try {
            const segredo = process.env.SEGREDO_JWT || 'segredo_super_secreto_rpg';
            const usuarioVerificado = jwt.verify(token, segredo);
            const usuarioIdSeguro = usuarioVerificado.id; 

            const salaStr = campanhaId.toString(); 
            const sql = `SELECT * FROM membros_campanha WHERE campanha_id = $1 AND usuario_id = $2`;
            const resultado = await pool.query(sql, [campanhaId, usuarioIdSeguro]);

            if (resultado.rows.length > 0) {
                socket.join(salaStr); 
                console.log(`✅ Catraca VIP: Usuário ${usuarioIdSeguro} acessou a mesa ${salaStr}`);

                const sqlHist = `SELECT pacote FROM historico_rolagens WHERE campanha_id = $1 ORDER BY id ASC LIMIT 30`;
                const histResult = await pool.query(sqlHist, [campanhaId]);
                
                const rolagensAntigas = histResult.rows.map(row => row.pacote);
                socket.emit('carregar-historico', rolagensAntigas);
            } else {
                console.log(`🚨 BARRADO: Invasor bloqueado na mesa ${salaStr}!`);
            }
        } catch (err) {
            console.error('❌ Erro na catraca (Token Inválido ou Forjado)');
        }
    });

    // 🛡️ O ESCUDO DA ROLAGEM E SALVAMENTO
    socket.on('rolar-dados', async (pacoteDeDados) => {
        const { token, ...dadosDaRolagem } = pacoteDeDados;
        if (!token) return;

        try {
            const segredo = process.env.SEGREDO_JWT || 'segredo_super_secreto_rpg';
            const usuarioVerificado = jwt.verify(token, segredo);
            const usuarioIdSeguro = usuarioVerificado.id;

            const campanhaId = dadosDaRolagem.campanhaId;
            const sqlCheck = `SELECT * FROM membros_campanha WHERE campanha_id = $1 AND usuario_id = $2`;
            const resultCheck = await pool.query(sqlCheck, [campanhaId, usuarioIdSeguro]);

            if (resultCheck.rows.length === 0) {
                console.log(`🚨 HACKER BARRADO: Usuário ${usuarioIdSeguro} tentou rolar dado em mesa alheia!`);
                return; 
            }

            dadosDaRolagem.usuarioId = usuarioIdSeguro;
            const salaStr = campanhaId.toString(); 
            socket.to(salaStr).emit('nova-rolagem', dadosDaRolagem);
            
            // REMOVIDO: O parseInt(campanhaId, 10). UUID é string!
            await pool.query(
                `INSERT INTO historico_rolagens (campanha_id, pacote) VALUES ($1, $2)`, 
                [campanhaId, dadosDaRolagem] 
            );
        } catch (err) {
            console.error("❌ Tentativa de forjar rolagem bloqueada.");
        }
    });
});

// =========================================================================
// 🛡️ MIDDLEWARE DE SEGURANÇA: VALIDAÇÃO DE TOKEN 
// =========================================================================
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const segredo = process.env.SEGREDO_JWT || 'segredo_super_secreto_rpg';
        const usuarioVerificado = jwt.verify(token, segredo); 
        req.usuario = usuarioVerificado; 
        next(); 
    } catch (err) {
        return res.status(403).json({ erro: 'Token inválido, expirado ou forjado.' });
    }
}

app.get('/', (req, res) => {
    res.json({ mensagem: 'Servidor online e blindado!' });
});

function gerarCodigoConvite() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// =========================================================================
// ROTA DE REGISTRO 
// =========================================================================
app.post('/registro', async (req, res) => {
    const username = req.body.username || req.body.usuario || req.body.nome || req.body.login;
    const password = req.body.password || req.body.senha;
    const email = req.body.email; 

    const usernameLowerCase = username ? username.toLowerCase() : '';

    if (!usernameLowerCase || !password || !email) {
        return res.status(400).json({ erro: 'Usuário, e-mail e senha são obrigatórios.' });
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        console.warn(`🚨 HACKER BARRADO: Tentativa de injeção no E-mail detectada: ${email}`);
        return res.status(400).json({ erro: 'Formato de e-mail inválido ou contendo código malicioso.' });
    }

    const regexUsername = /^[a-zA-Z0-9_.-]+$/;
    if (!regexUsername.test(usernameLowerCase)) {
        console.warn(`🚨 HACKER BARRADO: Tentativa de injeção no Nome detectada: ${usernameLowerCase}`);
        return res.status(400).json({ erro: 'O nome de usuário deve conter apenas letras, números, _ ou -' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        const sql = `INSERT INTO usuarios (username, password, email) VALUES ($1, $2, $3) RETURNING id`;
        const resultado = await pool.query(sql, [usernameLowerCase, senhaHash, email]);
        
        const novoUsuarioId = resultado.rows[0].id;

        const segredo = process.env.SEGREDO_JWT || 'segredo_super_secreto_rpg';
        const token = jwt.sign({ id: novoUsuarioId, nome: username }, segredo, { expiresIn: '7d' });

        res.status(201).json({
            mensagem: 'Usuário registrado com sucesso!',
            usuario: { id: novoUsuarioId, nome: username },
            token: token 
        });
    } catch (erro) {
        if (erro.code === '23505') {
            if (erro.constraint && erro.constraint.includes('email')) {
                return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
            }
            return res.status(400).json({ erro: 'Nome de usuário já está em uso.' });
        }
        console.error('❌ Erro no registro:', erro);
        res.status(500).json({ erro: 'Erro interno ao registrar usuário.' });
    }
});

// =========================================================================
// ROTA DE LOGIN
// =========================================================================
app.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password || req.body.senha;

    const emailLowerCase = email ? email.toLowerCase() : '';

    if (!emailLowerCase || !password) {
        return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    try {
        const sql = `SELECT id, username, password, email, avatar FROM usuarios WHERE email = $1`;
        const resultado = await pool.query(sql, [emailLowerCase]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const usuarioDb = resultado.rows[0];
        const senhaValida = await bcrypt.compare(password, usuarioDb.password);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const segredo = process.env.SEGREDO_JWT || 'segredo_super_secreto_rpg';
        const token = jwt.sign({ id: usuarioDb.id, nome: usuarioDb.username }, segredo, { expiresIn: '7d' });

        res.json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuarioDb.id,
                nome: usuarioDb.username,
                avatar: usuarioDb.avatar,
                email: usuarioDb.email
            },
            token: token 
        });
    } catch (erro) {
        console.error('❌ Erro no login:', erro);
        res.status(500).json({ erro: 'Erro interno ao realizar login.' });
    }
});

// =========================================================================
// ROTA 1: PEDIR CÓDIGO DE RECUPERAÇÃO 
// =========================================================================
app.post('/esqueci-senha', async (req, res) => {
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ erro: 'Forneça o seu e-mail cadastrado.' });

    try {
        const result = await pool.query('SELECT id, username FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'E-mail não encontrado nos registros da Taverna.' });
        }

        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 15 * 60 * 1000; 

        await pool.query('UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE email = $3', [token, expires, email]);

        const brevoApiKey = process.env.BREVO_API_KEY;
        const remetenteEmail = process.env.EMAIL_USUARIO; 

        if (!brevoApiKey) {
            console.error("⚠️ Chave do Brevo não encontrada no .env!");
            return res.status(500).json({ erro: 'Servidor de e-mail não configurado.' });
        }

        const emailData = {
            sender: { name: "Ficha Assimilação RPG", email: remetenteEmail },
            to: [{ email: email }],
            subject: "🔑 Seu Código de Recuperação de Senha",
            htmlContent: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f1ea; padding: 20px; text-align: center; border-radius: 8px;">
                    <h2 style="color: #8c3a3a;">Ficha Assimilação RPG</h2>
                    <p style="font-size: 16px; color: #333;">Olá <strong>${result.rows[0].username}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">Você solicitou a recuperação da sua senha. Use o código abaixo:</p>
                    <div style="background-color: #3a7c8c; color: white; font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 15px; border-radius: 5px; margin: 20px auto; max-width: 200px;">
                        ${token}
                    </div>
                    <p style="color: #d9534f; font-weight: bold;">⚠️ Este código expira em 15 minutos.</p>
                </div>
            `
        };

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const erroBrevo = await response.json();
            console.error("❌ O Brevo recusou a entrega:", erroBrevo);
            throw new Error('Falha na API do Brevo');
        }

        console.log(`🚀 E-mail de recuperação enviado VIA API para: ${email}`);
        res.json({ mensagem: 'Um código de 6 dígitos foi enviado para o seu e-mail!' });

    } catch (err) {
        console.error("❌ Erro na recuperação de senha:", err);
        res.status(500).json({ erro: 'Erro no servidor ao tentar enviar o e-mail.' });
    }
});

// =========================================================================
// ROTA 2: VALIDAR CÓDIGO E TROCAR A SENHA
// =========================================================================
app.post('/resetar-senha', async (req, res) => {
    const { email, token, novaSenha } = req.body;

    if (!email || !token || !novaSenha) {
        return res.status(400).json({ erro: 'Preencha todos os campos corretamente.' });
    }

    try {
        const result = await pool.query('SELECT id, reset_token_expires FROM usuarios WHERE email = $1 AND reset_token = $2', [email, token]);

        if (result.rows.length === 0) {
            return res.status(400).json({ erro: 'Código de recuperação inválido ou incorreto.' });
        }

        if (Date.now() > result.rows[0].reset_token_expires) {
            return res.status(400).json({ erro: 'Este código já expirou! Solicite um novo.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);

        await pool.query('UPDATE usuarios SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2', [senhaHash, email]);

        res.json({ mensagem: 'Senha redefinida com sucesso! Você já pode fazer login.' });
    } catch (err) {
        console.error("❌ Erro ao resetar senha:", err);
        res.status(500).json({ erro: 'Erro interno ao redefinir a senha.' });
    }
});

// =========================================================================
// ROTA PARA ATUALIZAR E BUSCAR O AVATAR DO USUÁRIO
// =========================================================================
app.post('/usuarios/avatar', verificarToken, async (req, res) => {
    let foto = req.body.foto;
    const usuarioId = req.usuario.id;

    if (!foto) return res.status(400).json({ erro: 'Nenhuma foto enviada.' });

    // Se for base64, sobe para o Supabase usando o mesmo bucket das fichas
    if (supabase && foto.startsWith('data:image')) {
        try {
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const extensao = foto.substring(foto.indexOf('/') + 1, foto.indexOf(';base64'));
            const nomeArquivo = `avatar_${usuarioId}_${Date.now()}.${extensao}`;

            const { data, error } = await supabase.storage
                .from('ficha-fotos') 
                .upload(nomeArquivo, buffer, {
                    contentType: `image/${extensao}`,
                    upsert: true
                });

            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('ficha-fotos').getPublicUrl(nomeArquivo);
            foto = publicUrlData.publicUrl; 
        } catch (err) {
            console.error("Erro no Supabase ao subir avatar:", err);
            return res.status(500).json({ erro: 'Erro ao hospedar a imagem.' });
        }
    }

    try {
        await pool.query(`UPDATE usuarios SET avatar = $1 WHERE id = $2`, [foto, usuarioId]);
        res.json({ mensagem: 'Avatar atualizado!', avatar: foto });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar avatar no banco.' });
    }
});

app.get('/usuarios/me', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT avatar FROM usuarios WHERE id = $1', [req.usuario.id]);
        res.json(result.rows[0]);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar dados do usuário.' });
    }
});

// =========================================================================
// SALVAR OU ATUALIZAR FICHA 
// =========================================================================
app.post('/personagens', verificarToken, async (req, res) => {
    const usuarioIdSeguro = req.usuario.id; 
    
    const personagemId = req.body.personagemId || req.body.id;
    const nome = req.body.nome || req.body.nome_personagem || 'Desconhecido';
    const ocupacao = req.body.ocupacao || '';
    const dadosFicha = req.body.dadosFicha || req.body.dados_ficha || req.body.dados_personagem || {};
    let foto = req.body.foto || null; 

    const regexSeguro = /^[^<>{}\[\]=;]*$/;

    function validarTexto(texto, limite) {
        if (!texto) return true; 
        if (typeof texto !== 'string') return false; 
        if (texto.length > limite) return false; 
        return regexSeguro.test(texto); 
    }

    if (
        !validarTexto(nome, 50) ||
        !validarTexto(ocupacao, 50) ||
        (dadosFicha && (
            !validarTexto(dadosFicha['evento'], 80) ||
            !validarTexto(dadosFicha['geracao'], 30) ||
            !validarTexto(dadosFicha['proposito-pessoal'], 100) ||
            !validarTexto(dadosFicha['proposito-coletivo'], 100)
        ))
    ) {
        console.warn(`⚠️ Tentativa de injeção de código ou limite excedido pelo Usuário ID: ${usuarioIdSeguro}`);
        return res.status(400).json({ 
            erro: "Texto inválido! O texto excedeu o limite ou contém caracteres proibidos de código (< > { } [ ] = ;)." 
        });
    }

    if (supabase && foto && foto.startsWith('data:image')) {
        try {
            console.log("☁️ Subindo nova imagem para o Supabase...");
            
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const extensao = foto.substring(foto.indexOf('/') + 1, foto.indexOf(';base64'));
            
            const nomeArquivo = `ficha_${usuarioIdSeguro}_${Date.now()}.${extensao}`;

            const { data, error } = await supabase.storage
                .from('ficha-fotos') 
                .upload(nomeArquivo, buffer, {
                    contentType: `image/${extensao}`,
                    upsert: true
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('ficha-fotos')
                .getPublicUrl(nomeArquivo);

            foto = publicUrlData.publicUrl; 
            console.log("✅ Imagem hospedada com sucesso:", foto);

        } catch (err) {
            console.error("❌ Erro ao enviar imagem pro Supabase:", err);
        }
    }

    const fichaParaOBanco = JSON.stringify(dadosFicha);
    const isUpdate = personagemId && personagemId !== 'null' && personagemId !== '';

    try {
        if (isUpdate) {
            const sql = `UPDATE personagens SET nome_personagem = $1, ocupacao = $2, dados_ficha = $3, foto = $4 WHERE id = $5 AND usuario_id = $6 RETURNING id`;
            const result = await pool.query(sql, [nome, ocupacao, fichaParaOBanco, foto, personagemId, usuarioIdSeguro]);
            
            if (result.rowCount === 0) {
                return res.status(403).json({ erro: 'Tentativa de invasão detectada. Você não é o dono desta ficha.' });
            }
            res.json({ mensagem: 'Ficha atualizada com sucesso!', id: personagemId });
        } else {
            const sql = `INSERT INTO personagens (usuario_id, nome_personagem, ocupacao, dados_ficha, foto) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            const resultado = await pool.query(sql, [usuarioIdSeguro, nome, ocupacao, fichaParaOBanco, foto]);
            res.json({ mensagem: 'Nova ficha salva no banco com sucesso!', id: resultado.rows[0].id });
        }
    } catch (erro) {
        console.error('❌ Erro SQL ao salvar:', erro);
        res.status(500).json({ erro: 'Erro interno do banco de dados.' });
    }
});

// =========================================================================
// LISTAR TODAS AS FICHAS DO USUÁRIO
// =========================================================================
app.get('/personagens/usuario/:usuarioId', verificarToken, async (req, res) => {
    const { usuarioId } = req.params;
    const usuarioSeguroId = req.usuario.id; 

    if (usuarioSeguroId !== usuarioId) {
        return res.status(403).json({ erro: 'Tentativa de ler personagens de outro jogador bloqueada.' });
    }

    try {
        const sql = `SELECT id, nome_personagem, ocupacao, foto FROM personagens WHERE usuario_id = $1 ORDER BY created_at DESC`;
        const resultado = await pool.query(sql, [usuarioSeguroId]);
        res.json(resultado.rows);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar personagens.' });
    }
});

// =========================================================================
// CARREGAR UMA FICHA ESPECÍFICA 
// =========================================================================
app.get('/personagem/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    
    // Escudo Anti-Batata: Verifica se a URL contém um UUID válido
    if (!regexUUID.test(id)) {
        return res.status(400).json({ erro: 'Formato de ID de personagem inválido.' });
    }

    try {
        const sql = `SELECT * FROM personagens WHERE id = $1`;
        const resultado = await pool.query(sql, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Personagem não encontrado.' });
        }

        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error('❌ Erro ao carregar ficha:', erro);
        res.status(500).json({ erro: 'Erro ao buscar dados do personagem.' });
    }
});

// =========================================================================
// EXCLUIR UM PERSONAGEM 
// =========================================================================
app.delete('/personagens/:id', verificarToken, async (req, res) => {
    const id = req.params.id;

    if (!regexUUID.test(id)) {
        return res.status(400).json({ erro: 'Formato de ID de personagem inválido.' });
    }
    
    try {
        const result = await pool.query('DELETE FROM personagens WHERE id = $1 AND usuario_id = $2 RETURNING id', [id, req.usuario.id]);
        
        if (result.rowCount === 0) {
            return res.status(403).json({ erro: 'Acesso negado. Ficha não pertence a você.' });
        }
        res.status(200).json({ mensagem: 'Personagem excluído.' });
    } catch (erro) {
        console.error('❌ Erro ao deletar ficha:', erro);
        res.status(500).json({ erro: 'Erro ao deletar ficha.' });
    }
});

// ==========================================
// ROTAS DE CAMPANHA
// ==========================================

app.post('/campanhas', verificarToken, async (req, res) => {
    const { nome } = req.body;
    const mestre_id = req.usuario.id; 
    const codigo = gerarCodigoConvite();

    try {
        const sqlCampanha = `INSERT INTO campanhas (nome, codigo_convite, mestre_id) VALUES ($1, $2, $3) RETURNING id`;
        const resultCampanha = await pool.query(sqlCampanha, [nome, codigo, mestre_id]);

        const campanha_id = resultCampanha.rows[0].id;

        const sqlMembro = `INSERT INTO membros_campanha (campanha_id, usuario_id) VALUES ($1, $2)`;
        await pool.query(sqlMembro, [campanha_id, mestre_id]);

        res.json({ mensagem: 'Campanha criada!', id: campanha_id, codigo: codigo });
    } catch (erro) {
        console.error("Erro ao criar campanha:", erro);
        res.status(500).json({ erro: 'Erro ao criar campanha.' });
    }
});

app.post('/campanhas/entrar', verificarToken, async (req, res) => {
    const { codigo_convite, personagem_id } = req.body;
    const usuarioIdSeguro = req.usuario.id; 

    try {
        const sqlBusca = `SELECT id FROM campanhas WHERE codigo_convite = $1`;
        const resultBusca = await pool.query(sqlBusca, [codigo_convite]);

        if (resultBusca.rows.length === 0) {
            return res.status(404).json({ erro: 'Código de convite inválido ou não encontrado.' });
        }

        const campanhaId = resultBusca.rows[0].id;

        const sqlInsert = `INSERT INTO membros_campanha (campanha_id, usuario_id, personagem_id) VALUES ($1, $2, $3)`;
        await pool.query(sqlInsert, [campanhaId, usuarioIdSeguro, personagem_id]);

        res.json({ mensagem: 'Você entrou na campanha com sucesso!', campanha_id: campanhaId });
    } catch (erro) {
        res.status(400).json({ erro: 'Você já está nesta campanha ou ocorreu um erro.' });
    }
});

app.delete('/campanhas/:id/membros/:usuarioId', verificarToken, async (req, res) => {
    const campanhaId = req.params.id;
    const usuarioAlvoId = req.params.usuarioId;
    const mestreRequisitanteId = req.usuario.id; 

    if (!regexUUID.test(campanhaId) || !regexUUID.test(usuarioAlvoId)) {
        return res.status(400).json({ erro: 'ID com formato inválido.' });
    }

    try {
        const sqlCheck = `SELECT mestre_id FROM campanhas WHERE id = $1`;
        const resultCheck = await pool.query(sqlCheck, [campanhaId]);

        if (resultCheck.rows.length === 0) return res.status(404).json({ erro: 'Campanha não encontrada.' });

        if (resultCheck.rows[0].mestre_id !== mestreRequisitanteId) {
            return res.status(403).json({ erro: 'ALERTA: Somente o Mestre pode remover jogadores!' });
        }

        await pool.query('DELETE FROM membros_campanha WHERE campanha_id = $1 AND usuario_id = $2', [campanhaId, usuarioAlvoId]);
        res.status(200).json({ mensagem: 'Membro removido com sucesso.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao deletar membro.' });
    }
});

app.get('/campanhas/:id/personagens', verificarToken, async (req, res) => {
    const campanhaId = req.params.id;

    if (!regexUUID.test(campanhaId)) {
        return res.status(400).json({ erro: 'Formato de ID inválido.' });
    }

    try {
        const sql = `
            SELECT p.id, p.nome_personagem, p.dados_ficha as dados_personagem
            FROM membros_campanha m
            JOIN personagens p ON m.personagem_id = p.id
            WHERE m.campanha_id = $1
        `;
        const result = await pool.query(sql, [campanhaId]);

        const personagensFormatados = result.rows.map(row => {
            row.nome_jogador = "Membro da Mesa";
            return row;
        });

        res.json(personagensFormatados);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar personagens da mesa.' });
    }
});

// =========================================================================
// Buscar jogadores para o painel de Gerenciamento 
// =========================================================================
app.get('/campanhas/:id/jogadores', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.usuario_id, u.username, u.avatar, p.nome_personagem 
            FROM membros_campanha m
            JOIN usuarios u ON m.usuario_id = u.id
            LEFT JOIN personagens p ON p.id = m.personagem_id
            WHERE m.campanha_id = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (erro) {
        console.error("❌ Erro na Rota Jogadores:", erro);
        res.status(500).json({ erro: 'Erro ao buscar jogadores.' });
    }
});

app.get('/campanhas/usuario/:usuarioId', verificarToken, async (req, res) => {
    const { usuarioId } = req.params;

    if (req.usuario.id !== usuarioId) {
        return res.status(403).json({ erro: 'Tentativa de bisbilhotar campanhas alheias bloqueada!' });
    }

    try {
        const sql = `
            SELECT c.id, c.nome, c.codigo_convite, c.mestre_id, 
            (c.mestre_id::text = $1::text) as is_mestre
            FROM campanhas c
            JOIN membros_campanha m ON c.id = m.campanha_id
            WHERE m.usuario_id = $2
        `;
        const result = await pool.query(sql, [usuarioId, usuarioId]);
        res.json(result.rows);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar campanhas.' });
    }
});

// =========================================================================
// ROTA DO MESTRE: Ver todas as fichas da mesa 
// =========================================================================
app.get('/campanhas/:id/fichas-mesa', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.username as nome_conta, u.avatar 
            FROM personagens p
            JOIN membros_campanha m ON p.id = m.personagem_id
            JOIN usuarios u ON u.id = m.usuario_id
            WHERE m.campanha_id = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (erro) {
        console.error("❌ Erro na Rota Fichas Mesa:", erro);
        res.status(500).json({ erro: 'Erro ao buscar fichas da mesa.' });
    }
});

// =========================================================================
// ROTA DO MESTRE: Excluir Campanha (Destruir a Mesa)
// =========================================================================
app.delete('/campanhas/:id', verificarToken, async (req, res) => {
    const campanhaId = req.params.id;
    const mestreIdSeguro = req.usuario.id; 

    if (!regexUUID.test(campanhaId)) {
        return res.status(400).json({ erro: 'Formato de ID inválido.' });
    }

    try {
        const sqlCheck = `SELECT mestre_id FROM campanhas WHERE id = $1`;
        const resultCheck = await pool.query(sqlCheck, [campanhaId]);

        if (resultCheck.rows.length === 0) return res.status(404).json({ erro: 'Campanha não encontrada.' });
        
        if (resultCheck.rows[0].mestre_id !== mestreIdSeguro) {
            return res.status(403).json({ erro: 'ALERTA DE SEGURANÇA: Apenas o Mestre pode apagar esta mesa!' });
        }

        await pool.query(`DELETE FROM membros_campanha WHERE campanha_id = $1`, [campanhaId]);
        await pool.query(`DELETE FROM campanhas WHERE id = $1`, [campanhaId]);
        
        const io = req.app.get('io');
        if (io) io.to(campanhaId.toString()).emit('mesa-encerrada');

        res.json({ mensagem: 'A mesa foi destruída permanentemente!' });
    } catch (erro) {
        console.error('❌ Erro ao excluir campanha:', erro);
        res.status(500).json({ erro: 'Erro interno ao destruir a mesa.' });
    }
});

// =========================================================================
// ⛺ ROTAS DE GERENCIAMENTO DE REFÚGIOS
// =========================================================================

// 1. LISTAR REFÚGIOS DO USUÁRIO
app.get('/api/refugios', verificarToken, async (req, res) => {
    const usuarioIdSeguro = req.usuario.id;

    try {
        const sql = `SELECT * FROM refugios WHERE usuario_id = $1 ORDER BY criado_em DESC`;
        const result = await pool.query(sql, [usuarioIdSeguro]);
        
        // Formata os dados de snake_case (Banco) para camelCase (Frontend)
        const refugios = result.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            popAtual: row.pop_atual,
            popMax: row.pop_max,
            defesa: row.defesa,
            moral: row.moral,
            mobilidade: row.mobilidade,
            beligerancia: row.beligerancia,
            agua: row.agua,
            temFonteAgua: row.tem_fonte_agua,
            alimento: row.alimento,
            madeira: row.madeira
        }));

        res.json(refugios);
    } catch (erro) {
        console.error('❌ Erro ao buscar refúgios:', erro);
        res.status(500).json({ erro: 'Erro ao buscar refúgios na base de dados.' });
    }
});

// 2. SALVAR OU ATUALIZAR UM REFÚGIO
app.post('/api/refugios/salvar', verificarToken, async (req, res) => {
    const usuarioIdSeguro = req.usuario.id;
    const ref = req.body;

    // Se o ID for um UUID válido do Postgres, é um Update.
    // Se for um número temporário do frontend (ex: Date.now().toString()), é um Insert.
    const isUpdate = ref.id && regexUUID.test(ref.id);

    try {
        if (isUpdate) {
            const sql = `
                UPDATE refugios 
                SET nome = $1, pop_atual = $2, pop_max = $3, defesa = $4, moral = $5, mobilidade = $6, beligerancia = $7, agua = $8, tem_fonte_agua = $9, alimento = $10, madeira = $11, atualizado_em = now()
                WHERE id = $12 AND usuario_id = $13 RETURNING id
            `;
            const result = await pool.query(sql, [
                ref.nome, ref.popAtual, ref.popMax, ref.defesa, ref.moral, ref.mobilidade, ref.beligerancia, ref.agua, ref.temFonteAgua, ref.alimento, ref.madeira,
                ref.id, usuarioIdSeguro
            ]);

            if (result.rowCount === 0) {
                return res.status(403).json({ erro: 'Tentativa de invasão. Você não é dono deste refúgio.' });
            }
            res.json({ mensagem: 'Refúgio atualizado com sucesso!', id: ref.id });
            
        } else {
            const sql = `
                INSERT INTO refugios (usuario_id, nome, pop_atual, pop_max, defesa, moral, mobilidade, beligerancia, agua, tem_fonte_agua, alimento, madeira)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
            `;
            const result = await pool.query(sql, [
                usuarioIdSeguro, ref.nome, ref.popAtual, ref.popMax, ref.defesa, ref.moral, ref.mobilidade, ref.beligerancia, ref.agua, ref.temFonteAgua, ref.alimento, ref.madeira
            ]);
            
            // Retorna o UUID gerado pelo banco para o frontend substituir o ID temporário!
            res.json({ mensagem: 'Refúgio criado no banco com sucesso!', id: result.rows[0].id });
        }
    } catch (erro) {
        console.error('❌ Erro ao salvar refúgio:', erro);
        res.status(500).json({ erro: 'Erro interno ao salvar refúgio.' });
    }
});

// 3. EXCLUIR UM REFÚGIO
app.delete('/api/refugios/deletar/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    const usuarioIdSeguro = req.usuario.id;

    if (!regexUUID.test(id)) {
        return res.status(400).json({ erro: 'ID de refúgio inválido.' });
    }

    try {
        const result = await pool.query('DELETE FROM refugios WHERE id = $1 AND usuario_id = $2 RETURNING id', [id, usuarioIdSeguro]);
        
        if (result.rowCount === 0) {
            return res.status(403).json({ erro: 'Acesso negado. Refúgio não pertence a você.' });
        }
        res.status(200).json({ mensagem: 'Refúgio dizimado.' });
    } catch (erro) {
        console.error('❌ Erro ao deletar refúgio:', erro);
        res.status(500).json({ erro: 'Erro ao deletar refúgio.' });
    }
});

// =========================================================================
// ROTAS DA PARTITURA DO MESTRE (AUTOSAVE)
// =========================================================================
app.get('/campanhas/:id/partitura', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT dados_partitura FROM campanhas WHERE id = $1', [req.params.id]);
        res.json(result.rows[0] ? result.rows[0].dados_partitura : null);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar partitura da mesa.' });
    }
});

app.post('/campanhas/:id/partitura', verificarToken, async (req, res) => {
    try {
        const dados = req.body.dados;
        await pool.query('UPDATE campanhas SET dados_partitura = $1 WHERE id = $2', [dados, req.params.id]);
        res.json({ mensagem: 'Partitura salva em segurança!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar a partitura.' });
    }
});

server.listen(PORT, () => {
    console.log(`Servidor a correr na porta http://localhost:${PORT}`);
});