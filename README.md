# Impulso

Aplicativo de prospecção para celular, com conexão privada ao Google Sheets, busca automática de empresas, filtros, mensagens personalizadas, status, retornos, meta e backup opcional. Consulte [CONFIGURACAO.md](CONFIGURACAO.md) para ativar a sincronização.

## Publicar na Vercel

Importe este repositório. Selecione **Other** em Framework Preset. Deixe Build Command vazio, Root Directory na raiz e Output Directory como `.`. A biblioteca oficial Google é instalada pelo package.json. A conexão depende das variáveis privadas descritas em CONFIGURACAO.md.

## Dados

Com a conexão ativada, a planilha é a fonte dos dados e as alterações são enviadas ao Google. Sem a configuração, o aplicativo mantém o modo local e mostra um aviso. Retornos não geram notificações. Abrir WhatsApp não envia mensagens automaticamente nem altera o status.

O repositório não inclui nomes, telefones ou endereços da planilha. Depois de configurar a conexão, os contatos aparecem sem importar arquivos e a consulta à planilha exige a senha do aplicativo.

Para testar localmente: `python3 -m http.server 8080`, depois abra http://localhost:8080.
