# CORE_SCHEMA.md — Schema Universal do Template

## Objetivo

Definir a estrutura de dados universal que representa um template WhatsApp no sistema.
Este schema é independente de negócio — é o contrato central entre frontend, backend, agentes e Meta.

---

## WhatsAppTemplate

```typescript
interface WhatsAppTemplate {
  id: string;                        // UUID interno
  name: string;                      // Nome snake_case (ex: order_confirmation)
  category: TemplateCategory;        // MARKETING | UTILITY | AUTHENTICATION
  language: string;                  // BCP-47 (ex: pt_BR, en_US)
  status: TemplateStatus;            // DRAFT | PENDING_REVIEW | APPROVED | REJECTED
  components: TemplateComponent[];   // Header, Body, Footer, Buttons
  businessContextId: string;         // Referência ao BusinessContext
  metaTemplateId?: string;           // ID retornado pela Meta após submissão
  auditLog: AuditEntry[];            // Histórico de validações
  createdAt: string;                 // ISO 8601
  updatedAt: string;
}
```

---

## TemplateCategory

```typescript
type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
```

| Categoria        | Uso                                              |
|------------------|--------------------------------------------------|
| MARKETING        | Promoções, lançamentos, engajamento              |
| UTILITY          | Confirmações, atualizações, lembretes            |
| AUTHENTICATION   | OTPs e verificações de identidade                |

---

## TemplateStatus

```typescript
type TemplateStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED";
```

---

## TemplateComponent

```typescript
type TemplateComponent =
  | HeaderComponent
  | BodyComponent
  | FooterComponent
  | ButtonsComponent;

interface HeaderComponent {
  type: "HEADER";
  format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: { header_handle?: string[] };
}

interface BodyComponent {
  type: "BODY";
  text: string;                  // Suporta {{1}}, {{2}} como variáveis
  example?: { body_text: string[][] };
}

interface FooterComponent {
  type: "FOOTER";
  text: string;
}

interface ButtonsComponent {
  type: "BUTTONS";
  buttons: TemplateButton[];
}
```

---

## TemplateButton

```typescript
type TemplateButton =
  | QuickReplyButton
  | UrlButton
  | PhoneButton
  | CopyCodeButton;

interface QuickReplyButton {
  type: "QUICK_REPLY";
  text: string;
}

interface UrlButton {
  type: "URL";
  text: string;
  url: string;
  example?: string[];
}

interface PhoneButton {
  type: "PHONE_NUMBER";
  text: string;
  phone_number: string;
}

interface CopyCodeButton {
  type: "COPY_CODE";
  example: string;
}
```

---

## TemplateVariable

```typescript
interface TemplateVariable {
  index: number;       // Posição no texto: {{1}}, {{2}}...
  name: string;        // Nome semântico (ex: "customer_name")
  description: string; // Para o agente entender o contexto
  example: string;     // Exemplo real de valor
  required: boolean;
}
```

---

## AuditEntry

```typescript
interface AuditEntry {
  timestamp: string;
  agent: AgentType;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
  details?: Record<string, unknown>;
}

type AgentType = "strategist" | "copywriter" | "policy_reviewer" | "compiler" | "auditor";
```

---

## Regras de Validação do Schema

1. `name` deve ser snake_case, máximo 512 caracteres
2. `BODY.text` obrigatório, máximo 1024 caracteres
3. Máximo 3 botões do tipo `QUICK_REPLY`
4. Máximo 2 botões de ação (`URL` ou `PHONE_NUMBER`)
5. Variáveis devem ser sequenciais: `{{1}}`, `{{2}}`, ...
6. `AUTHENTICATION` não permite HEADER de mídia
