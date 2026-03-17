const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define o caminho onde o ficheiro da base de dados será guardado
const dbPath = path.resolve(__dirname, 'assimilacao.db');

// Inicia a ligação à base de dados 
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar à base de dados:', err.message);
    } else {
        console.log('Conectado com sucesso à base de dados SQLite.');
    }
});

// Criação das Tabelas
db.serialize(() => {
    //  Tabela de Utilizadores (Contas)
    db.run(`CREATE TABLE IF NOT EXISTS utilizadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_utilizador TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
    )`);

    //  Tabela de Personagens
    db.run(`CREATE TABLE IF NOT EXISTS personagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_personagem TEXT NOT NULL,
        dados_personagem TEXT,
        utilizador_id INTEGER,
        FOREIGN KEY(utilizador_id) REFERENCES utilizadores(id)
    )`);
    
    console.log('Tabelas verificadas/criadas com sucesso.');
});

module.exports = db;