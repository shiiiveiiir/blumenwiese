let socket;
let clientId = null;
let clientCount = 0;
let clientInfoElem;

let prevX = null, prevY = null;

let globalClientId = null; // globale Spieler-ID
let roomName = ""; // aktueller Raum-Name

// Canvas
const canvasWidth = 800;
const canvasHeight = 1200;
const zoneCount = 4;
const zoneHeight = canvasHeight / zoneCount;

let drawingLayer;

// Overlay-Logik
let showOverlays = true;
let revealProgress = 0;
let revealing = false;
const revealSpeed = 0.02;

function setup() {
  createCanvas(canvasWidth, canvasHeight);

  drawingLayer = createGraphics(canvasWidth, canvasHeight);
  drawingLayer.background(255);
  drawingLayer.strokeWeight(2);

  strokeWeight(2);
  clientInfoElem = document.getElementById('clientInfo');

  socket = new WebSocket("wss://nosch.uber.space/web-rooms/");

  socket.addEventListener("open", () => {
    console.log("Verbunden mit WebSocket");
    sendMsg("*enter-room*", "cadavre-exquis-lobby");
    sendMsg("*subscribe-client-count*");
  });

  socket.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    const type = msg[0];

if (type === "*client-id*") {
  // Client-ID nur setzen, wenn sie noch nicht gesetzt ist
  if (globalClientId === null) {
    clientId = msg[1];
    console.log("Client-ID in Lobby:", clientId);

    // Bestimme globale Spieler-ID
    globalClientId = clientId;

    // Bestimme Raum
    const roomNumber = Math.floor(globalClientId / zoneCount) + 1;
    roomName = `cadavre-exquis-room${roomNumber}`;

    // Verbinde zu Raum
    sendMsg("*enter-room*", roomName);
    sendMsg("*subscribe-client-count*");

    console.log(`Verbunden mit Raum: ${roomName}`);
  }
}


    if (type === "*client-count*") {
      clientCount = msg[1];
      updateInfo();
    }

    if (type === "draw-line") {
      const sender = msg[1];
      const [x1, y1] = msg[2];
      const [x2, y2] = msg[3];

      if (sender === globalClientId) return;

      drawingLayer.stroke('red');
      drawingLayer.line(x1, y1, x2, y2);
    }
  });

  const revealBtn = document.getElementById('revealBtn');
  revealBtn.addEventListener('click', () => {
    revealing = true;
  });
}

function draw() {
  image(drawingLayer, 0, 0);

  stroke(180);
  for (let i = 1; i < zoneCount; i++) {
    line(0, i * zoneHeight, canvasWidth, i * zoneHeight);
  }

  if ((showOverlays || revealing) && globalClientId !== null) {
    noStroke();
    fill('#8ECAE6');

    const myZone = globalClientId % zoneCount;

    for (let i = 0; i < zoneCount; i++) {
      if (i !== myZone) {
        const y = i * zoneHeight;
        let visibleHeight = zoneHeight;

        if (revealing) {
          visibleHeight = zoneHeight * (1 - revealProgress);
        }

        rect(0, y, canvasWidth, visibleHeight);
      }
    }

    if (revealing) {
      revealProgress += revealSpeed;
      if (revealProgress >= 1) {
        revealProgress = 1;
        showOverlays = false;
        revealing = false;
      }
    }
  }
}

function updateInfo() {
  if (globalClientId !== null && clientCount > 0) {
    const zoneNames = ["Kopf", "Oberkörper", "Beine", "Füße"];
    const myZone = globalClientId % zoneCount;

    clientInfoElem.textContent = `Du bist Spieler #${globalClientId + 1} von ${clientCount} (zeichne: ${zoneNames[myZone]})`;
  }
}

function mouseDragged() {
  if (globalClientId === null || !showOverlays) return;

  const myZone = globalClientId % zoneCount;

  const zoneTop = myZone * zoneHeight;
  const zoneBottom = zoneTop + zoneHeight;

  if (mouseY < zoneTop || mouseY > zoneBottom) {
    prevX = null;
    prevY = null;
    return;
  }

  if (prevX !== null && prevY !== null) {
    drawingLayer.stroke('black');
    drawingLayer.line(prevX, prevY, mouseX, mouseY);

    const message = ["draw-line", globalClientId, [prevX, prevY], [mouseX, mouseY]];
    sendMsg("*broadcast-message*", message);
  }

  prevX = mouseX;
  prevY = mouseY;
}

function mouseReleased() {
  prevX = null;
  prevY = null;
}

function sendMsg(...message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}
