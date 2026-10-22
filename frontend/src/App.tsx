import { useState, useEffect, type ReactNode } from 'react';
import ModeSelect from './pages/ModeSelect';
import Home from './pages/Home';
import About from './pages/About';
import ExperimentShell from './components/ExperimentShell/ExperimentShell';
import ARExperiment from './ar/index';
import { ar as bohrAR } from './simulations/chemistry/arBohrModel/ar';
import { ar as dnaAR } from './simulations/biology/arDnaHelix/ar';
import { ar as molAR } from './simulations/chemistry/arMolecularGeometry/ar';
import VirtualMuseum from './museum/index';
import { simulations } from './simulations/registry';
import BohrModelSimulation         from './simulations/chemistry/BohrModel/index';
import XRBohrModelSimulation       from './simulations/chemistry/xrBhorModel/index';
import MolecularGeometrySimulation from './simulations/chemistry/MolecularGeometry/index';
import DnaHelixSimulation          from './simulations/biology/DnaHelix/index';
import XRDnaHelixSimulation        from './simulations/biology/xrDnaHelix/index';
import FrogDissectionSimulation    from './simulations/biology/FrogDissection/index';
import PendulumSimulation          from './simulations/physics/Pendulum/index';
import WavesSimulation             from './simulations/physics/Waves/index';
import ProjectileSimulation        from './simulations/physics/Projectile/index';
import HandKinematicsSimulation    from './simulations/physics/HandKinematics/index';
import BoyleHandsSimulation        from './simulations/chemistry/BoyleHands/index';
import SolarSystemSimulation       from './simulations/physics/SolarSystem/index';

type Theme = 'dark' | 'light';

const PAGES = [
  'select',
  'home',
  'museu',
  'sobre',
  'bohr-model',
  'xr-bohr-model',
  'ar-bohr-model',
  'ar-molecular-geometry',
  'molecular-geometry',
  'dna-helix',
  'xr-dna-helix',
  'ar-dna-helix',
  'frog-dissection',
  'simple-pendulum',
  'mechanical-waves',
  'projectile-motion',
  'planetary-motion',
  'hand-kinematics',
  'boyle-law',
] as const;

type Page = (typeof PAGES)[number];

// Experimentos: id → como renderizar. Todos são envolvidos pela mesma moldura
// (ExperimentShell), que fornece os botões Teoria / Como foi feito / Voltar.
const EXPERIMENTS: Partial<Record<Page, (theme: Theme) => ReactNode>> = {
  'bohr-model':         (theme) => <BohrModelSimulation theme={theme} />,
  'xr-bohr-model':      ()      => <XRBohrModelSimulation />,
  'ar-bohr-model':      ()      => <ARExperiment def={bohrAR} title="Modelo de Bohr" />,
  'ar-molecular-geometry': ()   => <ARExperiment def={molAR} title="Geometria Molecular" />,
  'molecular-geometry': (theme) => <MolecularGeometrySimulation theme={theme} />,
  'dna-helix':          (theme) => <DnaHelixSimulation theme={theme} />,
  'xr-dna-helix':       ()      => <XRDnaHelixSimulation />,
  'ar-dna-helix':       ()      => <ARExperiment def={dnaAR} title="Dupla Hélice de DNA" />,
  'frog-dissection':    ()      => <FrogDissectionSimulation />,
  'simple-pendulum':    (theme) => <PendulumSimulation theme={theme} />,
  'mechanical-waves':   (theme) => <WavesSimulation theme={theme} />,
  'projectile-motion':  (theme) => <ProjectileSimulation theme={theme} />,
  'planetary-motion':   (theme) => <SolarSystemSimulation theme={theme} />,
  'hand-kinematics':    (theme) => <HandKinematicsSimulation theme={theme} />,
  'boyle-law':          (theme) => <BoyleHandsSimulation theme={theme} />,
};

// Roteamento por hash: cada página tem uma URL própria (#/home, #/simple-pendulum…),
// então o histórico do navegador (botão voltar/avançar) e links diretos funcionam.
// Usa hash em vez de caminhos (/home) porque o GitHub Pages não reescreve rotas
// desconhecidas para o index.html — um F5 em /CLARA.js/home daria 404.
function isPage(id: string): id is Page {
  return (PAGES as readonly string[]).includes(id);
}

function pageFromHash(): Page {
  const id = window.location.hash.replace(/^#\/?/, '');
  return isPage(id) ? id : 'select';
}

function hashFor(page: Page): string {
  return page === 'select' ? '#/' : `#/${page}`;
}

// Marca as entradas de histórico criadas pela própria aplicação. Assim o botão
// "Voltar" do site sabe se pode simplesmente desfazer a última navegação
// (history.back) ou se o usuário chegou por link direto e não há para onde voltar.
const IN_APP = { clara: true };

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [page,  setPage ] = useState<Page>(pageFromHash);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Voltar/avançar do navegador (e edição manual da URL) disparam popstate:
  // basta reler o hash para descobrir a página.
  useEffect(() => {
    const onPopState = () => setPage(pageFromHash());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(to: Page) {
    if (to === page) return;
    window.history.pushState(IN_APP, '', hashFor(to));
    setPage(to);
  }

  // Botão "Voltar" do site: se a página anterior também é da aplicação, volta no
  // histórico (mantendo-o coerente com o botão do navegador); senão, substitui a
  // entrada atual pelo destino padrão sem criar uma nova.
  function goBack(fallback: Page) {
    if ((window.history.state as typeof IN_APP | null)?.clara) {
      window.history.back();
    } else {
      window.history.replaceState(null, '', hashFor(fallback));
      setPage(fallback);
    }
  }

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const goHome      = () => goBack('home');

  if (page === 'select')
    return (
      <ModeSelect
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelect={(mode) => navigate(mode === 'gallery' ? 'home' : 'museu')}
      />
    );

  if (page === 'museu')
    return (
      <VirtualMuseum
        theme={theme}
        onEnter={(id) => { if (isPage(id)) navigate(id); }}
        onBack={() => goBack('select')}
      />
    );

  if (page === 'sobre')
    return <About onBack={goHome} onGoGallery={() => navigate('home')} onGoMuseum={() => navigate('museu')} />;

  const renderExperiment = EXPERIMENTS[page];
  if (renderExperiment)
    return (
      // key: ao trocar de experimento a moldura é recriada (painel fecha).
      <ExperimentShell key={page} meta={simulations.find((s) => s.id === page)} onBack={goHome}>
        {renderExperiment(theme)}
      </ExperimentShell>
    );

  return (
    <Home
      onNavigate={(id) => { if (isPage(id)) navigate(id); }}
      onGoMuseum={() => navigate('museu')}
      onGoSobre={() => navigate('sobre')}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
