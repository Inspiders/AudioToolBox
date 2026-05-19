# 🎧 AudioToolBox

🎵 **AudioToolBox** é uma aplicação de desktop desenvolvida com **Electron** e **React** para ajudar músicos, podcasters e criadores de conteúdo a gerenciar, editar e analisar seus áudios com facilidade.

Desenvolvido por: **Adelino Manuel - Inspiders** com apoio de **Sky4 HH**

---

## 🧠 Conceito

O objetivo do AudioToolBox é reunir, em um único lugar, ferramentas úteis como:

*   🎙️ Gravador de áudio
*   🎚️ Soundboard personalizável
*   🏷️ Editor de metadados (tags MP3)
*   🎼 Detector automático de BPM e escala musical

Ideal para produtores musicais, criadores de conteúdo, dubladores e entusiastas da edição de áudio!

---

## ✨ Funcionalidades Principais

*   **Gravação de Áudio:** Capture áudio de alta qualidade diretamente do seu desktop.
*   **Soundboard Personalizável:** Crie e gerencie soundboards com seus clipes de áudio favoritos para acesso rápido.
*   **Edição de Metadados MP3:** Edite tags ID3 de arquivos MP3, incluindo título, artista, álbum e capa.
*   **Análise de Áudio:** Detecção automática de BPM (Batidas por Minuto) e escala musical para auxiliar na produção.

---

## ⚙️ Tecnologias Utilizadas

*   **Electron:** Para construir a aplicação desktop cross-platform.
*   **React:** Interface de usuário moderna e responsiva.
*   **Vite:** Empacotador rápido para desenvolvimento React.
*   **(Opcional) ffmpeg:** Para manipulação e análise de áudio.
*   **Node.js:** Runtime backend que suporta Electron.
*   **TypeScript:** (em partes do projeto) – segurança de tipos em tempo de desenvolvimento.

---

## 📂 Estrutura de Pastas

```
AudioToolBox/
├── src/
│   ├── main/           # Código principal do Electron
│   ├── renderer/       # Interface React
│   └── preload.js      # Comunicação segura entre Electron e frontend
├── public/             # Arquivos públicos (ícones, imagens)
├── assets/             # Recursos estáticos
├── components/         # Componentes React reutilizáveis
├── hooks/              # Hooks personalizados
├── pages/              # Páginas principais da aplicação
├── store/              # Gerenciamento de estado (Redux, Context API)
├── services/           # Serviços de API e integração com Electron
├── node_modules/
├── package.json
├── README.md
└── ...
```

---

## 🧪 Como Rodar Localmente

Para configurar e executar o AudioToolBox no seu ambiente local, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/inspiders/AudioToolBox.git
    cd AudioToolBox
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Inicie a aplicação em modo de desenvolvimento:**
    ```bash
    npm start
    ```

**⚠️ Nota:** Certifique-se de que o Node.js e o npm estejam instalados na sua máquina.

---

## 🛠️ Funcionalidades Futuras (Roadmap)

*   🎛️ Equalizador de frequência em tempo real
*   🎙️ Transcrição automática de voz (usando IA)
*   🌐 Upload para SoundCloud / Spotify
*   📊 Visualização em espectrograma

---

## 🤝 Como Contribuir

Contribuições são o coração dos projetos de código aberto! Se você tem ideias, correções de bugs ou melhorias, sinta-se à vontade para contribuir. Por favor, consulte o nosso guia de contribuição detalhado em [CONTRIBUTING.md](CONTRIBUTING.md) para mais informações sobre como começar.

---

## 📝 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

Projeto criado por Adelino Manuel - Inspiders, com o apoio de Sky4 HH.
