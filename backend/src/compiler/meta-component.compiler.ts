import type { TemplateComponent } from "../core/index.js";
import type { MetaComponent } from "./meta-compiler.types.js";

export class MetaComponentCompiler {
  compile(component: TemplateComponent): MetaComponent {
    if (component.type === "HEADER") {
      return {
        type: "HEADER",
        format: component.format,
        text: component.text,
        example: component.example,
      };
    }

    if (component.type === "BODY") {
      return {
        type: "BODY",
        text: component.text,
        example: component.example,
      };
    }

    if (component.type === "FOOTER") {
      return {
        type: "FOOTER",
        text: component.text,
      };
    }

    return {
      type: "BUTTONS",
      buttons: component.buttons.map((button) => ({ ...button })),
    };
  }
}
