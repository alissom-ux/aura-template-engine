interface CopilotComposerProps {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
}

export function CopilotComposer({ value, loading, onChange }: CopilotComposerProps) {
  return (
    <label className="copilot-composer">
      Converse com o copiloto
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex: quero reengajar clientes inativos com uma mensagem acolhedora"
        disabled={loading}
      />
      <span>Descreva objetivo, publico e proximo passo desejado. O copiloto transforma isso em estrategia Meta.</span>
    </label>
  );
}
