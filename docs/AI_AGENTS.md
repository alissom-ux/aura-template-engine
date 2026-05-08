# AI_AGENTS.md — Definição dos Agentes de IA

## Visão Geral

O pipeline de criação de templates é executado por uma cadeia de agentes especializados.
Cada agente tem uma responsabilidade única e bem definida.

```
Intent + BusinessContext
        │
        ▼
  [1. Strategist]      → Define estrutura e estratégia
        │
        ▼
  [2. Copywriter]      → Escreve o conteúdo
        │
        ▼
  [3. Policy Reviewer] → Valida regras do negócio e da Meta
        │
        ▼
  [4. Compiler]        → Monta o objeto final para a Meta API
        │
        ▼
  [5. Auditor]         → Auditoria final e score de aprovação
        │
        ▼
     Template Pronto
```

---

## Agente 1: Strategist

**Responsabilidade:** Entender a intenção e definir a estratégia do template.

**Input:**
- `intent`: O que o template deve comunicar
- `businessContext`: Contexto completo do negócio
- `category`: MARKETING | UTILITY | AUTHENTICATION

**Output:**
```typescript
interface StrategyPlan {
  templateCategory: TemplateCategory;
  recommendedComponents: string[];       // ["HEADER", "BODY", "FOOTER", "BUTTONS"]
  messagingGoal: string;                 // Objetivo claro da mensagem
  keyMessages: string[];                 // Pontos principais a comunicar
  suggestedVariables: TemplateVariable[];
  callToAction?: string;
  warnings: string[];                    // Alertas de viabilidade
}
```

**Instruções ao LLM:**
- Analisar se o objetivo é viável como template WhatsApp
- Identificar variáveis necessárias
- Sugerir a categoria correta se diferente da solicitada
- Alertar sobre intenções que violariam políticas da Meta

---

## Agente 2: Copywriter

**Responsabilidade:** Escrever o conteúdo do template com base na estratégia.

**Input:**
- `strategyPlan`: Resultado do Strategist
- `businessContext`: Tom de voz, público, exemplos
- `language`: Idioma alvo

**Output:**
```typescript
interface CopywriterOutput {
  components: TemplateComponent[];
  variablesUsed: TemplateVariable[];
  copyNotes: string;     // Justificativa das escolhas
  alternatives?: TemplateComponent[][];  // Variações opcionais
}
```

**Instruções ao LLM:**
- Seguir rigorosamente o `tone` do BusinessContext
- Usar variáveis `{{1}}`, `{{2}}` onde especificado
- Manter body dentro de 1024 caracteres
- Evitar emojis em contextos formais
- Não inventar informações — usar apenas o que foi fornecido

---

## Agente 3: Policy Reviewer

**Responsabilidade:** Validar o conteúdo contra políticas da Meta e regras do negócio.

**Input:**
- `copywriterOutput`: Componentes escritos
- `businessContext.policies`: Políticas específicas do negócio
- `metaPolicyRules`: Regras carregadas do META_POLICY_RULES

**Output:**
```typescript
interface PolicyReviewResult {
  approved: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  suggestions: string[];
}

interface PolicyViolation {
  severity: "block" | "warn";
  rule: string;
  affectedText: string;
  suggestion: string;
}
```

**Instruções ao LLM:**
- Verificar cada `BusinessPolicy` com severity "block"
- Verificar regras da Meta: proibições, restrições por categoria
- Retornar `approved: false` se qualquer violação "block" for encontrada
- Sugerir correções específicas, não apenas apontar problemas

---

## Agente 4: Compiler

**Responsabilidade:** Montar o objeto JSON final no formato exato da Meta API.

**Input:**
- `copywriterOutput`: Componentes aprovados
- `templateMetadata`: name, category, language

**Output:**
```typescript
interface CompiledTemplate {
  name: string;
  category: string;
  language: string;
  components: MetaApiComponent[];  // Formato exato da Meta API
  submissionReady: boolean;
  compilationNotes: string[];
}
```

**Regras:**
- Output deve ser 100% compatível com `POST /v18.0/{waba-id}/message_templates`
- Validar formato das variáveis de exemplo (`example.body_text`)
- Garantir que botões estejam dentro dos limites permitidos
- Não adicionar campos não suportados pela Meta API

---

## Agente 5: Auditor

**Responsabilidade:** Auditoria final com score de probabilidade de aprovação.

**Input:**
- `compiledTemplate`: Template compilado
- `auditHistory`: Histórico de templates similares (futuro)

**Output:**
```typescript
interface AuditReport {
  overallScore: number;           // 0-100
  approvalProbability: "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
  checks: AuditCheck[];
  recommendation: "SUBMIT" | "REVIEW" | "REJECT";
  reasoning: string;
}

interface AuditCheck {
  category: string;
  passed: boolean;
  score: number;
  notes: string;
}
```

**Categorias de Checagem:**
- `content_quality`: Clareza, gramática, relevância
- `meta_compliance`: Conformidade com políticas Meta
- `variable_usage`: Uso correto de variáveis
- `cta_effectiveness`: Efetividade do call-to-action
- `business_alignment`: Alinhamento com o BusinessContext

---

## Orquestração dos Agentes

Os agentes são orquestrados pelo `AgentPipeline` no backend:

```typescript
// Execução sequencial com passagem de contexto
const result = await AgentPipeline.run({
  intent,
  businessContext,
  steps: ["strategist", "copywriter", "policy_reviewer", "compiler", "auditor"]
});
```

Cada agente pode:
- `PASS`: Continuar para o próximo
- `FAIL`: Interromper pipeline com motivo
- `WARN`: Continuar com alerta registrado no `auditLog`
