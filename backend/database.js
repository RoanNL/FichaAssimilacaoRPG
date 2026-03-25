require('dotenv').config();

const { Pool } = require('pg');
const databaseURL = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: databaseURL,
    ssl: {
        rejectUnauthorized: false
    }
});

// =========================================================================
// CRIAÇÃO DAS TABELAS
// =========================================================================
async function criarTabelas() {
    const query = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            reset_token VARCHAR(255),
            reset_token_expires BIGINT
        );

        CREATE TABLE IF NOT EXISTS personagens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
            nome_personagem VARCHAR(255),
            ocupacao VARCHAR(255),
            foto TEXT,
            dados_ficha JSONB
        );

        CREATE TABLE IF NOT EXISTS campanhas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            codigo_convite VARCHAR(10) UNIQUE NOT NULL,
            mestre_id UUID REFERENCES usuarios(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS membros_campanha (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
            usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
            personagem_id UUID REFERENCES personagens(id) ON DELETE SET NULL,
            UNIQUE(campanha_id, usuario_id)
        );

        CREATE TABLE IF NOT EXISTS historico_rolagens (
            id SERIAL PRIMARY KEY, -- O ID da rolagem pode ser número sequencial pra ficar organizado
            campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE, -- Mas a mesa é UUID!
            pacote JSONB NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabelas do PostgreSQL verificadas/criadas com sucesso (Versão UUID)!');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
}

module.exports = { pool, criarTabelas };