# Conexão privada com Google Sheets

O aplicativo busca empresas ao abrir, a cada 60 segundos enquanto visível e ao voltar à tela. Alterações de status, prioridade, site, retorno, anotações e valor são enviadas à planilha. Novas empresas também criam linhas nela. Dados e credenciais não ficam no código público.

## Configuração única na Vercel

Framework Preset: **Other**. Root Directory: raiz. Output Directory: `.`. Build Command: vazio. O `package.json` instala a biblioteca oficial de autenticação Google. A pasta `api` contém a função Node.js. Use Node.js 22.x.

Configure as variáveis em **Production** (e em Preview apenas se desejar o mesmo acesso nos previews):

| Variável | Conteúdo |
| --- | --- |
| `GCP_PROJECT_NUMBER` | Número do projeto Google (não é o ID da conta de serviço) |
| `GCP_SERVICE_ACCOUNT_EMAIL` | E-mail da conta de serviço dedicada |
| `GCP_WORKLOAD_IDENTITY_POOL_ID` | `impulso-vercel` |
| `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `whastapp` |
| `GOOGLE_SHEET_ID` | ID da planilha privada |
| `GOOGLE_SHEET_TAB` | `Prospects` |
| `APP_PASSWORD` | Sua senha de acesso ao aplicativo, com ao menos 16 caracteres |
| `SESSION_SECRET` | Chave aleatória com ao menos 32 caracteres para assinar sessões |

Não use prefixos `NEXT_PUBLIC_` ou `VITE_` para esses valores. Não coloque o JSON ou senhas no GitHub. Faça um novo deployment após configurar as variáveis.

## Autorizar o Google sem chave JSON

A integração usa Vercel OIDC e Google Workload Identity Federation. Não precisa gerar chave JSON nem desativar políticas da organização. O servidor solicita tokens temporários com escopo somente de planilhas.

O arquivo `configurar-google.sh` prepara o projeto escolhido para este aplicativo. Execute no Google Cloud Shell, autenticado como proprietário ou com as permissões necessárias. Antes de executar, confira os identificadores no início do arquivo. Ele solicita `AUTORIZAR`, habilita IAM, Resource Manager, IAM Credentials, STS e Sheets, cria um pool/provedor dedicado e concede `roles/iam.workloadIdentityUser` somente na conta `impulso`. A confiança exige o projeto Vercel exato, seu ID estável e o ambiente `production`. Previews e outros projetos não recebem acesso.

O emissor conferido na Vercel é Team: `https://oidc.vercel.com/investimentosdosheiik`; o público é `https://vercel.com/investimentosdosheiik`. A regra exige o assunto `owner:investimentosdosheiik:project:whastapp:environment:production`. Se renomear o projeto ou equipe, revise a federação.

O script interrompe se houver erro ou um provedor existente com regras diferentes. Ele não cria chaves, não muda políticas de organização e não concede papéis administrativos à conta. Ao terminar, imprime somente as quatro configurações públicas para colocar na Vercel. A execução real depende das permissões e políticas do projeto Google. Compartilhe apenas a planilha do aplicativo, como Editor, com a conta de serviço. Esse compartilhamento já foi realizado para a conta indicada pelo proprietário.

Para projetos que já permitem chaves, o servidor também aceita `GOOGLE_SERVICE_ACCOUNT_JSON` como alternativa privada. Se a federação estiver completa, ela tem preferência. Nunca envie chaves ao GitHub ou ao chat.

Enquanto a configuração estiver incompleta, o aplicativo mantém o modo local e mostra um aviso. Depois de ativada, exige senha para buscar os contatos. Sessões usam cookie HttpOnly, Secure e SameSite=Strict. O limite de tentativas de senha funciona por instância; para uso mais amplo, complemente com limite de requisições no firewall da Vercel.

## Planilha e preservação dos dados

A aba `Prospects` usa cabeçalhos únicos, independentemente da ordem das colunas: `Nome`, `Telefone`, `Endereço`, `Nota`, `Observação`, `Prioridade`, `Status`, `Tem site?`, `Próximo retorno`, `Anotações CRM`, `Valor da venda` e `Histórico CRM`. Limite atual: 5.000 empresas e até a coluna AZ.

As outras colunas e fórmulas são preservadas. As colunas de controle ausentes são criadas na primeira gravação. `Resumo!B3:B4` guarda preço e meta; `Mensagens!B4:B6` guarda os modelos; a aba oculta `_Impulso` guarda o nome de quem aborda. Apenas as células desses campos são atualizadas ao salvar.

Rascunhos pendentes ficam no navegador durante falhas de conexão. O indicador diferencia pendência de salvamento concluído. Se um campo também mudou na planilha, o aplicativo pede revisão antes de reenviar sua edição. Essa checagem ocorre antes da gravação, mas o Google Sheets não oferece transação condicional por célula: evite editar o mesmo campo simultaneamente em dois aparelhos.

A identificação usa nome, telefone e endereço. Alterar esses dados na planilha muda a identificação. Rascunhos anteriores precisam de revisão; identificações duplicadas bloqueiam a leitura para evitar gravação na empresa errada.

O backup JSON é opcional. Não é necessário importar arquivos para buscar os leads da planilha. Registros antigos do modo local não são enviados em massa automaticamente. Exporte uma cópia antes de ativar a conexão se tiver dados locais importantes.

## Testar

Execute `npm ci` e `npm test`. Os testes usam dados fictícios e cobrem leitura por cabeçalho, ordenação, preservação de fórmulas, conflitos, autenticação, rascunhos e atualização sem importação. A verificação com a planilha real depende das credenciais e do compartilhamento configurados.
