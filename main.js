let bingoData = {};

fetch('bingoData.json')
    .then(res => res.json())
    .then(data => {
      bingoData = data;

      // Dropdown füllen
      const selector = document.getElementById("arraySelector");
      Object.keys(bingoData).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;
        selector.appendChild(option);
      });
    });

// Seeded Random (xorshift)
function seededRandom(seed) {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return Math.abs(seed % 10000) / 10000;
  };
}

// Deterministisches Shuffle
function shuffleWithSeed(array, rand) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateGridFromSeed(topic, size, seed) {
  const data = bingoData[topic];
  if (!data) return null;

  const rand = seededRandom(seed);
  const tasks = [];
  for (const [person, list] of Object.entries(data)) {
    list.forEach(text => tasks.push({ person, text }));
  }

  shuffleWithSeed(tasks, rand);

  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const rowCounts = Array.from({ length: size }, () => ({}));
  const colCounts = Array.from({ length: size }, () => ({}));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let placed = false;

      for (let i = 0; i < tasks.length; i++) {
        console.log("Tasks.length " + tasks.length);
        console.log("i= " + i);
        const { person, text } = tasks[i];
        const rowCount = rowCounts[r][person] || 0;
        const colCount = colCounts[c][person] || 0;

        if (rowCount < 1 && colCount < 1) {
          grid[r][c] = { person, text };
          rowCounts[r][person] = rowCount + 1;
          colCounts[c][person] = colCount + 1;
          tasks.splice(i, 1);
          placed = true;
          break;
        }
      }

      if (!placed) return null;
    }
  }
  
  return grid;
}

function renderGrid(grid, size) {
  const board = document.getElementById("bingoBoard");
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  grid.flat().forEach(({ person, text }) => {
    const cell = document.createElement("div");
    cell.className = "bingo-cell";
    cell.innerHTML = `
      <div class="task-text">${text}</div>
      <div class="person-text">${person}</div>
    `;
    cell.addEventListener("click", () => {
      cell.classList.toggle("done");
    });
    board.appendChild(cell);
  });
}

// Dropdown befüllen
const selector = document.getElementById("arraySelector");
Object.keys(bingoData).forEach(key => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = key;
  selector.appendChild(option);
});

// Button → Zettel generieren
document.getElementById("generateBtn").addEventListener("click", () => {
  const topic = selector.value;
  const total = Object.values(bingoData[topic]).flat().length;

  let size = 3;
  if (total >= 25) size = 5;
  else if (total >= 16) size = 4;

  const seed = Math.floor(Math.random() * 1000000);
  document.getElementById("codeInput").value = `${topic}:${size}:${seed}`;

  const grid = generateGridFromSeed(topic, size, seed);
  if (grid) renderGrid(grid, size);
  else alert("❌ Fehler beim Generieren");
});

// Button → Code eingeben & laden
document.getElementById("validateBtn").addEventListener("click", () => {
  const input = document.getElementById("codeInput").value.trim();
  const [topic, sizeStr, seedStr] = input.split(":");
  const size = parseInt(sizeStr, 10);
  const seed = parseInt(seedStr, 10);

  if (!bingoData[topic] || !size || isNaN(seed)) {
    alert("❌ Ungültiger Code");
    return;
  }

  const grid = generateGridFromSeed(topic, size, seed);
  if (grid) renderGrid(grid, size);
  else alert("❌ Zettel konnte nicht wiederhergestellt werden");
});

// Button → LootTable zeigen
// Modal öffnen
document.getElementById("showLootBtn").addEventListener("click", () => {
  const topic = document.getElementById("arraySelector").value;
  const data = bingoData[topic];
  const output = document.getElementById("lootOutput");
  const modal = document.getElementById("lootModal");

  if (!data) {
    output.textContent = "❌ Keine Daten gefunden.";
  } else {
    let text = "";
    for (const [boss, items] of Object.entries(data)) {
      text += boss + "\n";
      items.forEach(item => {
        text += "  • " + item + "\n";
      });
      text += "\n";
    }
    output.textContent = text.trim();
  }

  modal.style.display = "block";
});

// Modal schließen
document.querySelector(".modal .close").addEventListener("click", () => {
  document.getElementById("lootModal").style.display = "none";
});

// Klick außerhalb schließt Modal
window.addEventListener("click", (e) => {
  const modal = document.getElementById("lootModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});