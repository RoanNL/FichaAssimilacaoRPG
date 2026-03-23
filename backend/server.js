require('dotenv').config()

// bibliotecas
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USUARIO,
        pass: process.env.EMAIL_SENHA
    }
});

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

io.on('connection', (socket) => {
    console.log('Um jogador conectou! ID:', socket.id);

    // 🛡️ A CATRACA VIP E O HISTÓRICO LIGADO
    socket.on('entrar-na-campanha', async (dados) => {
        const campanhaId = typeof dados === 'object' ? dados.campanhaId : dados;
        const usuarioId = typeof dados === 'object' ? dados.usuarioId : null;
        
        if (!usuarioId || !campanhaId) {
            console.log("⚠️ Alguém tentou entrar na mesa sem ID de usuário ou Campanha!");
            return; 
        }

        const salaStr = campanhaId.toString(); 

        try {
            const sql = `SELECT * FROM membros_campanha WHERE campanha_id = $1 AND usuario_id = $2`;
            const resultado = await pool.query(sql, [campanhaId, usuarioId]);

            if (resultado.rows.length > 0) {
                socket.join(salaStr); 
                console.log(`✅ Catraca VIP: Usuário ${usuarioId} acessou a mesa ${salaStr}`);

                const sqlHist = `SELECT pacote FROM historico_rolagens WHERE campanha_id = $1 ORDER BY id ASC LIMIT 30`;
                const histResult = await pool.query(sqlHist, [campanhaId]);
                
                const rolagensAntigas = histResult.rows.map(row => row.pacote);
                console.log(`📜 Enviando ${rolagensAntigas.length} rolagens do histórico para o usuário ${usuarioId}`);
                
                socket.emit('carregar-historico', rolagensAntigas);

            } else {
                console.log(`🚨 BARRADO: Usuário ${usuarioId} não faz parte da mesa ${salaStr}!`);
            }
        } catch (err) {
            console.error('❌ Erro na catraca VIP/Histórico:', err);
        }
    });

    // 🛡️ O ESCUDO DA ROLAGEM E SALVAMENTO
    socket.on('rolar-dados', async (pacoteDeDados) => {
        const salaStr = pacoteDeDados.campanhaId.toString(); 
        console.log(`🎲 Dados rolados na mesa ${salaStr} por ${pacoteDeDados.nome}`);
        
        socket.to(salaStr).emit('nova-rolagem', pacoteDeDados);
        
        try {
            const campanhaInt = parseInt(pacoteDeDados.campanhaId, 10);
            
            await pool.query(
                `INSERT INTO historico_rolagens (campanha_id, pacote) VALUES ($1, $2)`, 
                [campanhaInt, pacoteDeDados] 
            );
            console.log(`✅ Rolagem salva no banco com sucesso!`);
        } catch (err) {
            console.error("❌ Erro ao salvar histórico de rolagem no banco:", err);
        }
    });
});

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

    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);


        const sql = `INSERT INTO usuarios (username, password, email) VALUES ($1, $2, $3) RETURNING id`;
        const resultado = await pool.query(sql, [usernameLowerCase, senhaHash, email]);
        
        const novoUsuarioId = resultado.rows[0].id;

        const segredo = SEGREDO_JWT || 'segredo_super_secreto_rpg';
        const token = jwt.sign({ id: novoUsuarioId, nome: username }, segredo, { expiresIn: '7d' });

        res.status(201).json({
            mensagem: 'Usuário registrado com sucesso!',
            usuario: { id: novoUsuarioId, nome: username },
            token: token 
        });
    } catch (erro) {
        if (erro.code === '23505') {
            if (erro.constraint.includes('email')) {
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
    const username = req.body.username || req.body.usuario || req.body.nome || req.body.login;
    const password = req.body.password || req.body.senha;

    const usernameLowerCase = username ? username.toLowerCase() : '';

    if (!usernameLowerCase || !password) {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const sql = `SELECT id, username, password FROM usuarios WHERE username = $1`;
        const resultado = await pool.query(sql, [usernameLowerCase]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const usuarioDb = resultado.rows[0];

        const senhaValida = await bcrypt.compare(password, usuarioDb.password);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const segredo = SEGREDO_JWT || 'segredo_super_secreto_rpg';
        const token = jwt.sign({ id: usuarioDb.id, nome: usuarioDb.username }, segredo, { expiresIn: '7d' });

        res.json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuarioDb.id,
                nome: usuarioDb.username
            },
            token: token 
        });
    } catch (erro) {
        console.error('❌ Erro no login:', erro);
        res.status(500).json({ erro: 'Erro interno ao realizar login.' });
    }
});

// =========================================================================
// ROTA 1: PEDIR CÓDIGO DE RECUPERAÇÃO (ESQUECI A SENHA)
// =========================================================================
app.post('/esqueci-senha', async (req, res) => {
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ erro: 'Forneça o seu e-mail cadastrado.' });

    try {
        const result = await pool.query('SELECT id, username FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'E-mail não encontrado nos registros da ficha.' });
        }


        const token = crypto.randomInt(100000, 999999).toString(); 
        const expires = Date.now() + 15 * 60 * 1000; 

        await pool.query('UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE email = $3', [token, expires, email]);


        const mailOptions = {
            from: `"Ficha Assimilação RPG" <${process.env.EMAIL_USUARIO}>`,
            to: email,
            subject: '🔑 Seu Código de Recuperação de Senha',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f1ea; padding: 20px; text-align: center; border-radius: 8px;">
                    <h2 style="color: #8c3a3a;">Assimilação RPG</h2>
                    <p style="font-size: 16px; color: #333;">Olá <strong>${result.rows[0].username}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">Você solicitou a recuperação da sua senha. Use o código abaixo para criar uma nova senha:</p>
                    <div style="background-color: #3a7c8c; color: white; font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 15px; border-radius: 5px; margin: 20px auto; max-width: 200px;">
                        ${token}
                    </div>
                    <p style="color: #d9534f; font-weight: bold;">⚠️ Este código expira em 15 minutos.</p>
                    <p style="font-size: 12px; color: #777;">Se não foi você que pediu, apenas ignore este e-mail.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 E-mail de recuperação enviado para: ${email}`);
        
        res.json({ mensagem: 'Um código de 6 dígitos foi enviado para o seu e-mail!' });
    } catch (err) {
        console.error("❌ Erro ao enviar e-mail:", err);
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
// SALVAR OU ATUALIZAR FICHA 
// =========================================================================
app.post('/personagens', async (req, res) => {
    const usuarioId = req.body.usuarioId || req.body.usuario_id || req.body.utilizador_id;
    const personagemId = req.body.personagemId || req.body.id;
    const nome = req.body.nome || req.body.nome_personagem || 'Desconhecido';
    const ocupacao = req.body.ocupacao || '';
    const dadosFicha = req.body.dadosFicha || req.body.dados_ficha || req.body.dados_personagem || {};
    let foto = req.body.foto || null; 

    if (!usuarioId) {
        return res.status(400).json({ erro: 'Usuário não autenticado.' });
    }

    if (supabase && foto && foto.startsWith('data:image')) {
        try {
            console.log("☁️ Subindo nova imagem para o Supabase...");
            
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const extensao = foto.substring(foto.indexOf('/') + 1, foto.indexOf(';base64'));
            
            const nomeArquivo = `ficha_${usuarioId}_${Date.now()}.${extensao}`;

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
            // ATUALIZAR
            const sql = `UPDATE personagens SET nome_personagem = $1, ocupacao = $2, dados_ficha = $3, foto = $4 WHERE id = $5 AND usuario_id = $6`;
            await pool.query(sql, [nome, ocupacao, fichaParaOBanco, foto, personagemId, usuarioId]);
            res.json({ mensagem: 'Ficha atualizada com sucesso!', id: personagemId });
        } else {
            // CRIAR NOVO
            const sql = `INSERT INTO personagens (usuario_id, nome_personagem, ocupacao, dados_ficha, foto) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            const resultado = await pool.query(sql, [usuarioId, nome, ocupacao, fichaParaOBanco, foto]);
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
app.get('/personagens/usuario/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;

    if (usuarioId === 'undefined' || !usuarioId) {
        return res.json([]);
    }

    try {
        const sql = `SELECT id, nome_personagem, ocupacao, foto FROM personagens WHERE usuario_id = $1 ORDER BY id DESC`;
        const resultado = await pool.query(sql, [usuarioId]);
        res.json(resultado.rows);
    } catch (erro) {
        console.error('❌ Erro ao listar personagens:', erro);
        res.status(500).json({ erro: 'Erro ao buscar personagens.' });
    }
});

// =========================================================================
// CARREGAR UMA FICHA ESPECÍFICA 
// =========================================================================
app.get('/personagem/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `SELECT * FROM personagens WHERE id = $1`;
        const resultado = await pool.query(sql, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Personagem não encontrado.' });
        }

        // Retorna a ficha completinha para o front-end
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error('❌ Erro ao carregar ficha:', erro);
        res.status(500).json({ erro: 'Erro ao buscar dados do personagem.' });
    }
});

// =========================================================================
// EXCLUIR UM PERSONAGEM (POSTGRESQL)
// =========================================================================
app.delete('/personagens/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Deleta do PostgreSQL usando $1
        await pool.query('DELETE FROM personagens WHERE id = $1', [id]);
        res.status(200).json({ mensagem: 'Personagem excluído.' });
    } catch (erro) {
        console.error('❌ Erro ao deletar ficha:', erro);
        res.status(500).json({ erro: 'Erro ao deletar ficha.' });
    }
});

// ==========================================
// ROTAS DE CAMPANHA (POSTGRESQL - BLINDADAS)
// ==========================================

app.post('/campanhas', async (req, res) => {
    const { nome, mestre_id } = req.body;
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

app.post('/campanhas/entrar', async (req, res) => {
    const { codigo_convite, usuario_id, personagem_id } = req.body;

    try {
        const sqlBusca = `SELECT id FROM campanhas WHERE codigo_convite = $1`;
        const resultBusca = await pool.query(sqlBusca, [codigo_convite]);

        if (resultBusca.rows.length === 0) {
            return res.status(404).json({ erro: 'Código de convite inválido ou não encontrado.' });
        }

        const campanhaId = resultBusca.rows[0].id;

        const sqlInsert = `INSERT INTO membros_campanha (campanha_id, usuario_id, personagem_id) VALUES ($1, $2, $3)`;
        await pool.query(sqlInsert, [campanhaId, usuario_id, personagem_id]);

        res.json({ mensagem: 'Você entrou na campanha com sucesso!', campanha_id: campanhaId });
    } catch (erro) {
        res.status(400).json({ erro: 'Você já está nesta campanha ou ocorreu um erro.' });
    }
});

app.get('/campanhas/usuario/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
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

app.get('/campanhas/:id/personagens', async (req, res) => {
    const campanhaId = req.params.id;
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
app.get('/campanhas/:id/jogadores', async (req, res) => {
    const campanhaId = req.params.id;
    try {
        const sql = `
            SELECT m.usuario_id, u.username, 
                   (SELECT nome_personagem FROM personagens WHERE usuario_id = u.id LIMIT 1) as nome_personagem
            FROM membros_campanha m
            JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.campanha_id = $1
        `;
        const result = await pool.query(sql, [campanhaId]);
        res.json(result.rows);
    } catch (erro) {
        console.error('Erro ao buscar jogadores:', erro);
        res.status(500).json({ erro: 'Erro ao buscar jogadores.' });
    }
});

// =========================================================================
// ROTA DO MESTRE: Ver todas as fichas da mesa 
// =========================================================================
app.get('/campanhas/:id/fichas-mesa', async (req, res) => {
    const campanhaId = req.params.id;
    try {
        const sql = `
            SELECT p.*, u.username as nome_conta
            FROM personagens p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN membros_campanha m ON m.usuario_id = p.usuario_id
            WHERE m.campanha_id = $1
        `;
        const result = await pool.query(sql, [campanhaId]);
        res.json(result.rows);
    } catch (erro) {
        console.error('Erro ao buscar fichas:', erro);
        res.status(500).json({ erro: 'Erro ao buscar fichas da mesa.' });
    }
});

app.delete('/campanhas/:id/membros/:usuarioId', async (req, res) => {
    const { id, usuarioId } = req.params;
    try {
        await pool.query('DELETE FROM membros_campanha WHERE campanha_id = $1 AND usuario_id = $2', [id, usuarioId]);
        res.status(200).json({ mensagem: 'Membro removido.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao deletar membro.' });
    }
});

// =========================================================================
// ROTA DO MESTRE: Excluir Campanha (Destruir a Mesa)
// =========================================================================
app.delete('/campanhas/:id', async (req, res) => {
    const campanhaId = req.params.id;
    const mestreId = req.headers['usuario-id']; 

    try {
        const sqlCheck = `SELECT mestre_id FROM campanhas WHERE id = $1`;
        const resultCheck = await pool.query(sqlCheck, [campanhaId]);

        if (resultCheck.rows.length === 0) {
            return res.status(404).json({ erro: 'Campanha não encontrada.' });
        }
        if (resultCheck.rows[0].mestre_id != mestreId) {
            return res.status(403).json({ erro: 'Acesso negado: Apenas o Mestre pode apagar esta mesa!' });
        }
        await pool.query(`DELETE FROM membros_campanha WHERE campanha_id = $1`, [campanhaId]);

        await pool.query(`DELETE FROM campanhas WHERE id = $1`, [campanhaId]);
        const io = req.app.get('io');
        if (io) {
            io.to(campanhaId.toString()).emit('mesa-encerrada');
        }

        res.json({ mensagem: 'A mesa foi destruída permanentemente!' });
    } catch (erro) {
        console.error('❌ Erro ao excluir campanha:', erro);
        res.status(500).json({ erro: 'Erro interno ao destruir a mesa.' });
    }
});

server.listen(PORT, () => {
    console.log(`Servidor a correr na porta http://localhost:${PORT}`);
});