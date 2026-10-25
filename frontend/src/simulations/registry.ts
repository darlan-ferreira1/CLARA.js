export interface SimulationMeta {
  id: string;
  title: string;
  description: string;
  category: 'Química' | 'Física' | 'Biologia';
  available: boolean;
  // Variante que exige WebXR (realidade virtual imersiva ou aumentada). O app de
  // desktop não tem WebXR, então a Galeria dele mostra essas como "só no site".
  xr?: 'vr' | 'ar';
  thumbnail?: string; // caminho relativo a /public, ex: '/thumbnails/bohr-model.png'
  // Pasta do experimento dentro de src/simulations/. A moldura (ExperimentShell)
  // carrega dali o teoria.md (botão Teoria) e o README.md (botão Como foi feito).
  folder?: string;
  // Pasta de onde vem o teoria.md quando a teoria é compartilhada com outra
  // variante (ex.: Bohr VR/AR usam a teoria do Bohr desktop). Padrão: folder.
  theoryFolder?: string;
}

export const simulations: SimulationMeta[] = [
  {
    id: 'bohr-model',
    title: 'Modelo de Bohr',
    description: 'Visualize a estrutura atômica dos primeiros 20 elementos com elétrons orbitando o núcleo em tempo real.',
    category: 'Química',
    available: true,
    folder: 'chemistry/BohrModel',
  },
  {
    id: 'xr-bohr-model',
    title: 'Modelo de Bohr — WebXR',
    description: 'Mergulhe dentro do átomo em realidade virtual. Elétrons orbitam ao seu redor em escala real. Requer headset VR.',
    category: 'Química',
    available: true,
    xr: 'vr',
    folder: 'chemistry/xrBhorModel',
    theoryFolder: 'chemistry/BohrModel',
  },
  {
    id: 'ar-bohr-model',
    title: 'Modelo de Bohr — AR',
    description: 'Posicione o átomo sobre uma mesa ou o chão pela câmera do celular e ajuste com os dedos: arraste, aumente e gire.',
    category: 'Química',
    available: true,
    xr: 'ar',
    folder: 'chemistry/arBohrModel',
    theoryFolder: 'chemistry/BohrModel',
  },
  {
    id: 'molecular-geometry',
    title: 'Geometria Molecular',
    description: 'Visualize as geometrias VSEPR em 3D: angular, tetraédrica, piramidal, octaédrica e mais.',
    category: 'Química',
    available: true,
    folder: 'chemistry/MolecularGeometry',
  },
  {
    id: 'ar-molecular-geometry',
    title: 'Geometria Molecular — AR',
    description: 'Posicione moléculas em 3D sobre a sua mesa pela câmera do celular e observe as geometrias VSEPR de todos os ângulos.',
    category: 'Química',
    available: true,
    xr: 'ar',
    folder: 'chemistry/arMolecularGeometry',
    theoryFolder: 'chemistry/MolecularGeometry',
  },
  {
    id: 'boyle-law',
    title: 'Lei de Boyle com as Mãos',
    description: 'Comprima um gás com as próprias mãos diante da webcam e veja a pressão subir: P·V constante, medido ao vivo com MediaPipe.',
    category: 'Química',
    available: true,
    folder: 'chemistry/BoyleHands',
  },
  {
    id: 'simple-pendulum',
    title: 'Pêndulo Simples',
    description: 'Simule o movimento oscilatório de um pêndulo com física real, ajustando comprimento e gravidade.',
    category: 'Física',
    available: true,
    folder: 'physics/Pendulum',
  },
  {
    id: 'projectile-motion',
    title: 'Lançamento de Projétil',
    description: 'Visualize a trajetória parabólica com controle de ângulo e velocidade inicial.',
    category: 'Física',
    available: true,
    folder: 'physics/Projectile',
  },
  {
    id: 'hand-kinematics',
    title: 'Você é o Móvel',
    description: 'Mova a mão diante da webcam e veja os gráficos de posição e velocidade se formarem ao vivo. Desafios de MU e MUV com nota.',
    category: 'Física',
    available: true,
    folder: 'physics/HandKinematics',
  },
  {
    id: 'planetary-motion',
    title: 'Sistema Solar',
    description: 'Todos os 8 planetas em órbita com períodos reais relativos. Sol ilumina com falloff gravitacional.',
    category: 'Física',
    available: true,
    folder: 'physics/SolarSystem',
  },
  {
    id: 'mechanical-waves',
    title: 'Ondas Mecânicas',
    description: 'Visualize propagação, reflexão e interferência de ondas em diferentes meios.',
    category: 'Física',
    available: true,
    folder: 'physics/Waves',
  },
  {
    id: 'dna-helix',
    title: 'Dupla Hélice de DNA',
    description: 'Visualize a estrutura tridimensional da dupla hélice com pares de bases A-T e G-C em rotação contínua.',
    category: 'Biologia',
    available: true,
    folder: 'biology/DnaHelix',
  },
  {
    id: 'xr-dna-helix',
    title: 'Dupla Hélice de DNA — WebXR',
    description: 'Explore a hélice de DNA em escala humana em realidade virtual. A estrutura tem mais de 10 metros de altura. Requer headset VR.',
    category: 'Biologia',
    available: true,
    xr: 'vr',
    folder: 'biology/xrDnaHelix',
    theoryFolder: 'biology/DnaHelix',
  },
  {
    id: 'ar-dna-helix',
    title: 'Dupla Hélice de DNA — AR',
    description: 'Coloque a hélice de DNA sobre uma superfície real pela câmera do celular, redimensione com pinça e caminhe ao redor dela.',
    category: 'Biologia',
    available: true,
    xr: 'ar',
    folder: 'biology/arDnaHelix',
    theoryFolder: 'biology/DnaHelix',
  },
  {
    id: 'frog-dissection',
    title: 'Dissecação Guiada por Gestos',
    description: 'Abra e dissecte um sapo virtual usando gestos de pinça capturados pela webcam via MediaPipe — sem controle, sem mouse.',
    category: 'Biologia',
    available: true,
    folder: 'biology/FrogDissection',
  },
  {
    id: 'cell-division',
    title: 'Divisão Celular',
    description: 'Acompanhe as fases da mitose e meiose com animação 3D dos cromossomos e fuso mitótico.',
    category: 'Biologia',
    available: false,
  },
  {
    id: 'dna-replication',
    title: 'Replicação do DNA',
    description: 'Visualize o processo de duplicação da dupla hélice com as enzimas envolvidas em tempo real.',
    category: 'Biologia',
    available: false,
  },
  {
    id: 'action-potential',
    title: 'Potencial de Ação',
    description: 'Simule a propagação do impulso nervoso ao longo do axônio com controle de limiar de disparo.',
    category: 'Biologia',
    available: false,
  },
];
