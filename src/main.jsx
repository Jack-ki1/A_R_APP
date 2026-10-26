import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BreakoutRadarMVP from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BreakoutRadarMVP />
  </StrictMode>
);
