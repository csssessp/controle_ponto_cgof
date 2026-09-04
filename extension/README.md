# Chronos Ponto — Bater Ponto (extensão de navegador)

Extensão para Chrome/Edge que permite ao funcionário registrar Entrada e Saída
do expediente com um clique, direto no Chronos Ponto. Usa a mesma conta de
login do sistema (email/senha).

## Instalação (modo desenvolvedor)

1. Abra `chrome://extensions` (ou `edge://extensions` no Edge).
2. Ative **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (Chrome) / **Carregar descompactada** (Edge).
4. Selecione esta pasta (`extension/`).
5. O ícone da extensão aparece na barra de ferramentas — pode ser necessário
   fixá-lo clicando no ícone de peça de quebra-cabeça e depois no alfinete.

## Uso

1. Clique no ícone da extensão.
2. Faça login com o mesmo email/senha usado no sistema web.
3. Ao chegar no trabalho, clique em **Registrar Entrada**.
4. Ao final do expediente, abra a extensão de novo e clique em **Registrar Saída**.

Cada dia permite só uma Entrada e uma Saída. Se algo sair errado (esqueceu de
bater um dos dois, por exemplo), peça a um administrador para ajustar
manualmente pela tela de Espelho de Ponto.

## Observações técnicas

- A extensão fala diretamente com a API de produção
  (`https://controle-ponto-cgof.vercel.app`) e com o Supabase Auth
  (`https://yhwiertvbkeirvlieuag.supabase.co`) — ver `host_permissions` em
  `manifest.json`. Pra apontar pra outro ambiente, edite as constantes no
  topo de `popup.js`.
- Sessão (token) fica salva em `chrome.storage.local`, local à instalação da
  extensão nesse navegador — sair da conta (botão "Sair da conta") apaga esse
  token.
- O horário e a data da marcação são sempre definidos pelo servidor (fuso
  America/Sao_Paulo), nunca pelo relógio do computador do funcionário.
