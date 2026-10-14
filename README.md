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
- Sempre há uma cópia no aparelho (`localStorage`, chave `diario-treino-v1`). A versão 2.0 só acrescenta campos; uma cópia intacta da 1.x fica em `diario-treino-v1-copia-antes-2.0`.
- Com **Ajustes › Entrar com Google**, tudo é sincronizado no Firestore em `apps/treino/users/{uid}/…`:
  - `config/main` divisões, treinos e regra da sequência · `config/prefs` tema, gavetas, perfil
  - `sessions/{id}` um documento por treino (exclusão marca `apagado: true`)
  - `weights/{id}` pesagens · `live/current` treino em andamento
- Primeiro login: com dados só no aparelho, o app oferece enviá-los; com dados nos dois lugares, pergunta (juntar sem duplicar / manter a nuvem / substituir pela local). Antes, baixa um backup JSON.
- **Ajustes › Dados e backup**: exportar e importar backup JSON.

## Relógio (Samsung Health) e relatório do mês

- No Samsung Health: menu › Configurações › Baixar dados pessoais. Em Ajustes ou Evolução, toque em **Importar dados do relógio** e escolha o `.zip` da exportação ou os `.csv` da pasta.
- O app lê só sono, FC/VFC noturnas (índice de vitalidade), passos, treinos de força e composição corporal, e guarda um resumo por dia em `apps/treino/users/{uid}/health/{AAAA-MM-DD}`. Os arquivos originais não saem do aparelho. Importar de novo só acrescenta ou atualiza dias.
- **Evolução › Relatório do mês**: semana a semana, treinos, duração, volume, progressão de carga, sono e VFC comparada com a média dos 60 dias anteriores, com uma leitura em texto. Abaixo, leituras do mês: treino × recuperação, sono × desempenho e pré-treino × sono. Cada leitura exige uma quantidade mínima de dados.
- **Pré-treino**: marque o chip na tela do treino em andamento (ou depois, no Histórico).

## Corpo (composição corporal do Galaxy Watch)

- A fonte é a medição de composição corporal do relógio. No relógio, informe o peso da balança e meça; depois importe a exportação do Samsung Health. Todas as medições já feitas entram de uma vez, e importar de novo não duplica (cada medição tem o identificador do Samsung Health).
- A aba Corpo mostra peso, massa muscular esquelética, gordura (%), massa de gordura, massa livre de gordura, água, IMC e metabolismo basal. Cada medida tem uma barra com a medição anterior como "sombra", além da variação. Os gráficos de peso, músculo e gordura usam o eixo de datas real e a média do dia quando há mais de uma medição.
- Pesagens antigas (manuais ou da balança por Bluetooth) ficam guardadas em "Registros anteriores", fora dos gráficos. A leitura da balança por Bluetooth foi removida na versão 2.3.
- Lembrete: depois de 7 dias sem importar (mude para 14, 30 ou desligado em Ajustes), aparece um aviso no Início e no Corpo para sincronizar o relógio e importar.

## Regras da sequência
- **Até 2 descansos** (padrão): até 2 dias seguidos sem treino não quebram a sequência; o 3º quebra. Só dias treinados contam.
- **Dias seguidos**: qualquer dia sem treino zera.
- Medalhas por sequência no mês: 3, 5, 7, 12 e 20 dias. Recomeçam no dia 1º.

## Publicar uma atualização
Ao alterar qualquer arquivo, aumente `VERSAO` em `sw.js` para o celular baixar a nova versão.

O SDK do Firebase vem do CDN oficial (versão fixa 10.12.2) e a configuração está em `firebase-config.js`.

Fontes: Barlow e Barlow Condensed (SIL Open Font License, ver `fonts/OFL.txt`).
