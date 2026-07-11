import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PortfolioPage } from "./components/PortfolioPage";

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/paper" element={<Navigate to="/" replace />} />
        <Route path="/observatory" element={<Navigate to="/" replace />} />
        <Route path="/index" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MotionConfig>
  );
}
