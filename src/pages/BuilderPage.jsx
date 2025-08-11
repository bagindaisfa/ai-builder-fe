import React from "react";
import BuilderCanvas from "../components/BuilderCanvas";

export default function BuilderPage() {
  return (
    <div style={{ height: "calc(100vh - 160px)" }}>
      <BuilderCanvas />
    </div>
  );
}
