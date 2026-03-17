require('dotenv').config() 

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken')
const db = require('./database');


const app = express();
const PORT = 3000;
const SEGREDO_JWT = process.env.SEGREDO_JWT

app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


app.get('/', (req, res) => {
    res.json({ mensagem: 'Servidor online!' });
});

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



app.listen(PORT, () => {
    console.log(`Servidor a correr na porta http://localhost:${PORT}`);
});