require('dotenv').config() 

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken')
const db = require('./database');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;
const SEGREDO_JWT = process.env.SEGREDO_JWT

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' } // Permite comunicação livre com o front-end
});

io.on('connection', (socket) => {
    console.log('Um jogador conectou! ID:', socket.id);

    // 1. O jogador avisa em qual mesa ele sentou
    socket.on('entrar-na-campanha', (campanhaId) => {
        socket.join(campanhaId); // Tranca o jogador na sala da campanha
        console.log(`Socket ${socket.id} entrou na sala da campanha: ${campanhaId}`);
    });

    // 2. Quando rolar os dados, manda APENAS para a sala dele
    socket.on('rolar-dados', (pacoteDeDados) => {
        // O "socket.to(id)" grita apenas dentro da sala correta!
        socket.to(pacoteDeDados.campanhaId).emit('nova-rolagem', pacoteDeDados);
    });
});
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.get('/', (req, res) => {
    res.json({ mensagem: 'Servidor online!' });
});

// Função auxiliar para gerar código de convite (Ex: A7X9P2)
function gerarCodigoConvite() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==========================================
// ROTA 1: REGISTRO DE USUÁRIO
// ==========================================
app.post('/registro', async (req, res) => {
    const { nome_usuario, senha } = req.body;

    if (!nome_usuario || !senha) {
        return res.status(400).json({ erro: 'Preencha usuário e senha!' });
    }

    try {
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Insere no banco de dados
        const query = `INSERT INTO utilizadores (nome_utilizador, senha) VALUES (?, ?)`;
        db.run(query, [nome_usuario, senhaCriptografada], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ erro: 'Este nome de usuário já existe.' });
                }
                return res.status(500).json({ erro: 'Erro interno no banco de dados.' });
            }
            res.status(201).json({ mensagem: 'Conta criada com sucesso!', id: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao processar o registro.' });
    }
});

// ==========================================
// ROTA 2: LOGIN DE USUÁRIO
// ==========================================
app.post('/login', (req, res) => {
    const { nome_usuario, senha } = req.body;

    if (!nome_usuario || !senha) {
        return res.status(400).json({ erro: 'Preencha usuário e senha!' });
    }

    // Busca o usuário no banco
    const query = `SELECT * FROM utilizadores WHERE nome_utilizador = ?`;
    db.get(query, [nome_usuario], async (err, row) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro interno no banco de dados.' });
        }

        if (!row) {
            return res.status(401).json({ erro: 'Usuário não encontrado.' });
        }

        const senhaValida = await bcrypt.compare(senha, row.senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Senha incorreta.' });
        }

        const token = jwt.sign({id: row.id}, SEGREDO_JWT, {expiresIn: '12h'});

        res.status(200).json({ 
            mensagem: 'Login realizado com sucesso!', 
            token: token,
            usuarioId: row.id,
            nome_usuario: row.nome_utilizador
        });
    });
});

// ==========================================
// ROTAS DE PERSONAGENS (FICHA)
// ==========================================

// Salvar ou Atualizar um Personagem
app.post('/personagens', (req, res) => {
    const { id, nome_personagem, dados_personagem, utilizador_id } = req.body;

    // Se tem um ID, é para atualizar uma ficha existente
    if (id) {
        const query = `UPDATE personagens SET nome_personagem = ?, dados_personagem = ? WHERE id = ? AND utilizador_id = ?`;
        db.run(query, [nome_personagem, JSON.stringify(dados_personagem), id, utilizador_id], function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao atualizar ficha.' });
            res.status(200).json({ mensagem: 'Ficha atualizada com sucesso!' });
        });
    } 
    // Se não tem ID, é para criar uma ficha nova
    else {
        const query = `INSERT INTO personagens (nome_personagem, dados_personagem, utilizador_id) VALUES (?, ?, ?)`;
        db.run(query, [nome_personagem, JSON.stringify(dados_personagem), utilizador_id], function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao criar ficha.' });
            res.status(201).json({ mensagem: 'Nova ficha criada!', id: this.lastID });
        });
    }
});

// Buscar todos os personagens de um Usuário
app.get('/personagens/usuario/:usuario_id', (req, res) => {
    const usuario_id = req.params.usuario_id;
    const query = `SELECT id, nome_personagem, dados_personagem FROM personagens WHERE utilizador_id = ?`;
    
    db.all(query, [usuario_id], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar personagens.' });
        
        // Converte o texto JSON do banco de volta para um objeto JavaScript
        const personagens = rows.map(row => ({
            id: row.id,
            nome_personagem: row.nome_personagem,
            dados_personagem: JSON.parse(row.dados_personagem)
        }));
        
        res.status(200).json(personagens);
    });
});

// Excluir um personagem
app.delete('/personagens/:id', (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM personagens WHERE id = ?`;
    
    db.run(query, [id], function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao deletar ficha.' });
        res.status(200).json({ mensagem: 'Personagem excluído.' });
    });
});

// ==========================================
// ROTAS DE CAMPANHA (VTT MULTIPLAYER)
// ==========================================

app.post('/campanhas', (req, res) => {
    const { nome, mestre_id } = req.body;
    const codigo = gerarCodigoConvite();

    db.run(`INSERT INTO campanhas (nome, codigo_convite, mestre_id) VALUES (?, ?, ?)`, 
        [nome, codigo, mestre_id], 
        function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao criar campanha.' });
            
            const campanha_id = this.lastID;
            // O Mestre também é inserido como membro automaticamente (sem personagem)
            db.run(`INSERT INTO membros_campanha (campanha_id, usuario_id) VALUES (?, ?)`, 
                [campanha_id, mestre_id], 
                (err) => {
                    if (err) console.error("Erro ao vincular mestre à campanha.");
                    res.json({ mensagem: 'Campanha criada!', id: campanha_id, codigo: codigo });
                }
            );
        }
    );
});

// 2. Entrar em uma campanha via código de convite
app.post('/campanhas/entrar', (req, res) => {
    const { codigo_convite, usuario_id, personagem_id } = req.body;

    db.get(`SELECT id FROM campanhas WHERE codigo_convite = ?`, [codigo_convite], (err, campanha) => {
        if (err || !campanha) return res.status(404).json({ erro: 'Código de convite inválido ou não encontrado.' });

        db.run(`INSERT INTO membros_campanha (campanha_id, usuario_id, personagem_id) VALUES (?, ?, ?)`, 
            [campanha.id, usuario_id, personagem_id], 
            function(err) {
                if (err) return res.status(400).json({ erro: 'Você já está nesta campanha ou ocorreu um erro.' });
                res.json({ mensagem: 'Você entrou na campanha com sucesso!', campanha_id: campanha.id });
            }
        );
    });
});

// 3. Buscar campanhas de um usuário (como Mestre ou como Jogador)
app.get('/campanhas/usuario/:usuarioId', (req, res) => {
    const { usuarioId } = req.params;
    const sql = `
        SELECT c.id, c.nome, c.codigo_convite, c.mestre_id, 
        (c.mestre_id = ?) as is_mestre
        FROM campanhas c
        JOIN membros_campanha m ON c.id = m.campanha_id
        WHERE m.usuario_id = ?
    `;
    db.all(sql, [usuarioId, usuarioId], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar campanhas.' });
        res.json(rows);
    });
});



server.listen(PORT, () => {
    console.log(`Servidor a correr na porta http://localhost:${PORT}`);
});