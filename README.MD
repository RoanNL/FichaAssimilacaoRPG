# 🎲 FICHA Assimilação RPG - VTT & Gerenciador de Fichas

Um Virtual TableTop (VTT) completo e responsivo, focado na experiência do usuário e do Mestre. Construído do zero para permitir o gerenciamento de fichas de personagens em tempo real, rolagens de dados animadas e campanhas multiplayer.

## ✨ Features Principais

- **Sistema Multiplayer em Tempo Real:** Conexão instantânea via Socket.io com "Catraca VIP" (apenas membros da mesa veem as rolagens).
- **Rolador de Dados 3D:** Animações personalizadas e histórico de rolagens persistente (sobrevive a quedas de conexão).
- **Poderes do Mestre:** Dashboard exclusivo para o Mestre gerenciar os jogadores e inspecionar a ficha de todos os membros da mesa ao vivo.
- **Autosave Invisível:** As fichas são salvas automaticamente no banco de dados enquanto o jogador digita (Sistema de Debounce).
- **Hospedagem de Imagens na Nuvem:** Integração com Supabase Buckets (AWS S3) para uploads de avatares otimizados e ultrarrápidos.
- **Segurança de Alto Nível:** Senhas criptografadas com `Bcrypt`, sistema de sessões via `JWT` e recuperação de senha segura usando envio de e-mail transacional via API do Brevo.
- **UI/UX Imersiva:** Design construído com Tailwind CSS, incluindo Dark Mode fluido (Cores Complementares) e Toasts Customizados.

## 🛠️ Stack Tecnológica

**Front-end:**
- HTML5, Vanilla JavaScript, CSS3
- Tailwind CSS
- FontAwesome

**Back-end:**
- Node.js & Express
- PostgreSQL (Banco de Dados Relacional)
- Socket.io (WebSockets)
- Supabase Storage (Bucket de Imagens)
- Brevo API (E-mails Transacionais)
- Bcrypt & JSON Web Token (JWT)

## 🚀 Como rodar o projeto localmente

1. Clone o repositório:
```bash
git clone https://github.com/RoanNL/FichaAssimilacaoRPG.git
```
2. Instale as dependências do Back-end:
```bash
npm install
```
 3. Configure as Variáveis de Ambiente:

 Crie um arquivo .env na raiz do projeto com as seguintes chaves:
 ```markdown
# Banco de Dados
DATABASE_URL=postgres://usuario:senha@host:porta/banco

# Supabase Storage (Imagens)
SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
SUPABASE_KEY=sua_service_role_key

# Brevo API (E-mails)
BREVO_API_KEY=sua_chave_api_do_brevo
EMAIL_USUARIO=seu.email@gmail.com

# Segurança
SEGREDO_JWT=um_segredo_muito_forte_aqui
```
4. Inicie o Servidor
```bash
npm run dev
```

5. Abra index.html no seu navegador usando a extensão Live Server ou abrindo o arquivo diretamente.

