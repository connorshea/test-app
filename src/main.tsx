import { createRoot } from "react-dom/client";
import "./style.css";
import { App } from "./App.tsx";

createRoot(document.querySelector<HTMLDivElement>("#app")!).render(<App />);
