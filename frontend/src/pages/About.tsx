// Página "Sobre": o que é o CLARA.js, o significado do nome e o contexto
// acadêmico (TCC). Os números são calculados a partir do registro, então
// ficam certos sozinhos quando um experimento ou sala interativa é adicionado.

import type { ReactNode } from 'react';
import { simulations } from '../simulations/registry';

// Dados do trabalho. Campos vazios não aparecem na página — preencha
// instituição e orientador(a) quando quiser exibi-los.
const PROJECT = {
  author: 'Darlan Ferreira',
  course: 'Ciência da Computação',
  institution: '',
  advisor: '',
  year: '2026',
  repository: 'https://github.com/darlan-ferreira1/CLARA.js',
};

// As cinco iniciais do nome. Os três aspectos da proposta (aprendizagem,
// representação e análise) recebem as cores das três áreas.
const LETTERS = [
  { letter: 'C', word: 'Centro', color: 'var(--text-muted)', text: 'Um ponto de encontro que reúne, num só lugar, experimentos de várias áreas.' },
  { letter: 'L', word: 'Laboratórios', color: 'var(--text-muted)', text: 'Laboratórios virtuais de Física, Química e Biologia, acessíveis pelo navegador.' },
  { letter: 'A', word: 'Aprendizagem', color: 'var(--accent-quimica)', text: 'Laboratórios voltados à prática: experimentar, errar e repetir sem custo nem risco.' },
  { letter: 'R', word: 'Representação', color: 'var(--accent-fisica)', text: 'A representação visual e interativa de fenômenos científicos em 3D, em realidade virtual e aumentada.' },
  { letter: 'A', word: 'Analítica', color: 'var(--accent-bio)', text: 'Observar e analisar os fenômenos por meio de simulações computacionais, ajustando parâmetros e vendo o resultado.' },
];

const TECH = [
  { name: 'Three.js', text: 'renderização 3D no navegador (WebGL)' },
  { name: 'WebXR', text: 'realidade virtual e aumentada sem instalar aplicativos' },
  { name: 'MediaPipe', text: 'rastreamento das mãos pela webcam, direto no dispositivo' },
  { name: 'React + TypeScript', text: 'interface e organização do código' },
];

// Contagem de salas interativas sem carregar os módulos (glob não-eager).
const ROOM_COUNT = Object.keys(import.meta.glob('../simulations/**/sala.ts')).length;

interface Props {
  onBack: () => void;
  onGoGallery: () => void;
  onGoMuseum: () => void;
}

export default function About({ onBack, onGoGallery, onGoMuseum }: Props) {
  const available = simulations.filter((s) => s.available);
  const areas = new Set(available.map((s) => s.category)).size;

  const projectRows = [
    ['Trabalho', 'Trabalho de Conclusão de Curso (TCC) de graduação'],
    ['Curso', PROJECT.course],
    ['Autor', PROJECT.author],
    ['Orientação', PROJECT.advisor],
    ['Instituição', PROJECT.institution],
    ['Ano', PROJECT.year],
  ].filter(([, value]) => value);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
      {/* Barra superior */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 880, margin: '0 auto', padding: '0 24px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Logo size="1.35rem" />
          <button onClick={onBack} style={ghostButton}>← Voltar</button>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 64px' }}>
        {/* Abertura */}
        <section style={{ textAlign: 'center', marginBottom: 56 }}>
          <Logo size="clamp(2.6rem, 8vw, 4rem)" />
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
            fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 12,
          }}>
            Centro de Laboratórios para Aprendizagem e Representação Analítica
          </p>
          <p style={{ maxWidth: 620, margin: '20px auto 0', lineHeight: 1.7, fontSize: 15 }}>
            Uma plataforma web de laboratórios virtuais de Física, Química e Biologia, com experimentos 3D
            interativos que funcionam direto no navegador — no computador, no celular e em realidade virtual
            ou aumentada.
          </p>
        </section>

        {/* Números */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 56,
        }}>
          {[
            [String(available.length), 'experimentos'],
            [String(areas), 'áreas do conhecimento'],
            [String(ROOM_COUNT), 'salas interativas no Museu Virtual'],
            ['0', 'instalações necessárias'],
          ].map(([value, label]) => (
            <div key={label} style={{ ...card, textAlign: 'center', padding: '18px 12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </section>

        {/* O nome */}
        <Section title="O nome">
          <p style={paragraph}>
            O nome <strong>CLARA.js</strong> é um acrônimo de <em>Centro de Laboratórios para Aprendizagem e
            Representação Analítica</em>, escolhido por seu caráter memorável e por sintetizar os principais
            aspectos da proposta: a disponibilização de laboratórios virtuais voltados à aprendizagem, a
            representação visual e interativa de fenômenos científicos e a possibilidade de observá-los e
            analisá-los por meio de simulações computacionais.
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '20px 0 24px',
          }}>
            {LETTERS.map((l, i) => (
              <div key={i} style={{ ...card, padding: '16px 16px', borderTop: `3px solid ${l.color}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: l.color, lineHeight: 1 }}>
                    {l.letter}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{l.word}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)' }}>{l.text}</div>
              </div>
            ))}
          </div>
          <p style={paragraph}>
            O nome também dialoga, intencionalmente, com o termo <strong>"clareza"</strong>, uma vez que a
            plataforma busca tornar visíveis e compreensíveis fenômenos que, na experiência cotidiana, permanecem
            abstratos ou imperceptíveis — como campos eletromagnéticos, estruturas moleculares ou trajetórias
            orbitais —, reforçando seu papel como instrumento de apoio à construção do conhecimento científico.
          </p>
        </Section>

        {/* Como explorar */}
        <Section title="Como explorar">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <ExploreCard
              title="Galeria"
              accent="var(--accent-quimica)"
              text="Todos os experimentos em cards. Cada um tem controles de parâmetros, a teoria por trás do fenômeno e a explicação de como foi construído."
              action="Abrir a Galeria"
              onClick={onGoGallery}
            />
            <ExploreCard
              title="Museu Virtual"
              accent="var(--accent-fisica)"
              text="Um ambiente 3D em primeira pessoa: caminhe pelo Museu CLARA.js e entre nas salas interativas, onde os experimentos acontecem em tamanho real."
              action="Entrar no Museu"
              onClick={onGoMuseum}
            />
          </div>
        </Section>

        {/* Tecnologias */}
        <Section title="Tecnologias">
          <p style={paragraph}>
            Tudo roda no próprio dispositivo do usuário, sem servidor: a física, a renderização 3D e até o
            reconhecimento das mãos pela câmera (as imagens nunca saem do aparelho).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 16 }}>
            {TECH.map((t) => (
              <div key={t.name} style={{ ...card, padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{t.text}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* O projeto */}
        <Section title="O projeto">
          <p style={paragraph}>
            O CLARA.js foi desenvolvido como Trabalho de Conclusão de Curso. Do ponto de vista da Ciência da
            Computação, a contribuição do trabalho é a <strong>arquitetura de software</strong> da plataforma — uma
            forma de organizar experimentos científicos para que o mesmo modelo funcione em diferentes formas de
            interação (tela, realidade virtual, realidade aumentada e gestos) — e o site é a prova de conceito
            dessa arquitetura.
          </p>
          <div style={{ ...card, padding: 0, marginTop: 18, overflow: 'hidden' }}>
            {projectRows.map(([label, value], i) => (
              <div key={label} style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '12px 18px',
                borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 14,
              }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 110 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
          <p style={{ ...paragraph, marginTop: 18 }}>
            Código-fonte:{' '}
            <a href={PROJECT.repository} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-quimica)' }}>
              {PROJECT.repository.replace('https://', '')}
            </a>
          </p>
        </Section>
      </main>
    </div>
  );
}

function Logo({ size }: { size: string }) {
  return (
    <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: size, color: 'var(--accent-fisica)' }}>
      CLARA<span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>.js</span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 52 }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700,
        marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExploreCard({ title, text, accent, action, onClick }: {
  title: string; text: string; accent: string; action: string; onClick: () => void;
}) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: accent }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', flex: 1 }}>{text}</div>
      <button onClick={onClick} style={{ ...ghostButton, alignSelf: 'flex-start', color: accent, borderColor: accent }}>
        {action} →
      </button>
    </div>
  );
}

const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '18px 20px',
} as const;

const paragraph = { fontSize: 15, lineHeight: 1.75 } as const;

const ghostButton = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-muted)',
  fontSize: 13,
  padding: '7px 16px',
  cursor: 'pointer',
} as const;
