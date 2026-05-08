# BUSINESS_CONTEXT.md — Contextos de Negócio

## Objetivo

Definir como diferentes negócios são plugados no Aura Template Engine sem hardcoding.
O `BusinessContext` é o contrato que informa os agentes de IA sobre o domínio específico do cliente.

---

## Conceito

O sistema é agnóstico de negócio por design.
Toda inteligência específica de domínio é injetada via `BusinessContext`.

```
[Negócio A: Clínica]  ─┐
[Negócio B: E-commerce] ┼──→ BusinessContext ──→ Agentes de IA ──→ Template
[Negócio C: Logística] ─┘
```

---

## BusinessContext Schema

```typescript
interface BusinessContext {
  id: string;
  name: string;                          // "Clínica Saúde Total"
  segment: string;                       // "healthcare" | "ecommerce" | "logistics" | ...
  description: string;                   // Descrição livre do negócio
  tone: ToneOfVoice;                     // Tom de comunicação
  audience: AudienceProfile;            // Perfil do público-alvo
  policies: BusinessPolicy[];           // Regras específicas do negócio
  examples: BusinessExample[];          // Exemplos de comunicação existentes
  complianceNotes?: string;             // Restrições legais/regulatórias
  metaWabaId?: string;                  // WhatsApp Business Account ID
  createdAt: string;
}
```

---

## ToneOfVoice

```typescript
interface ToneOfVoice {
  primary: "formal" | "informal" | "technical" | "empathetic" | "urgency";
  avoid: string[];     // Ex: ["gírias", "exclamações excessivas", "CAIXA ALTA"]
  guidelines: string;  // Instruções livres para o copywriter
}
```

---

## AudienceProfile

```typescript
interface AudienceProfile {
  description: string;     // "Pacientes adultos em acompanhamento médico"
  ageRange?: string;       // "25-60"
  painPoints: string[];    // O que preocupa ou motiva o público
  expectations: string[];  // O que esperam receber
}
```

---

## BusinessPolicy

```typescript
interface BusinessPolicy {
  id: string;
  rule: string;          // "Nunca mencionar preços sem aprovação jurídica"
  reason?: string;
  severity: "block" | "warn";   // block = reprovar template | warn = alertar
}
```

---

## BusinessExample

```typescript
interface BusinessExample {
  type: "approved_template" | "communication_sample";
  content: string;
  notes?: string;
}
```

---

## Como Plugar um Novo Negócio

### 1. Criar o BusinessContext via API

```http
POST /api/business-contexts
Content-Type: application/json

{
  "name": "Farmácia Vida",
  "segment": "pharmacy",
  "tone": {
    "primary": "empathetic",
    "avoid": ["termos muito técnicos", "urgência forçada"],
    "guidelines": "Sempre reforçar segurança e cuidado com saúde"
  },
  "audience": {
    "description": "Pacientes e cuidadores buscando medicamentos",
    "painPoints": ["dificuldade de acesso", "custo", "urgência"],
    "expectations": ["agilidade", "clareza", "confiança"]
  },
  "policies": [
    {
      "rule": "Não fazer promessas de cura ou efeitos garantidos",
      "severity": "block"
    }
  ]
}
```

### 2. Referenciar nas Requisições de Template

```http
POST /api/templates/generate
{
  "businessContextId": "biz_xxx",
  "intent": "Lembrar paciente sobre retirada de medicamento controlado",
  "category": "UTILITY"
}
```

---

## Isolamento entre Negócios

- Cada `BusinessContext` é completamente isolado
- Agentes recebem apenas o contexto relevante por requisição
- Nenhuma informação vaza entre negócios diferentes
- Políticas do negócio são validadas pelo `policy_reviewer` agent
