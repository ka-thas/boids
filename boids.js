// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

// Shared, mutable config for all adjustable simulation parameters. The
// settings panel binds directly to these values so changes take effect
// immediately in both the simulation and the force-vector debug overlay.
const config = {
  numBoids: 100,
  speedLimit: 8,
  centeringFactor: 0.005, // cohesion
  avoidDistance: 20, // separation: distance to stay away from other boids
  avoidFactor: 0.05, // separation strength
  matchingFactor: 0.05, // alignment strength
  cursorMinDistance: 10,
  cursorMaxDistance: 200,
  cursorAvoidFactor: 0.01, // cursor avoidance strength
};

let visualRange = 75;

let isVisitedOnPhone = false;

if (/Mobi|Android/i.test(navigator.userAgent)) {
  if (localStorage.getItem('visitedOnPhone')) {
    isVisitedOnPhone = true;
  } else {
    localStorage.setItem('visitedOnPhone', 'true');
  }

  // Track finger movement on touch devices
  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      mouseX = event.touches[0].clientX;
      mouseY = event.touches[0].clientY;
    }
  });
}

// Add event listener for buttons
let theme = 'theme-birds';
let buttons = document.getElementsByClassName('theme-btn');

buttons[0].addEventListener('click', () => { changeTheme('theme-default'); });
buttons[1].addEventListener('click', () => { changeTheme('theme-birds'); });
buttons[2].addEventListener('click', () => { changeTheme('theme-fishes'); });

var boids = [];

let mouseX = 0;
let mouseY = 0;
let isPaused = false;
let showForces = false;
let menuOpen = false;
const forceVisualScale = 200;

document.addEventListener('mousemove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    isPaused = !isPaused;
    syncPauseCheckbox();
    return;
  }

  if (event.code === 'KeyF') {
    showForces = !showForces;
    updateForceLegend();
    syncShowForcesCheckbox();
  }

  if (event.code === 'KeyM') {
    toggleMenu();
  }
});

function initBoids() {
  for (var i = 0; i < config.numBoids; i += 1) {
    boids[boids.length] = {
      x: Math.random() * width,
      y: Math.random() * height,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
    };
  }
}

// Grows or shrinks the live boids array to match config.numBoids.
function syncBoidCount() {
  const target = config.numBoids;
  if (boids.length < target) {
    while (boids.length < target) {
      boids.push({
        x: Math.random() * width,
        y: Math.random() * height,
        dx: Math.random() * 10 - 5,
        dy: Math.random() * 10 - 5,
      });
    }
  } else if (boids.length > target) {
    boids.length = target;
  }
}

function setMenuOpen(open) {
  menuOpen = open;
  const panel = document.getElementById('settings-panel');
  if (panel) {
    panel.classList.toggle('open', menuOpen);
  }
}

function toggleMenu() {
  setMenuOpen(!menuOpen);
}

function updateForceLegend() {
  const legend = document.getElementById('force-legend');
  if (legend) {
    legend.classList.toggle('visible', showForces);
  }
}

function syncShowForcesCheckbox() {
  const checkbox = document.getElementById('show-forces-input');
  if (checkbox) {
    checkbox.checked = showForces;
  }
}

function syncPauseCheckbox() {
  const checkbox = document.getElementById('pause-input');
  if (checkbox) {
    checkbox.checked = isPaused;
  }
}

// Wires up the settings panel: the toggle button/key, close-on-outside-click,
// and all slider/input controls bound to the shared config object.
function initMenu() {
  const panel = document.getElementById('settings-panel');
  const toggleBtn = document.getElementById('menu-toggle-btn');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMenu();
    });
  }

  document.addEventListener('click', (event) => {
    if (!menuOpen || !panel) {
      return;
    }
    if (panel.contains(event.target) || event.target === toggleBtn) {
      return;
    }
    setMenuOpen(false);
  });

  bindSlider('num-boids-input', 'num-boids-value', (value) => {
    config.numBoids = Math.round(value);
    syncBoidCount();
    return config.numBoids;
  });

  bindSlider('cohesion-input', 'cohesion-value', (value) => {
    config.centeringFactor = value;
    return value.toFixed(4);
  });

  bindSlider('separation-input', 'separation-value', (value) => {
    config.avoidFactor = value;
    return value.toFixed(3);
  });

  bindSlider('alignment-input', 'alignment-value', (value) => {
    config.matchingFactor = value;
    return value.toFixed(3);
  });

  bindSlider('speed-limit-input', 'speed-limit-value', (value) => {
    config.speedLimit = value;
    return value.toFixed(1);
  });

  bindSlider('cursor-avoid-input', 'cursor-avoid-value', (value) => {
    config.cursorAvoidFactor = value;
    return value.toFixed(3);
  });

  const showForcesCheckbox = document.getElementById('show-forces-input');
  if (showForcesCheckbox) {
    showForcesCheckbox.checked = showForces;
    showForcesCheckbox.addEventListener('change', () => {
      showForces = showForcesCheckbox.checked;
      updateForceLegend();
    });
  }

  const pauseCheckbox = document.getElementById('pause-input');
  if (pauseCheckbox) {
    pauseCheckbox.checked = isPaused;
    pauseCheckbox.addEventListener('change', () => {
      isPaused = pauseCheckbox.checked;
    });
  }
}

// Binds a range input to a display span. `onChange` receives the numeric
// value, updates the relevant config field, and returns the text to display.
function bindSlider(inputId, valueId, onChange) {
  const input = document.getElementById(inputId);
  const valueLabel = document.getElementById(valueId);
  if (!input) {
    return;
  }

  input.addEventListener('input', () => {
    const value = parseFloat(input.value);
    const display = onChange(value);
    if (valueLabel) {
      valueLabel.textContent = display;
    }
  });
}

function distance(boid1, boid2) {
  return Math.sqrt(
    (boid1.x - boid2.x) * (boid1.x - boid2.x) +
      (boid1.y - boid2.y) * (boid1.y - boid2.y),
  );
}


// Called initially and whenever the window resizes to update the canvas
// size and width/height variables.
function sizeCanvas() {
  const canvas = document.getElementById("boids");
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  // Adjust visual range for smaller screens
  if (width < 600) {
    visualRange = 20;
  } else {
    visualRange = 75;
  }
}

// Constrain a boid to within the window. If it gets too close to an edge,
// nudge it back in and reverse its direction.
function keepWithinBounds(boid) {
  const margin = 10;
  const turnFactor = 0.5;

  if (boid.x < margin) {
    boid.dx += turnFactor;
  }
  if (boid.x > width - margin) {
    boid.dx -= turnFactor
  }
  if (boid.y < margin) {
    boid.dy += turnFactor;
  }
  if (boid.y > height - margin) {
    boid.dy -= turnFactor;
  }
}

// Find the center of mass of the other boids and adjust velocity slightly to
// point towards the center of mass.
function flyTowardsCenter(boid) {
  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (distance(boid, otherBoid) < visualRange) {
      centerX += otherBoid.x;
      centerY += otherBoid.y;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;

    boid.dx += (centerX - boid.x) * config.centeringFactor;
    boid.dy += (centerY - boid.y) * config.centeringFactor;
  }
}

// Move away from other boids that are too close to avoid colliding
function avoidOthers(boid) {
  let moveX = 0;
  let moveY = 0;
  for (let otherBoid of boids) {
    if (otherBoid !== boid) {
      if (distance(boid, otherBoid) < config.avoidDistance) {
        moveX += boid.x - otherBoid.x;
        moveY += boid.y - otherBoid.y;
      }
    }
  }

  boid.dx += moveX * config.avoidFactor;
  boid.dy += moveY * config.avoidFactor;
}

function avoidCursor(boid) {
  let moveX = 0;
  let moveY = 0;

  const cursor = { x: mouseX, y: mouseY };
  const dist = distance(boid, cursor);

  if (dist < config.cursorMaxDistance) {
    const strength = (config.cursorMaxDistance - dist) / (config.cursorMaxDistance - config.cursorMinDistance);
    moveX += (boid.x - cursor.x) * strength;
    moveY += (boid.y - cursor.y) * strength;
  }

  boid.dx += moveX * config.cursorAvoidFactor;
  boid.dy += moveY * config.cursorAvoidFactor;
}

// Find the average velocity (speed and direction) of the other boids and
// adjust velocity slightly to match.
function matchVelocity(boid) {
  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (distance(boid, otherBoid) < visualRange) {
      avgDX += otherBoid.dx;
      avgDY += otherBoid.dy;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    avgDX = avgDX / numNeighbors;
    avgDY = avgDY / numNeighbors;

    boid.dx += (avgDX - boid.dx) * config.matchingFactor;
    boid.dy += (avgDY - boid.dy) * config.matchingFactor;
  }
}

// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function limitSpeed(boid) {

  const speed = Math.sqrt(boid.dx * boid.dx + boid.dy * boid.dy);
  if (speed > config.speedLimit) {
    boid.dx = (boid.dx / speed) * config.speedLimit;
    boid.dy = (boid.dy / speed) * config.speedLimit;
  }
}

function computeForces(boid) {
  const margin = 10;
  const turnFactor = 0.5;

  let centerX = 0;
  let centerY = 0;
  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;
  let avoidX = 0;
  let avoidY = 0;

  for (let otherBoid of boids) {
    if (otherBoid === boid) {
      continue;
    }

    const dist = distance(boid, otherBoid);
    if (dist < visualRange) {
      centerX += otherBoid.x;
      centerY += otherBoid.y;
      avgDX += otherBoid.dx;
      avgDY += otherBoid.dy;
      numNeighbors += 1;
    }

    if (dist < config.avoidDistance) {
      avoidX += boid.x - otherBoid.x;
      avoidY += boid.y - otherBoid.y;
    }
  }

  const forces = {
    center: { x: 0, y: 0 },
    avoid: { x: 0, y: 0 },
    match: { x: 0, y: 0 },
    cursor: { x: 0, y: 0 },
    bounds: { x: 0, y: 0 },
  };

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;
    avgDX = avgDX / numNeighbors;
    avgDY = avgDY / numNeighbors;

    forces.center.x = (centerX - boid.x) * config.centeringFactor;
    forces.center.y = (centerY - boid.y) * config.centeringFactor;
    forces.match.x = (avgDX - boid.dx) * config.matchingFactor;
    forces.match.y = (avgDY - boid.dy) * config.matchingFactor;
  }

  forces.avoid.x = avoidX * config.avoidFactor;
  forces.avoid.y = avoidY * config.avoidFactor;

  const cursor = { x: mouseX, y: mouseY };
  const cursorDist = distance(boid, cursor);
  if (cursorDist < config.cursorMaxDistance) {
    const strength = (config.cursorMaxDistance - cursorDist) / (config.cursorMaxDistance - config.cursorMinDistance);
    forces.cursor.x = (boid.x - cursor.x) * strength * config.cursorAvoidFactor;
    forces.cursor.y = (boid.y - cursor.y) * strength * config.cursorAvoidFactor;
  }

  if (boid.x < margin) {
    forces.bounds.x += turnFactor;
  }
  if (boid.x > width - margin) {
    forces.bounds.x -= turnFactor;
  }
  if (boid.y < margin) {
    forces.bounds.y += turnFactor;
  }
  if (boid.y > height - margin) {
    forces.bounds.y -= turnFactor;
  }

  return forces;
}

function drawArrow(ctx, fromX, fromY, toX, toY, color) {
  const headLength = 6;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawForceVectors(ctx, boid) {
  const forces = computeForces(boid);
  const originX = boid.x;
  const originY = boid.y;

  drawArrow(
    ctx,
    originX,
    originY,
    originX + forces.center.x * forceVisualScale,
    originY + forces.center.y * forceVisualScale,
    '#6aa84f',
  );
  drawArrow(
    ctx,
    originX,
    originY,
    originX + forces.avoid.x * forceVisualScale,
    originY + forces.avoid.y * forceVisualScale,
    '#e69138',
  );
  drawArrow(
    ctx,
    originX,
    originY,
    originX + forces.match.x * forceVisualScale,
    originY + forces.match.y * forceVisualScale,
    '#3d85c6',
  );
  drawArrow(
    ctx,
    originX,
    originY,
    originX + forces.cursor.x * forceVisualScale,
    originY + forces.cursor.y * forceVisualScale,
    '#cc0000',
  );
  drawArrow(
    ctx,
    originX,
    originY,
    originX + forces.bounds.x * forceVisualScale,
    originY + forces.bounds.y * forceVisualScale,
    '#999999',
  );

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(originX, originY, visualRange, 0, Math.PI * 2);
  ctx.stroke();
}

function getFocusBoid() {
  if (!boids.length) {
    return null;
  }

  return boids[0];
}

function drawBoid(ctx, boid) {
  const angle = Math.atan2(boid.dy, boid.dx);
  ctx.translate(boid.x, boid.y);
  ctx.rotate(angle);
  ctx.translate(-boid.x, -boid.y);
  if (theme == 'theme-default') {
    ctx.fillStyle = "#efff78";
  } else if (theme == 'theme-birds') {
    ctx.fillStyle = "#222";
  } else if (theme == 'theme-fishes') {
    ctx.fillStyle = "#da7";
  }
  ctx.beginPath();
  ctx.moveTo(boid.x, boid.y);
  ctx.lineTo(boid.x - 15, boid.y + 5);
  ctx.lineTo(boid.x - 15, boid.y - 5);
  ctx.lineTo(boid.x, boid.y);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Main animation loop
function animationLoop() {
  if (!isPaused) {
    // Update each boid
    for (let boid of boids) {
      // Update the velocities according to each rule
      flyTowardsCenter(boid);
      avoidOthers(boid);
      avoidCursor(boid);
      matchVelocity(boid);
      limitSpeed(boid);
      keepWithinBounds(boid);

      // Update the position based on the current velocity
      boid.x += boid.dx;
      boid.y += boid.dy;
    }
  }

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);
  for (let boid of boids) {
    drawBoid(ctx, boid);
  }

  if (showForces) {
    const focusBoid = getFocusBoid();
    if (focusBoid) {
      drawForceVectors(ctx, focusBoid);
    }
  }

  // Schedule the next frame
  window.requestAnimationFrame(animationLoop);
}

window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  // Randomly distribute the boids to start
  initBoids();

  // Wire up the settings panel toggle and controls
  initMenu();

  // Schedule the main animation loop
  window.requestAnimationFrame(animationLoop);
};

function changeTheme(newTheme) {
  document.body.className = newTheme;
  theme = newTheme;
}