// Config dinâmica do Expo/EAS. Lê o projectId de EXPO_PROJECT_ID (.env) em vez
// de hardcode — o eas CLI (build:list) resolve o projeto a partir daqui.
// dotenv é opcional: no CI as variáveis já vêm injetadas como env vars e o
// node_modules local pode não estar instalado quando o eas CLI avalia este arquivo.
try {
  require('dotenv').config();
} catch {
  // sem dotenv (ex.: CI sem npm install) — usa process.env já existente
}

const projectId = process.env.EXPO_PROJECT_ID;
if (!projectId) {
  throw new Error('[app.config] EXPO_PROJECT_ID não encontrado no .env');
}

module.exports = {
  expo: {
    name: 'arys',
    slug: 'arys',
    owner: 'aramis-engenharia',
    extra: {
      eas: {
        projectId,
      },
    },
  },
};
