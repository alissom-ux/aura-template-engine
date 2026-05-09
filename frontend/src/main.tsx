import { createRoot } from "react-dom/client";
import { OperationalCopilotWorkspace } from "./components/workspace/OperationalCopilotWorkspace";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<OperationalCopilotWorkspace />);
