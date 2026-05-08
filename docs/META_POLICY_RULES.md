# META_POLICY_RULES.md — Regras da Meta para Templates WhatsApp

## Fonte

Baseado na documentação oficial da Meta WhatsApp Business API.
Versão de referência: Graph API v18.0+

> Estas regras são carregadas pelo `policy_reviewer` agent em cada validação.

---

## Categorias de Templates

### MARKETING
- Usado para promoções, ofertas, lançamentos e engajamento geral
- Exige opt-in explícito do usuário para receber mensagens de marketing
- Taxa de cobrança por mensagem entregue (mesmo sem abertura)
- **Mais sujeito a rejeição** — conteúdo deve ser claramente relevante ao usuário

### UTILITY
- Confirmações de transação, atualizações de pedido, lembretes de compromisso
- Deve estar diretamente relacionado a uma ação prévia do usuário
- Taxa menor que MARKETING
- **Não pode conter ofertas ou promoções** dentro do conteúdo

### AUTHENTICATION
- Exclusivo para envio de OTPs (One-Time Passwords)
- Formato altamente restrito — somente botão `COPY_CODE` permitido
- Sem HEADER de mídia
- Texto do BODY predefinido com variável de código

---

## Regras Gerais de Conteúdo

### Proibições Absolutas (resultam em rejeição imediata)

```
BLOCK: Conteúdo que viola leis locais ou direitos humanos
BLOCK: Conteúdo sexual explícito ou sugestivo
BLOCK: Promoção de álcool, tabaco ou drogas ilegais
BLOCK: Jogos de azar não licenciados
BLOCK: Armas e munições
BLOCK: Produtos farmacêuticos sem prescrição indevidos
BLOCK: Conteúdo enganoso, falso ou fraudulento
BLOCK: Phishing ou coleta indevida de dados
BLOCK: Ameaças ou conteúdo de ódio
BLOCK: Conteúdo de exploração infantil
```

### Restrições por Setor

```
WARN: Saúde — não fazer promessas de cura, mencionar profissional responsável
WARN: Financeiro — incluir disclaimers sobre riscos quando aplicável
WARN: Político — sem conteúdo de campanha eleitoral
WARN: Imóveis — informações de preço devem ser precisas
```

---

## Regras de Formato

### Variáveis

- Devem ser numeradas sequencialmente: `{{1}}`, `{{2}}`, `{{3}}`...
- Não pular números (não pode ter `{{1}}` e `{{3}}` sem `{{2}}`)
- Cada variável precisa de um `example` correspondente
- Exemplos devem ser valores reais plausíveis, não `[NOME]` ou `EXEMPLO`

### Comprimento

| Componente | Máximo         |
|------------|----------------|
| BODY text  | 1024 caracteres|
| FOOTER text| 60 caracteres  |
| HEADER text| 60 caracteres  |
| Button text| 25 caracteres  |
| Template name | 512 caracteres |

### Botões

| Tipo         | Máximo | Observações                              |
|--------------|--------|------------------------------------------|
| QUICK_REPLY  | 3      | Não misturar com botões de ação          |
| URL          | 2      | Pode ter variável dinâmica no final da URL|
| PHONE_NUMBER | 1      | Máximo 1 por template                    |
| COPY_CODE    | 1      | Exclusivo de AUTHENTICATION              |

- Não é possível misturar `QUICK_REPLY` com `URL` ou `PHONE_NUMBER` no mesmo template
- Total máximo de botões: 3

---

## Regras por Categoria

### MARKETING — Restrições Adicionais

- Não usar linguagem de urgência excessiva ("AGORA", "ÚLTIMAS HORAS", "CORRA")
- Não prometer resultados garantidos
- Deve ser possível identificar claramente quem está enviando
- Oferta deve ser real e disponível no momento do envio

### UTILITY — Restrições Adicionais

- Conteúdo deve ser diretamente relacionado a uma transação ou ação do usuário
- **Proibido** incluir cross-sell ou upsell no mesmo template
- Exemplo válido: confirmação de pedido, lembrete de consulta
- Exemplo inválido: confirmação de pedido + oferta de produto relacionado

### AUTHENTICATION — Restrições Adicionais

- BODY deve seguir formato: `Seu código de verificação é {{1}}. Não compartilhe com ninguém.`
- Apenas botão COPY_CODE é permitido
- Validade do código deve ser mencionada se aplicável

---

## Razões Comuns de Rejeição

| Código da Meta         | Significado                                              |
|------------------------|----------------------------------------------------------|
| `INVALID_FORMAT`       | JSON malformado ou campo obrigatório ausente             |
| `TAG_CONTENT_MISMATCH` | Conteúdo não condiz com a categoria declarada            |
| `SCAM`                 | Conteúdo parece fraudulento ou enganoso                  |
| `ABUSIVE_CONTENT`      | Conteúdo viola políticas de uso                          |
| `PROMOTIONAL_CONTENT`  | Conteúdo promocional em template UTILITY                 |
| `INCORRECT_CATEGORY`   | Categoria errada para o tipo de conteúdo                 |
| `MISSING_VARIABLE_EXAMPLE` | Exemplos de variáveis não fornecidos               |

---

## Boas Práticas para Alta Taxa de Aprovação

1. **Seja específico** — templates vagos são rejeitados com mais frequência
2. **Inclua exemplos realistas** — use dados reais nos campos `example`
3. **Mantenha consistência** — nome do template deve refletir seu conteúdo
4. **Evite ALL CAPS** — Meta interpreta como grito/urgência indevida
5. **Use linguagem natural** — evitar estruturas robóticas ou muito formais
6. **Prefira UTILITY** — aprovação mais rápida e custo menor que MARKETING
7. **Teste o nome** — nomes com palavras como "promo", "oferta", "gratis" aumentam escrutínio
