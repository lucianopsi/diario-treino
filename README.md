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

## Balança OKOK (experimental)
Leitura do peso (e impedância) pelos anúncios Bluetooth da balança, sem parear. Exige no Chrome do Android: `chrome://flags` › *Experimental Web Platform features* › Enabled. Formatos suportados: V20, V11, VF0 e C0 (documentados pelo projeto openScale). Há um modo diagnóstico para capturar os bytes de modelos não reconhecidos.

## Regras da sequência
- **Até 2 descansos** (padrão): até 2 dias seguidos sem treino não quebram a sequência; o 3º quebra. Só dias treinados contam.
- **Dias seguidos**: qualquer dia sem treino zera.
- Medalhas por sequência no mês: 3, 5, 7, 12 e 20 dias. Recomeçam no dia 1º.

## Publicar uma atualização
Ao alterar qualquer arquivo, aumente `VERSAO` em `sw.js` para o celular baixar a nova versão.

O SDK do Firebase vem do CDN oficial (versão fixa 10.12.2) e a configuração está em `firebase-config.js`.

Fontes: Barlow e Barlow Condensed (SIL Open Font License, ver `fonts/OFL.txt`).
