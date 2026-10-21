# CLARA.js — Documento de Requisitos

**Centro de Laboratórios para Aprendizagem e Representação Analítica**

| | |
|---|---|
| Versão | 1.0 |
| Data | 10/10/2026 |
| Autor | Darlan Ferreira |
| Situação | Reflete o sistema implementado na branch `main` nesta data |

---

## Sumário

1. [Introdução](#1-introdução)
2. [Descrição geral](#2-descrição-geral)
3. [Requisitos funcionais](#3-requisitos-funcionais)
4. [Requisitos não funcionais](#4-requisitos-não-funcionais)
5. [Restrições de projeto](#5-restrições-de-projeto)
6. [Requisitos planejados (fora do escopo atual)](#6-requisitos-planejados-fora-do-escopo-atual)
7. [Rastreabilidade](#7-rastreabilidade)

---

## 1. Introdução

### 1.1 Propósito

Este documento especifica os requisitos funcionais e não funcionais do **CLARA.js**, plataforma web de laboratórios virtuais de Física, Química e Biologia desenvolvida como Trabalho de Conclusão de Curso em Ciência da Computação. Serve como referência para a manutenção do sistema, para a sua avaliação e para a monografia.

A estrutura segue, de forma simplificada, as recomendações da ISO/IEC/IEEE 29148 (engenharia de requisitos), e os requisitos não funcionais são organizados pelas características de qualidade da ISO/IEC 25010.

### 1.2 Escopo

O CLARA.js é uma aplicação de página única (*SPA*) executada inteiramente no navegador, sem servidor de aplicação. Oferece experimentos interativos em três dimensões e em duas dimensões, acessíveis por quatro formas de interação:

- **tela** (computador e celular), com mouse, toque e teclado;
- **realidade virtual imersiva** (headset compatível com WebXR);
- **realidade aumentada** (celular Android com ARCore);
- **interação natural por gestos**, com as mãos rastreadas pela webcam (MediaPipe).

A contribuição técnica do trabalho é a **arquitetura de software** que permite apresentar o mesmo modelo científico nessas diferentes formas; o site é a prova de conceito dessa arquitetura.

**Fora do escopo:** cadastro e autenticação de usuários, armazenamento de dados de alunos, avaliação formal com registro de notas, conteúdo além dos experimentos listados na seção 3.

### 1.3 Definições

| Termo | Definição |
|---|---|
| **Experimento** | Simulação interativa de um fenômeno científico, com seu modelo, sua visualização e seus controles. |
| **Galeria** | Tela que lista todos os experimentos em cards, com busca e filtro por área. |
| **Museu Virtual** | Ambiente virtual 3D navegável em primeira pessoa (o *Museu CLARA.js*), organizado como um edifício de exposições, no qual cada sala abriga um experimento. É realidade virtual **não imersiva** quando acessado por tela. |
| **Sala interativa** | Espaço do Museu Virtual onde um experimento aparece em escala de sala e pode ser ajustado. |
| **Experimento montável** | Experimento que segue o contrato `mount / tick / update / dispose`, permitindo ser exibido por diferentes hospedeiros. |
| **Hospedeiro** | Componente que fornece a um experimento montável o renderizador, a câmera, a iluminação e o laço de animação: a página (`hostInPage`), a sala interativa ou a realidade aumentada (`hostInAR`). |
| **RV / RA** | Realidade virtual / realidade aumentada. |
| **WebXR** | API padrão W3C de realidade virtual e aumentada para navegadores. |
| **MediaPipe** | Biblioteca do Google de visão computacional; aqui, o detector de 21 pontos da mão (*Hand Landmarker*). |
| **Hit-test** | Recurso do WebXR que informa onde um raio partindo da tela encontra uma superfície real detectada. |
| **u.a.** | Unidades arbitrárias. |

### 1.4 Convenções deste documento

Cada requisito tem um identificador único (**RF-xx** para funcionais, **RNF-xx** para não funcionais) e os campos:

- **Prioridade:** *Essencial* (sem ele o sistema não cumpre o propósito), *Importante* ou *Desejável*.
- **Situação:** *Atendido* (implementado e verificado), *Parcial*, *Não verificado* (implementado, mas sem medição ou teste que comprove o critério) ou *Planejado*.
- **Onde:** arquivo ou pasta principal que implementa o requisito (caminhos relativos a `frontend/src/`).

---

## 2. Descrição geral

### 2.1 Perspectiva do produto

Aplicação web estática, distribuída pelo GitHub Pages. Todo o processamento (simulação física, renderização 3D, inferência da rede neural de rastreamento das mãos) acontece no dispositivo do usuário. Os únicos recursos externos carregados em tempo de execução são o *runtime* WebAssembly e o modelo do MediaPipe, obtidos de CDN apenas nos experimentos que usam a webcam.

### 2.2 Usuários

| Usuário | Descrição | Uso principal |
|---|---|---|
| **Estudante** | Aluno do ensino médio ou do início da graduação | Explorar os experimentos, ler a teoria, cumprir os desafios |
| **Professor** | Docente de Física, Química ou Biologia | Demonstrar fenômenos em aula (projetor, celulares, headset) |
| **Mantenedor** | Desenvolvedor que evolui a plataforma | Adicionar e alterar experimentos seguindo a arquitetura |

### 2.3 Ambiente de operação

| Dispositivo | Navegador | Modalidades disponíveis |
|---|---|---|
| Computador (Windows, macOS, Linux) | Chrome, Edge, Firefox, Safari recentes | Galeria, Museu Virtual, webcam |
| Celular Android | Chrome | Galeria, Museu Virtual (toque), realidade aumentada, webcam |
| Celular iOS | Safari | Galeria, Museu Virtual (toque), webcam; **sem** realidade aumentada |
| Headset (ex.: Meta Quest) | Navegador do headset | Experimentos em realidade virtual |

### 2.4 Premissas e dependências

- O navegador suporta WebGL 2.
- Câmera e WebXR exigem contexto seguro (HTTPS); o site publicado atende a isso.
- Realidade aumentada depende do ARCore (Google Play Services para RA) no aparelho.
- Os experimentos de webcam precisam de internet no primeiro acesso para baixar o modelo do MediaPipe.

---

## 3. Requisitos funcionais

### 3.1 Navegação e interface geral

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-01 | O sistema deve apresentar uma tela inicial para escolher entre **Galeria** e **Museu Virtual**. | Essencial | Atendido | `pages/ModeSelect.tsx` |
| RF-02 | A Galeria deve listar os experimentos disponíveis em cards com título, descrição e área. | Essencial | Atendido | `pages/Home.tsx` |
| RF-03 | A Galeria deve permitir **buscar** experimentos por texto (título e descrição). | Importante | Atendido | `pages/Home.tsx` |
| RF-04 | A Galeria deve permitir **filtrar** por área: Todas, Física, Química, Biologia. | Importante | Atendido | `pages/Home.tsx` |
| RF-05 | A Galeria deve exibir experimentos planejados numa seção "Em breve", sem permitir abri-los. | Desejável | Atendido | `simulations/registry.ts` (`available: false`) |
| RF-06 | O sistema deve oferecer tema **escuro** (padrão) e **claro**, alternável pelo usuário. | Desejável | Atendido | `App.tsx`, `index.css` |
| RF-07 | Cada tela e cada experimento deve ter um **endereço próprio** (`#/id`), permitindo link direto e recarregar a página sem perder a tela. | Importante | Atendido | `App.tsx` |
| RF-08 | O botão **voltar do navegador** deve retornar à tela anterior do site, e não sair do site. | Essencial | Atendido | `App.tsx` (`navigate`, `goBack`) |
| RF-09 | O sistema deve ter uma página **Sobre** com o significado da sigla CLARA, o contexto do TCC, as tecnologias e atalhos para Galeria e Museu Virtual. | Importante | Atendido | `pages/About.tsx` |

### 3.2 Moldura comum dos experimentos

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-10 | Todo experimento deve ter um botão **Voltar**. | Essencial | Atendido | `components/ExperimentShell/` |
| RF-11 | Todo experimento deve ter um botão **Teoria** que abre o conteúdo didático do fenômeno. | Importante | Atendido | `ExperimentShell`, `teoria.md` de cada experimento |
| RF-12 | Todo experimento deve ter um botão **Como foi feito** que abre a documentação técnica de sua construção. | Importante | Atendido | `ExperimentShell`, `README.md` de cada experimento |
| RF-13 | O painel de Teoria / Como foi feito deve permitir alternar entre as duas abas e fechar com o botão ✕ ou a tecla Esc. | Desejável | Atendido | `ExperimentShell` |
| RF-14 | Variantes de um mesmo experimento (VR, AR) devem reaproveitar a teoria do experimento base. | Desejável | Atendido | `registry.ts` (`theoryFolder`) |

### 3.3 Experimentos de Física

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-15 | **Pêndulo Simples:** simular a oscilação de um pêndulo pela equação não linear θ'' = −(g/L)·sen θ, com controles de comprimento (0,5–3 m), gravidade (1–20 m/s²) e ângulo inicial (−170° a 170°), exibindo o período pela aproximação de pequenos ângulos. | Essencial | Atendido | `simulations/physics/Pendulum/` |
| RF-16 | **Lançamento de Projétil:** simular o lançamento oblíquo sem resistência do ar, com controles de velocidade inicial (5–40 m/s), ângulo (5°–85°) e gravidade (1–20 m/s²); mostrar a trajetória prevista, disparar e resetar; exibir alcance, altura máxima e tempo de voo, com marcadores na cena após o pouso. | Essencial | Atendido | `simulations/physics/Projectile/` |
| RF-17 | **Sistema Solar:** exibir os 8 planetas em órbitas circulares com períodos proporcionais aos reais, com controle da velocidade do tempo (0,1×–10×) e indicação do tempo simulado em anos. | Importante | Atendido | `simulations/physics/SolarSystem/` |
| RF-18 | **Ondas Mecânicas:** exibir uma onda progressiva y = A·sen(kx − ωt) numa superfície 3D, com controles de amplitude (0,1–2 m), comprimento de onda (1–5 m) e frequência (0,1–3 Hz), exibindo k, ω, v e T. | Importante | Atendido | `simulations/physics/Waves/` |
| RF-19 | **Você é o Móvel:** usar a posição da mão do usuário, captada pela webcam, como a posição de um móvel, e desenhar em tempo real os gráficos de posição × tempo e velocidade × tempo. | Essencial | Atendido | `simulations/physics/HandKinematics/` |
| RF-20 | O "Você é o Móvel" deve **calibrar** a conversão de pixels para metros pelo tamanho da palma da mão, permitindo recalibrar. | Importante | Atendido | `HandKinematics/physics.ts` |
| RF-21 | O "Você é o Móvel" deve oferecer **desafios** (Repouso, Movimento uniforme, Ida e volta, Acelerando) com contagem regressiva, alvo tracejado, nota de 0 a 100 e explicação do conceito ao final. | Importante | Atendido | `HandKinematics/physics.ts`, `scene.ts` |

### 3.4 Experimentos de Química

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-22 | **Modelo de Bohr:** exibir o átomo dos 20 primeiros elementos (H a Ca) com núcleo e elétrons em camadas (raio ∝ n², velocidade angular ∝ 1/n³), com seleção do elemento e controle de velocidade (0,1×–4×). | Essencial | Atendido | `simulations/chemistry/BohrModel/` |
| RF-23 | O Modelo de Bohr deve aceitar uma **distribuição eletrônica digitada** pelo usuário (ex.: "2, 8, 1"), sinalizando entrada inválida sem alterar a cena. | Desejável | Atendido | `BohrModel/index.tsx` |
| RF-24 | **Geometria Molecular:** exibir as geometrias VSEPR de 7 moléculas (H₂O, CH₄, CO₂, NH₃, BF₃, PCl₅, SF₆), com nome da geometria, ângulo de ligação, número de pares solitários e uma nota explicativa. | Essencial | Atendido | `simulations/chemistry/MolecularGeometry/` |
| RF-25 | **Lei de Boyle com as Mãos:** representar um gás de partículas num recipiente cujas paredes laterais seguem as duas mãos do usuário, captadas pela webcam. | Essencial | Atendido | `simulations/chemistry/BoyleHands/` |
| RF-26 | A Lei de Boyle deve **medir** a pressão pelas colisões das partículas com as paredes e exibir volume, pressão, P·V e N·T em tempo real. | Essencial | Atendido | `BoyleHands/physics.ts` |
| RF-27 | A Lei de Boyle deve desenhar o **gráfico P × V** com os pontos medidos e a isoterma teórica, com opção de limpar o gráfico. | Importante | Atendido | `BoyleHands/scene.ts` |
| RF-28 | A Lei de Boyle deve permitir ajustar a **temperatura** (1–10 u.a.), mantida constante por um termostato. | Importante | Atendido | `BoyleHands/` |

### 3.5 Experimentos de Biologia

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-29 | **Dupla Hélice de DNA:** exibir a dupla hélice (modelo B) com fitas, nucleotídeos e pares de bases, com controle do número de pares (4–40) e da velocidade de rotação (0–0,5 volta/s). | Essencial | Atendido | `simulations/biology/DnaHelix/` |
| RF-30 | **Dissecação Guiada por Gestos:** permitir abrir a pele de um sapo virtual e extrair 5 órgãos (coração, pulmões, fígado, estômago, intestino) com o gesto de pinça captado pela webcam, arrastando-os até uma bandeja. | Essencial | Atendido | `simulations/biology/FrogDissection/` |
| RF-31 | A Dissecação deve indicar quais órgãos já foram extraídos e permitir **reiniciar**. | Importante | Atendido | `FrogDissection/index.tsx` |

### 3.6 Interação comum dos experimentos

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-32 | Os experimentos 3D na página devem permitir **girar, aproximar e afastar a câmera** com mouse ou toque. | Essencial | Atendido | `core/hostInPage.ts`, `scene.ts` de cada experimento |
| RF-33 | Os experimentos de webcam devem **pedir permissão** de câmera e informar o estado (carregando, mão não detectada, calibrando, pronto). | Essencial | Atendido | `components/handInput/useHandCamera.ts` |
| RF-34 | Se a câmera ou o modelo de rastreamento não estiverem disponíveis, os experimentos de webcam devem oferecer o **mouse/toque como alternativa**, avisando o usuário. | Essencial | Atendido | `useHandCamera.ts`, `index.tsx` dos experimentos de webcam |

### 3.7 Museu Virtual

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-35 | O Museu Virtual deve permitir **caminhar em primeira pessoa**: no computador, com W A S D ou setas e o mouse para olhar (Shift para correr); no celular, com um joystick na tela e arrastando o dedo para olhar. | Essencial | Atendido | `museum/scene.ts`, `museum/TouchControls.tsx` |
| RF-36 | O usuário não deve atravessar paredes nem obstáculos. | Importante | Atendido | `museum/layout.ts` (`constrainPosition`) |
| RF-37 | O salão deve ter uma **porta para cada experimento que possui sala interativa**, agrupadas em paredes por área do conhecimento, geradas automaticamente a partir do registro. | Essencial | Atendido | `museum/layout.ts`, `museum/index.tsx` |
| RF-38 | Ao se aproximar de uma porta, o sistema deve destacá-la e indicar como entrar (tecla E no computador; botão na tela no celular). | Importante | Atendido | `museum/scene.ts`, `museum/index.tsx` |
| RF-39 | Entrar numa porta deve levar à **sala interativa** do experimento por uma transição (escurecer e clarear), e a porta da sala deve levar de volta ao salão, na frente da porta de origem. | Essencial | Atendido | `museum/levels.ts`, `museum/scene.ts` |
| RF-40 | Dentro de uma sala, o usuário deve poder abrir um **painel de ajustes** (tecla Tab no computador; botão ⚙ no celular) com os parâmetros do experimento. | Essencial | Atendido | `components/ControlsHud/`, `sala.ts` de cada experimento |
| RF-41 | Na sala do Pêndulo, o usuário deve poder **pegar a massa**, posicioná-la num ângulo e soltá-la. | Desejável | Atendido | `simulations/physics/Pendulum/sala.ts` |
| RF-42 | O Museu Virtual deve ter uma tela de **instruções/pausa**, com os controles do dispositivo em uso, acessível pela tecla Esc ou pelo botão ❚❚. | Importante | Atendido | `museum/index.tsx` |
| RF-43 | Salas interativas disponíveis: Pêndulo, Modelo de Bohr, Geometria Molecular e Dupla Hélice de DNA. | Importante | Atendido | `sala.ts` nas pastas desses experimentos |

### 3.8 Realidade virtual

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-44 | O Modelo de Bohr e a Dupla Hélice de DNA devem ter variantes em **realidade virtual imersiva**, iniciadas por um botão quando houver headset compatível. | Importante | Atendido | `chemistry/xrBhorModel/`, `biology/xrDnaHelix/` |
| RF-45 | Na RV, os gatilhos dos controles devem trocar o elemento (Bohr) ou o número de pares de base (DNA), com um painel informativo dentro do ambiente 3D. | Importante | Atendido | `scene.ts` das variantes `xr*` |
| RF-46 | Fora do headset, as variantes de RV devem funcionar como prévia 3D na tela. | Importante | Atendido | idem |

### 3.9 Realidade aumentada

| ID | Requisito | Prioridade | Situação | Onde |
|---|---|---|---|---|
| RF-47 | Modelo de Bohr, Geometria Molecular e Dupla Hélice de DNA devem ter variantes em **realidade aumentada**. | Importante | Atendido | `ar/`, `ar.ts` das variantes `ar*` |
| RF-48 | O sistema deve detectar se o aparelho suporta RA; sem suporte, deve exibir uma prévia 3D e uma mensagem explicando o requisito (Android com Chrome). | Essencial | Atendido | `ar/scene.ts` (`isARSupported`), `ar/index.tsx` |
| RF-49 | Na sessão de RA, o sistema deve **detectar superfícies** e mostrar uma retícula onde o objeto será colocado. | Essencial | Atendido | `ar/scene.ts` (hit-test) |
| RF-50 | O usuário deve **tocar na tela para posicionar** o objeto sobre a superfície, de frente para ele. | Essencial | Atendido | `ar/scene.ts` |
| RF-51 | Após posicionado, o objeto deve poder ser **movido** (arrastar com um dedo), **redimensionado** (pinça, de 20% a 500%) e **girado** (dois dedos). | Essencial | Atendido | `ar/gestures.ts`, `ar/scene.ts` |
| RF-52 | Durante a sessão de RA devem estar disponíveis os botões **Reposicionar**, **Ajustes** (parâmetros do experimento) e **Sair**, além de instruções contextuais. | Importante | Atendido | `ar/index.tsx` (dom-overlay) |

---

## 4. Requisitos não funcionais

Organizados pelas características de qualidade da ISO/IEC 25010. Requisitos marcados como *Não verificado* estão implementados, mas ainda não têm medição que comprove o critério; o critério de verificação indica como medi-los.

### 4.1 Adequação funcional (correção científica)

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-01 | Os modelos devem seguir as equações de livro-texto do ensino médio e início da graduação, documentadas no `teoria.md` e no `README.md` de cada experimento. | Revisão da documentação de cada experimento | Atendido |
| RNF-02 | O integrador do Pêndulo deve conservar energia em oscilações longas (Euler semi-implícito, passo ≤ 20 ms independentemente do hospedeiro). | Teste: passo de 0,1 s subdividido produz o mesmo resultado que 5 passos de 0,02 s | Atendido |
| RNF-03 | Na Lei de Boyle, a pressão medida pelas colisões deve concordar com a teoria do gás ideal (P = N·T/V). | Erro ≤ 10% em V = 0,5, 1 e 2 u.a. (medido: 1,7%, 0,0% e 5,2%) | Atendido |
| RNF-04 | No "Você é o Móvel", a velocidade estimada deve recuperar movimentos conhecidos apesar do ruído da detecção. | MUV simulado de 4 cm/s² estimado em 4,00 cm/s²; MU de 8 cm/s com ruído de ±3 mm estimado entre 7 e 9 cm/s | Atendido |
| RNF-05 | As simulações devem limitar o passo de tempo (dt ≤ 50 ms), para não "saltar" ao voltar de uma aba em segundo plano. | Revisão de código dos laços de animação | Atendido |

### 4.2 Eficiência de desempenho

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-06 | Os experimentos devem manter **taxa de quadros interativa**: ≥ 30 quadros/s em computadores e celulares intermediários; na RV, a taxa nativa do headset (72–90 Hz). | Medição de FPS médio e do 1% pior por experimento e dispositivo | Não verificado |
| RNF-07 | A resolução de renderização deve ser limitada a 2× a densidade de pixels, para conter o custo em telas de alta densidade. | Revisão de código (`setPixelRatio`) | Parcial: as variantes de RV ainda não limitam |
| RNF-08 | O rastreamento das mãos deve executar a inferência **apenas quando há um quadro novo da câmera**. | Revisão de código (`useHandCamera`) | Atendido nos experimentos novos; a Dissecação infere a cada quadro de tela |
| RNF-09 | Os textos de Teoria e Como foi feito devem ser **carregados sob demanda**, apenas quando abertos. | Build gera um arquivo por texto | Atendido |
| RNF-10 | A primeira carga do site deve ser rápida em conexões móveis. | Lighthouse: tempo até o conteúdo principal e tamanho do pacote | Não verificado; o pacote principal tem ~1 MB (sem divisão por experimento) |
| RNF-11 | Atualizações de alta frequência (tempo simulado, leituras) não devem provocar renderizações desnecessárias da interface. | Revisão de código (atualizações limitadas a ~10 por segundo) | Atendido |

### 4.3 Compatibilidade e portabilidade

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-12 | O sistema deve funcionar **sem instalação**, acessado por uma URL em navegadores modernos. | Acesso ao site publicado | Atendido |
| RNF-13 | A interface deve se adaptar a telas pequenas (≤ 640 px): painéis em formato inferior (*bottom sheet*), botões só com ícones, controles de toque no Museu Virtual. | Uso em celular | Atendido |
| RNF-14 | Recursos que dependem de hardware ou do navegador (RV, RA, câmera) devem ser **detectados**, e sua ausência comunicada com uma alternativa, sem quebrar a página. | Abrir cada variante num dispositivo sem o recurso | Atendido |
| RNF-15 | A matriz de compatibilidade (navegador × dispositivo × modalidade) deve ser documentada. | Tabela preenchida a partir de testes manuais | Planejado |

### 4.4 Usabilidade

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-16 | Toda a interface e o conteúdo devem estar em **português do Brasil**. | Revisão da interface | Atendido |
| RNF-17 | Cada modalidade deve exibir instruções contextuais para o próximo passo (ex.: "Mova o celular devagar…", "Toque para posicionar", "Mostre as duas mãos…"). | Revisão da interface | Atendido |
| RNF-18 | As interações em RA devem seguir o padrão consolidado de aplicativos comerciais (retícula, tocar para posicionar, pinça, arrastar, girar). | Comparação com apps de referência | Atendido |
| RNF-19 | A nota dos desafios deve ser proporcional ao tamanho do movimento pedido, para não punir integralmente tentativas parcialmente corretas. | Teste: MU na metade da velocidade recebe nota intermediária (42/100) | Atendido |
| RNF-20 | A usabilidade percebida deve ser avaliada com usuários do público-alvo. | Questionário SUS (System Usability Scale) | Planejado |

### 4.5 Confiabilidade

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-21 | Ao sair de um experimento, todos os recursos de GPU, observadores, laços de animação, a câmera e o modelo de rastreamento devem ser **liberados**. | Abrir e fechar cada experimento repetidamente e acompanhar `renderer.info.memory` | Não verificado por medição; implementado em todos os experimentos (o vazamento conhecido do Modelo de Bohr foi corrigido) |
| RNF-22 | Falhas de câmera, de rede (CDN do MediaPipe) ou de suporte a RV/RA não devem interromper o restante do site. | Simulação de cada falha | Atendido |
| RNF-23 | A perda temporária do rastreamento (mão fora de quadro) deve manter o último estado válido em vez de causar saltos. | Uso com a mão saindo da câmera | Atendido |

### 4.6 Segurança e privacidade

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-24 | As imagens da webcam devem ser processadas **apenas no dispositivo**, sem envio a servidores. | Revisão de código e das requisições de rede | Atendido |
| RNF-25 | O sistema não deve coletar, armazenar nem transmitir dados pessoais dos usuários. | Revisão de código (sem backend, sem formulários, sem armazenamento) | Atendido |
| RNF-26 | O site deve ser servido por HTTPS. | Acesso ao site publicado | Atendido |

### 4.7 Manutenibilidade

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-27 | Cada experimento deve separar **domínio** (`physics.ts`, sem dependência de Three.js ou React), **apresentação** (`scene.ts`, sem dependência de React) e **página** (`index.tsx`). | Análise das importações | Atendido |
| RNF-28 | Os metadados dos experimentos devem ter **fonte única** (`registry.ts`), da qual derivam a Galeria, as portas do Museu Virtual e os textos. | Revisão de código | Atendido (o mapeamento id → componente ainda fica em `App.tsx`) |
| RNF-29 | Adicionar um experimento deve exigir apenas a criação da sua pasta, uma entrada no registro e o registro do componente no `App.tsx`. | Criação de um experimento novo seguindo o procedimento | Atendido |
| RNF-30 | Dar uma sala interativa ou uma variante de RA a um experimento montável deve exigir apenas um arquivo de definição curto (`sala.ts` / `ar.ts`), sem código de cena novo. | Tamanho das definições existentes (20–71 linhas) | Atendido |
| RNF-31 | Funcionalidades comuns (moldura, painel de ajustes, rastreamento das mãos, hospedeiros) devem existir em **um único lugar** e ser reaproveitadas. | Revisão de código | Atendido |
| RNF-32 | Cada experimento deve ter documentação técnica (`README.md`) e conteúdo didático (`teoria.md`). | Verificação das pastas | Atendido |
| RNF-33 | O código deve ser escrito em TypeScript e passar na verificação de tipos e no lint. | `npm run build` e `npm run lint` | Parcial: build sem erros; o lint aponta problemas antigos em três cenas não migradas |

### 4.8 Testabilidade

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-34 | O domínio de cada experimento deve ser testável **sem navegador e sem GPU**. | Execução de testes em Node | Atendido (verificado com testes executados durante o desenvolvimento) |
| RNF-35 | O projeto deve ter uma suíte de **testes automatizados** versionada, executável por `npm test` e no pipeline de implantação. | Existência e execução da suíte | Planejado |

### 4.9 Implantação

| ID | Requisito | Critério de verificação | Situação |
|---|---|---|---|
| RNF-36 | Cada atualização na branch `main` deve ser compilada e publicada automaticamente no GitHub Pages. | Workflow `.github/workflows/deploy.yml` | Atendido |
| RNF-37 | O artefato publicado deve ser estático (HTML, CSS, JavaScript e recursos), sem servidor de aplicação. | Conteúdo de `frontend/dist` | Atendido |

---

## 5. Restrições de projeto

| ID | Restrição |
|---|---|
| RP-01 | Linguagem TypeScript; interface em React; renderização 3D com Three.js. |
| RP-02 | Realidade virtual e aumentada exclusivamente pela API WebXR (sem SDKs nativos ou lojas de aplicativos). |
| RP-03 | Rastreamento das mãos com MediaPipe Tasks Vision (versão fixada em 1.0.1; o endereço do WASM acompanha a versão). |
| RP-04 | Sem backend: hospedagem estática no GitHub Pages, com base de URL `/TCC/`. |
| RP-05 | Navegação por *hash* (`#/…`), porque a hospedagem estática não redireciona rotas desconhecidas para o `index.html`. |
| RP-06 | Contexto seguro (HTTPS) obrigatório para câmera e WebXR, inclusive no ambiente de desenvolvimento. |

---

## 6. Requisitos planejados (fora do escopo atual)

| ID | Requisito | Prioridade |
|---|---|---|
| RF-P01 | Museu Virtual em realidade virtual imersiva, com locomoção por teletransporte e salas interativas dentro da mesma sessão WebXR. | Importante |
| RF-P02 | Museu Virtual em realidade aumentada (maquete sobre a mesa ou portais no ambiente). | Desejável |
| RF-P03 | Salas interativas para Ondas Mecânicas e Sistema Solar. | Desejável |
| RF-P04 | Experimentos "Divisão Celular", "Replicação do DNA" e "Potencial de Ação" (já listados como "Em breve"). | Desejável |
| RF-P05 | Gráfico de aceleração no "Você é o Móvel" e modo adiabático (sem termostato) na Lei de Boyle. | Desejável |
| RNF-P01 | Carregamento sob demanda de cada experimento (divisão do pacote), reduzindo a primeira carga. | Importante |
| RNF-P02 | Suíte de testes automatizados (unitários do domínio, de contrato dos experimentos montáveis, de vazamento de memória e ponta a ponta) integrada ao deploy. | Importante |
| RNF-P03 | Medição de desempenho (FPS, tempo de quadro, latência do rastreamento) em diferentes dispositivos. | Importante |

---

## 7. Rastreabilidade

Relação entre experimentos, modalidades e requisitos:

| Experimento | Página | Sala interativa | RV | RA | Webcam | Requisitos |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Pêndulo Simples | ✔ | ✔ | | | | RF-15, RF-41, RF-43, RNF-02 |
| Lançamento de Projétil | ✔ | | | | | RF-16 |
| Sistema Solar | ✔ | | | | | RF-17 |
| Ondas Mecânicas | ✔ | | | | | RF-18 |
| Você é o Móvel | | | | | ✔ | RF-19–RF-21, RF-33, RF-34, RNF-04, RNF-19 |
| Modelo de Bohr | ✔ | ✔ | ✔ | ✔ | | RF-22, RF-23, RF-43–RF-52 |
| Geometria Molecular | ✔ | ✔ | | ✔ | | RF-24, RF-43, RF-47–RF-52 |
| Lei de Boyle com as Mãos | | | | | ✔ | RF-25–RF-28, RF-33, RF-34, RNF-03 |
| Dupla Hélice de DNA | ✔ | ✔ | ✔ | ✔ | | RF-29, RF-43–RF-52 |
| Dissecação Guiada por Gestos | | | | | ✔ | RF-30, RF-31, RF-33, RF-34 |

Todos os experimentos atendem aos requisitos comuns RF-10 a RF-14 (moldura), RF-32 (câmera 3D, quando houver cena 3D na página) e aos requisitos não funcionais RNF-12 a RNF-14, RNF-16, RNF-21 a RNF-27 e RNF-32.
