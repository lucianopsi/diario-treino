// Configuração web do Firebase (projeto compartilhado com o app Gasto Mensal).
// Estes valores identificam o projeto e não são senhas; o acesso é protegido pelas regras do Firestore.
export const firebaseConfig = {
  apiKey: 'AIzaSyCpvXqGEKS_QJV7xLHwWq_JLrasx7TtUKI',
  authDomain: 'gasto-mensal-cb620.firebaseapp.com',
  projectId: 'gasto-mensal-cb620',
  storageBucket: 'gasto-mensal-cb620.firebasestorage.app',
  messagingSenderId: '172223117292',
  appId: '1:172223117292:web:6983654691655bd9f832c9'
};

// Tudo deste app fica em apps/treino/users/{uid}/… (nunca em users/{uid}/…, que é de outro app).
export const RAIZ = 'apps/treino/users';
