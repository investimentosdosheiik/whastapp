# Impulso

Aplicativo de prospecção para celular, com importação de empresas por backup, filtros, mensagens personalizadas, status, retornos, meta e backup JSON.

## Publicar na Vercel

Importe este repositório. Selecione **Other** em Framework Preset. Deixe Build Command vazio, Root Directory na raiz e Output Directory como `.`. Não há dependências nem variáveis de ambiente. Publique.

## Dados

Esta versão usa localStorage: os dados são salvos somente no navegador usado e não sincronizam com a planilha ou outros aparelhos. Ajustes permite exportar/importar backup. Retornos não geram notificações. Abrir WhatsApp não envia mensagens automaticamente nem altera o status.

O repositório não inclui nomes, telefones ou endereços da planilha. Importe um backup JSON em Ajustes para carregar seus contatos no navegador. Esta versão não tem autenticação; para sincronização entre aparelhos é necessária outra etapa com autenticação e banco de dados.

Para testar localmente: `python3 -m http.server 8080`, depois abra http://localhost:8080.
