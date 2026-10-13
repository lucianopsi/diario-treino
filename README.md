# Diário de Treino

App (PWA) para montar divisões de treino (ABC, ABCDE…), registrar séries e cargas, acompanhar a evolução e manter a sequência do mês com medalhas.

## Como instalar no celular (Android)
1. Abra o endereço do app no **Chrome**.
2. Toque em **Instalar app** (no aviso que aparece, no menu ⋮ › *Instalar app*, ou em Montar › Dados e backup).
3. O ícone **Treino** aparece na tela inicial e o app funciona sem internet.

## Como funciona o treino
1. Em **Treinar**, o app destaca o próximo treino pelo rodízio (A → B → C). Faltou ou a semana começou por outro treino? Toque na letra em **Próximo treino** para ajustar; depois do treino feito, o rodízio segue a partir dele.
2. **Iniciar** abre a lista de exercícios do dia com uma sugestão de por onde começar. Aparelho ocupado? Escolha qualquer outro da lista.
3. Na tela do exercício aparecem só as séries dele e a referência do histórico: última vez, recorde e se a carga subiu ou caiu. Campos vazios usam o valor em cinza ao marcar a série.
4. **Concluir exercício** volta para a lista com o próximo sugerido. **Finalizar** salva o treino.

## Onde ficam os dados
- Tudo fica **somente no aparelho** (armazenamento do navegador). Nada é enviado para servidor.
- Use **Montar › Dados e backup** para enviar o backup ao Google Drive (ou baixar o arquivo) e para importá-lo em outro aparelho.
- Limpar os dados do Chrome ou desinstalar o app apaga o histórico: mantenha o backup em dia.

## Regras da sequência
- **Até 2 descansos** (padrão): até 2 dias seguidos sem treino não quebram a sequência; o 3º quebra. Só dias treinados contam.
- **Dias seguidos**: qualquer dia sem treino zera.
- Medalhas por sequência no mês: 3, 5, 7, 12 e 20 dias. Recomeçam no dia 1º.

## Publicar uma atualização
Ao alterar qualquer arquivo, aumente `VERSAO` em `sw.js` para o celular baixar a nova versão.

Fontes: Barlow e Barlow Condensed (SIL Open Font License, ver `fonts/OFL.txt`).
