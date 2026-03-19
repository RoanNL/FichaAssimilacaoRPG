require('dotenv').config()

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const db = require('./database');

const { pool, criarTabelas } = require('./database');

pool.query('SELECT NOW()', (err, res) => {
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

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Um jogador conectou! ID:', socket.id);

    // 🛡️ A CATRACA VIP
    socket.on('entrar-na-campanha', async (dados) => {
        const campanhaId = typeof dados === 'object' ? dados.campanhaId : dados;
        const usuarioId = typeof dados === 'object' ? dados.usuarioId : null;

        if (!usuarioId || !campanhaId) return; 

        // A MÁGICA AQUI: Transforma o ID em texto para o Socket.io entender!
        const salaStr = campanhaId.toString(); 

        try {
            const sql = `SELECT * FROM membros_campanha WHERE campanha_id = $1 AND usuario_id = $2`;
            const resultado = await pool.query(sql, [campanhaId, usuarioId]);

            if (resultado.rows.length > 0) {
                socket.join(salaStr); 
                console.log(`✅ Catraca VIP: Usuário ${usuarioId} acessou a mesa ${salaStr}`);
            } else {
                console.log(`🚨 BARRADO: Usuário ${usuarioId} tentou espionar a mesa ${salaStr}!`);
            }
        } catch (err) {
            console.error('Erro na catraca VIP:', err);
        }
    });

    // 🛡️ O ESCUDO DA ROLAGEM
    socket.on('rolar-dados', (pacoteDeDados) => {
        // CONVERSÃO PARA TEXTO AQUI TAMBÉM!
        const salaStr = pacoteDeDados.campanhaId.toString(); 
        
        if (socket.rooms.has(salaStr)) {
            socket.to(salaStr).emit('nova-rolagem', pacoteDeDados);
        } else {
            console.log(`🚨 FALSO HACKER BARRADO: Socket não está na sala ${salaStr}!`);
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

    if (!username || !password) {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const sql = `INSERT INTO usuarios (username, password) VALUES ($1, $2) RETURNING id`;
        const resultado = await pool.query(sql, [username, password]);

        // TRADUÇÃO PARA O FRONT-END: Devolvemos usuario.id e usuario.nome
        res.status(201).json({
            mensagem: 'Usuário registrado com sucesso!',
            usuario: { id: resultado.rows[0].id, nome: username }
        });
    } catch (erro) {
        if (erro.code === '23505') {
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

    if (!username || !password) {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const sql = `SELECT id, username FROM usuarios WHERE username = $1 AND password = $2`;
        const resultado = await pool.query(sql, [username, password]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        res.json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: resultado.rows[0].id,
                nome: resultado.rows[0].username
            }
        });
    } catch (erro) {
        console.error('❌ Erro no login:', erro);
        res.status(500).json({ erro: 'Erro interno ao realizar login.' });
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
    const foto = req.body.foto || null;

    if (!usuarioId) {
        return res.status(400).json({ erro: 'Usuário não autenticado.' });
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
        // Lógica à prova de balas: Traz todos que são membros da campanha, tendo ficha ou não!
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
        // Lógica à prova de balas: Pega as fichas cruzando pelo ID do Usuário, não importa como ele entrou!
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