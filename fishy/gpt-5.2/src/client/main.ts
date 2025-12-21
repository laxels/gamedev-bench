import { createGame } from "./runtime/game";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

const canvas = document.createElement("canvas");
canvas.setAttribute("aria-label", "Fishy");
canvas.style.cursor = "default";
app.appendChild(canvas);

const fullscreenButton = document.querySelector<HTMLButtonElement>("#fs");
if (!fullscreenButton) throw new Error("Missing #fs");

const game = createGame({ canvas, root: app, fullscreenButton });
game.start();
