"use client";

const CORES = ["#4f46e5", "#1baf7a", "#eb6834", "#eda100", "#db2777", "#0891b2"];

// Pequena chuva de confete a partir de um ponto da tela (ex.: o botao clicado).
export function soltarConfete({ x = window.innerWidth / 2, y = window.innerHeight / 3, quantidade = 36 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const camada = document.createElement("div");
  camada.setAttribute("aria-hidden", "true");
  camada.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden";

  for (let i = 0; i < quantidade; i++) {
    const peca = document.createElement("span");
    const angulo = Math.random() * Math.PI * 2;
    const forca = 60 + Math.random() * 140;
    const dx = Math.cos(angulo) * forca;
    const dy = Math.sin(angulo) * forca - 80;
    const giro = (Math.random() - 0.5) * 720;
    const tamanho = 5 + Math.random() * 5;

    peca.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${tamanho}px;height:${tamanho * 0.5}px;background:${
      CORES[i % CORES.length]
    };border-radius:1px;`;
    peca.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${giro / 2}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx * 1.3}px,${dy + 220}px) rotate(${giro}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" },
    );
    camada.appendChild(peca);
  }

  document.body.appendChild(camada);
  setTimeout(() => camada.remove(), 1800);
}
