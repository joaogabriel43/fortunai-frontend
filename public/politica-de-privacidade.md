# Política de Privacidade — Pondero

> **RASCUNHO — pendente de revisão jurídica antes de publicação final.**

**Versão 1.0 — Rascunho para revisão jurídica**

Em conformidade com a **Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)**.

---

## 1. Controladora e Encarregado de Dados

**Pondero** é a Controladora dos dados pessoais tratados por meio desta plataforma, nos termos do art. 5º, VI, da LGPD (Lei 13.709/2018) — a quem cabem as decisões referentes ao tratamento de dados pessoais dos titulares. No momento, a operação é realizada sem CNPJ próprio, sob responsabilidade de João Gabriel Borba do Nascimento como pessoa física operadora da plataforma.

**João Gabriel Borba do Nascimento** atua como Encarregado de Dados (Data Protection Officer — DPO), nos termos do art. 5º, VIII, da LGPD. O Encarregado é a ponte entre a Pondero e os titulares dos dados (e, quando aplicável, a Autoridade Nacional de Proteção de Dados — ANPD), responsável por receber reclamações e comunicações dos titulares, prestar esclarecimentos e adotar providências — **o Encarregado não é o controlador dos dados**.

Canal de privacidade (contato do Encarregado de Dados): privacidade@pondero.com.br

## 2. Dados Coletados

### 2.1 Dados de Cadastro
- Endereço de e-mail
- Senha (armazenada de forma criptografada — nunca em texto simples)
- Nome (opcional)
- Foto de perfil (opcional, armazenada no Cloudinary)

### 2.2 Dados Financeiros
- Transações de receitas e despesas inseridas pelo usuário
- Ativos de investimento (tickers, quantidades, preços)
- Metas financeiras configuradas
- Mensagens enviadas ao assistente e o histórico do chat
- Imagens de comprovantes (por exemplo, notas e recibos) enviadas por você para extração de dados

### 2.3 Dados Técnicos
- Endereço IP, registrado (i) no momento do consentimento, para auditoria, e (ii) nas requisições ao serviço, para segurança e para o limite de uso (controle de excesso de requisições)
- Logs de acesso (por até 90 dias)
- Preferências de interface

## 3. Finalidade do Tratamento

Seus dados são utilizados para:
- **Prestação do serviço**: funcionar o assistente financeiro pessoal
- **Segurança**: autenticação, prevenção de fraudes e limite de uso (registro do endereço IP)
- **Melhoria do produto**: análise agregada e anônima de uso
- **Comunicação**: envio de digest semanal (se habilitado)
- **Conformidade legal**: cumprimento de obrigações regulatórias

**Base legal (LGPD):** consentimento (Art. 7°, I) e execução de contrato (Art. 7°, V).

## 4. Compartilhamento de Dados

Seus dados **não são vendidos** a terceiros. Compartilhamos apenas com:
- **Google Gemini (Google LLC)**: as mensagens que você envia ao chat e as imagens de comprovantes que você envia são transmitidas ao Google Gemini para que sejam interpretadas (entendimento da mensagem e extração de dados do comprovante). Esse conteúdo pode incluir informações financeiras e pessoais que você mesmo digitar ou que constem na imagem; evite enviar o que não deseja compartilhar com esse fornecedor. O tratamento pelo Google pode ocorrer fora do Brasil (LGPD, art. 33)
- **Alpha Vantage/BRAPI**: busca de cotações (sem dados do usuário)
- **Cloudinary**: armazenamento de foto de perfil
- **Render**: infraestrutura de hospedagem do backend
- **Neon**: banco de dados PostgreSQL gerenciado

## 5. Seus Direitos (LGPD Art. 18)

Você tem direito a:
- **Acesso**: consultar quais dados temos sobre você
- **Correção**: corrigir dados incorretos ou desatualizados
- **Exclusão**: apagar seus dados (disponível em Configurações → Excluir conta)
- **Portabilidade**: exportar seus dados em formato estruturado
- **Revogação de consentimento**: a qualquer momento, sem prejuízo

Para exercer seus direitos, utilize o canal de privacidade: privacidade@pondero.com.br

## 6. Segurança

Adotamos medidas técnicas para proteção dos dados:
- Senhas com hash bcrypt
- Comunicação criptografada (HTTPS/TLS)
- Tokens JWT com expiração
- Acesso restrito por autenticação em todos os endpoints

## 7. Retenção de Dados

- Dados de conta: mantidos enquanto a conta existir
- Após exclusão da conta: removidos imediatamente via DELETE CASCADE
- Logs de acesso: retidos conforme a política padrão da infraestrutura de hospedagem, sem prazo fixo definido no código da aplicação.

## 8. Cookies e Rastreamento

A Pondero não utiliza cookies de publicidade. Para o funcionamento do serviço, usamos apenas armazenamento local (localStorage) para a sessão de autenticação e para registrar a sua escolha no aviso de cookies.

Com o seu consentimento, utilizamos Google Analytics (Google LLC) e Microsoft Clarity (Microsoft Corp.) para medir o uso do site e melhorar o produto. Essas ferramentas usam cookies e identificadores e podem tratar dados como páginas visitadas, tipo de dispositivo e interações; o Clarity pode registrar sessões anonimizadas nas páginas públicas. Não são executadas na área logada nem antes da sua escolha no aviso de cookies, e você pode recusar sem perda de funcionalidade. Os dados podem ser transferidos para fora do Brasil (LGPD, art. 33).

## 9. Menores de Idade

A Pondero não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores.

## 10. Alterações nesta Política

Alterações relevantes serão comunicadas por e-mail e/ou exigirão novo consentimento no acesso.

## 11. Contato

Para questões de privacidade e exercício de direitos LGPD:
- **Canal de privacidade (Encarregado de Dados — DPO)**: João Gabriel Borba do Nascimento, privacidade@pondero.com.br
- **Assunto**: [LGPD] — sua solicitação

Para comunicações gerais sobre a plataforma:
- **E-mail**: contato@pondero.com.br

---

*Última atualização: agosto de 2026 — Versão 1.0 — Rascunho*
