require('dotenv').config();

const { Pool } = require('pg');
const databaseURL = process.env.DATABASE_URL

const pool = new Pool({
    connectionString: databaseURL,
    ssl: {
        rejectUnauthorized: false 
    }
});

// =========================================================================
// CRIAÇÃO DAS TABELAS (ESTRUTURA RELACIONAL ROBUSTA)
// =========================================================================
async function criarTabelas() {
    const query = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS personagens (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
            nome_personagem VARCHAR(255),
            ocupacao VARCHAR(255),
            foto TEXT,
            dados_ficha JSONB -- A Bala de Prata! Salva a ficha nativamente sem bugar.
        );

        CREATE TABLE IF NOT EXISTS campanhas (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            codigo_convite VARCHAR(10) UNIQUE NOT NULL,
            mestre_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS membros_campanha (
            id SERIAL PRIMARY KEY,
            campanha_id INTEGER REFERENCES campanhas(id) ON DELETE CASCADE,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
            personagem_id INTEGER REFERENCES personagens(id) ON DELETE SET NULL,
            UNIQUE(campanha_id, usuario_id) -- Impede de entrar na mesma mesa duas vezes
        );
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabelas do PostgreSQL verificadas/criadas com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
}

module.exports = { pool, criarTabelas };
