interface ContextMemoryCardProps {
  companyName: string;
  industry: string;
  brandVoice: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  loading: boolean;
  onCompanyNameChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onBrandVoiceChange: (value: string) => void;
  onCategoryChange: (value: "MARKETING" | "UTILITY" | "AUTHENTICATION") => void;
}

export function ContextMemoryCard({
  companyName,
  industry,
  brandVoice,
  category,
  loading,
  onCompanyNameChange,
  onIndustryChange,
  onBrandVoiceChange,
  onCategoryChange,
}: ContextMemoryCardProps) {
  return (
    <section className="context-memory">
      <div>
        <h2>Contexto usado pelo copiloto</h2>
        <p className="muted">Base operacional para estrategia, copy e compliance.</p>
      </div>

      <label>
        Empresa
        <input value={companyName} onChange={(event) => onCompanyNameChange(event.target.value)} disabled={loading} />
      </label>

      <label>
        Segmento
        <input value={industry} onChange={(event) => onIndustryChange(event.target.value)} disabled={loading} />
      </label>

      <label>
        Voz da marca
        <input value={brandVoice} onChange={(event) => onBrandVoiceChange(event.target.value)} disabled={loading} />
      </label>

      <label>
        Categoria inicial
        <select value={category} onChange={(event) => onCategoryChange(event.target.value as typeof category)} disabled={loading}>
          <option value="MARKETING">MARKETING</option>
          <option value="UTILITY">UTILITY</option>
          <option value="AUTHENTICATION">AUTHENTICATION</option>
        </select>
      </label>
    </section>
  );
}
