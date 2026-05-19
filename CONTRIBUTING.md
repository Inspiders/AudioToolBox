# Guia de Contribuição para AudioToolBox

Bem-vindo ao guia de contribuição do AudioToolBox! Agradecemos o seu interesse em melhorar este projeto. Para garantir uma colaboração eficiente e um código de alta qualidade, por favor, siga estas diretrizes.

## Como Contribuir

### 1. Faça um Fork do Repositório

Primeiro, faça um fork do repositório `AudioToolBox` para a sua conta GitHub.

### 2. Clone o seu Fork

Clone o seu repositório forked para a sua máquina local:

```bash
git clone https://github.com/SEU_USUARIO/AudioToolBox.git
cd AudioToolBox
```

Substitua `SEU_USUARIO` pelo seu nome de utilizador do GitHub.

### 3. Crie uma Nova Branch

Crie uma branch separada para as suas alterações. Use nomes descritivos para as branches (ex: `feature/nova-funcionalidade`, `bugfix/correcao-de-erro`, `docs/melhoria-readme`).

```bash
git checkout -b feature/nome-da-sua-branch
```

### 4. Faça as suas Alterações

Implemente as suas alterações ou novas funcionalidades. Certifique-se de:

*   Seguir as convenções de estilo de código existentes no projeto.
*   Adicionar comentários relevantes ao seu código.
*   Atualizar a documentação (README.md, etc.) se as suas alterações afetarem a forma como o projeto é usado ou configurado.
*   Adicionar testes para novas funcionalidades ou para corrigir bugs, se aplicável.

### 5. Teste as suas Alterações

Antes de submeter um Pull Request, certifique-se de que o projeto ainda funciona corretamente e que as suas alterações não introduziram novos bugs. Execute os testes existentes e, se possível, adicione novos testes para cobrir o seu código.

### 6. Commit as suas Alterações

Faça commit das suas alterações com mensagens claras e concritadas. Use o formato de mensagem de commit convencional (ex: `feat: Adicionar nova funcionalidade`, `fix: Corrigir bug de login`, `docs: Atualizar seção de instalação`).

```bash
git add .
git commit -m "feat: Sua mensagem de commit aqui"
```

### 7. Envie as suas Alterações para o seu Fork

```bash
git push origin feature/nome-da-sua-branch
```

### 8. Abra um Pull Request (PR)

Navegue até o seu repositório forked no GitHub e clique no botão "New Pull Request". Forneça uma descrição detalhada do seu PR, incluindo:

*   Qual problema o seu PR resolve ou qual funcionalidade ele adiciona.
*   Como você testou as suas alterações.
*   Quaisquer considerações adicionais.

## Convenções de Código

*   **JavaScript/React:** Siga as melhores práticas e padrões de codificação para React. Utilize ESLint para garantir a consistência.
*   **Nomenclatura:** Use nomes de variáveis, funções e classes descritivos e consistentes.

## Reportar Bugs

Se encontrar um bug, por favor, abra uma issue no repositório principal. Inclua o máximo de detalhes possível, como:

*   Passos para reproduzir o bug.
*   Comportamento esperado vs. comportamento atual.
*   Capturas de ecrã ou logs de erro, se relevantes.
*   Versão do sistema operativo e do Node.js/Electron que está a usar.

## Sugerir Funcionalidades

Novas ideias são sempre bem-vindas! Se tiver uma sugestão de funcionalidade, abra uma issue e descreva a sua ideia em detalhe. Explique o problema que a funcionalidade resolveria e como ela beneficiaria os utilizadores.

Obrigado por contribuir para o AudioToolBox!
