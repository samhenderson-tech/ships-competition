// Ship Competition Tracker - Main Application

class ShipTracker {
  constructor() {
    this.map = null;
    this.markers = {};
    this.gateLine = null;
    this.state = this.loadState();
    this.init();
  }

  loadState() {
    const DATA_VERSION = 4; // Bump to force position refresh
    const saved = localStorage.getItem("hormuz-race-state");
    if (saved) {
      const state = JSON.parse(saved);
      if (!state.positions) state.positions = {};
      if (!state.passed) state.passed = {};
      if (!state.moving) state.moving = {};
      // If data version changed, clear positions to reload real ones
      if (state.version !== DATA_VERSION) {
        state.positions = {};
        state.version = DATA_VERSION;
      }
      return state;
    }
    return {
      version: DATA_VERSION,
      passed: {},
      positions: {},
      moving: {},
    };
  }

  saveState() {
    localStorage.setItem("hormuz-race-state", JSON.stringify(this.state));
  }

  // Load real AIS positions for all ships
  ensureAllPositions() {
    let changed = false;
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (REAL_POSITIONS[s.imo]) {
          // Always use real positions from data
          const real = REAL_POSITIONS[s.imo];
          if (!this.state.positions[s.imo] ||
              this.state.positions[s.imo].lat !== real.lat ||
              this.state.positions[s.imo].lng !== real.lng) {
            this.state.positions[s.imo] = {
              lat: real.lat,
              lng: real.lng,
              speed: real.speed || 0,
              course: real.course || 0,
            };
            changed = true;
          }
        }
      });
    });
    if (changed) this.saveState();
  }

  init() {
    this.ensureAllPositions();
    this.initMap();
    this.renderScoreboard();
    this.renderShipList();
    this.updateLeaderboard();
    this.startClock();
  }

  initMap() {
    this.map = L.map("map", {
      center: HORMUZ.center,
      zoom: HORMUZ.zoom,
      zoomControl: true,
    });

    // Dark nautical style tiles
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(this.map);

    // Draw the Strait of Hormuz gate line
    this.gateLine = L.polyline(HORMUZ.gateLine, {
      color: "#ff4757",
      weight: 3,
      dashArray: "10, 10",
      opacity: 0.8,
    }).addTo(this.map);

    // Gate label
    L.marker([25.99, 56.9], {
      icon: L.divIcon({
        className: "gate-label",
        html: '<div class="gate-label-text">FINISH LINE</div>',
        iconSize: [120, 30],
        iconAnchor: [60, 15],
      }),
    }).addTo(this.map);

    // Add labels for key locations
    const locations = [
      { pos: [27.18, 56.25], name: "Iran" },
      { pos: [25.35, 55.4], name: "UAE" },
      { pos: [26.15, 56.4], name: "Oman" },
      { pos: [26.6, 55.0], name: "Persian Gulf" },
      { pos: [25.5, 57.5], name: "Gulf of Oman" },
    ];

    locations.forEach((loc) => {
      L.marker(loc.pos, {
        icon: L.divIcon({
          className: "location-label",
          html: `<div class="location-label-text">${loc.name}</div>`,
          iconSize: [100, 20],
          iconAnchor: [50, 10],
        }),
      }).addTo(this.map);
    });

    // Place all ships on the map
    this.placeAllShips();

    // Add map legend
    this.addMapLegend();
  }

  addMapLegend() {
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = `
        <div class="legend-title">PARTICIPANTS</div>
        ${PARTICIPANTS.map(
          (p) =>
            `<div class="legend-item">
              <span class="legend-dot" style="background:${p.color}"></span>
              ${p.name}
            </div>`
        ).join("")}
        <div class="legend-divider"></div>
        <div class="legend-title">STATUS</div>
        <div class="legend-item"><span class="legend-dot" style="background:#64748b"></span> Waiting</div>
        <div class="legend-item"><span class="legend-dot" style="background:#f59e0b;box-shadow:0 0 6px #f59e0b"></span> Moving</div>
        <div class="legend-item"><span class="legend-dot" style="background:#10b981;opacity:0.4"></span> Passed</div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }

  createShipIcon(ship, participant) {
    const isPassed = !!this.state.passed[ship.imo];
    const isMoving = !!this.state.moving[ship.imo];

    let borderGlow = "";
    let opacity = "";
    if (isPassed) {
      opacity = "opacity:0.35;";
    } else if (isMoving) {
      borderGlow = "box-shadow:0 0 12px 4px rgba(245,158,11,0.7);";
    }

    return L.divIcon({
      className: "ship-marker",
      html: `<div class="ship-icon" style="background:${participant.color};${opacity}${borderGlow}">
        <span class="ship-icon-text">${ship.name.substring(0, 2).toUpperCase()}</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  createShipPopup(ship, participant) {
    const isPassed = !!this.state.passed[ship.imo];
    const isMoving = !!this.state.moving[ship.imo];
    const pos = this.state.positions[ship.imo];
    const status = isPassed ? "PASSED" : isMoving ? "MOVING" : "WAITING";
    const statusColor = isPassed ? "#10b981" : isMoving ? "#f59e0b" : "#64748b";

    return `<div style="min-width:180px">
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${ship.name}</div>
      <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">${ship.flag} &middot; IMO ${ship.imo}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor}"></span>
        <span style="font-weight:600;color:${statusColor}">${status}</span>
      </div>
      <div style="font-size:12px;color:#94a3b8">
        Owner: <span style="color:${participant.color};font-weight:600">${participant.name}</span>
      </div>
      ${pos ? `<div style="font-size:11px;color:#64748b;margin-top:4px">${pos.lat.toFixed(4)}N, ${pos.lng.toFixed(4)}E</div>` : ""}
    </div>`;
  }

  placeAllShips() {
    PARTICIPANTS.forEach((participant) => {
      participant.ships.forEach((ship) => {
        const pos = this.state.positions[ship.imo];
        if (!pos) return;

        const icon = this.createShipIcon(ship, participant);
        const marker = L.marker([pos.lat, pos.lng], { icon })
          .addTo(this.map)
          .bindPopup(this.createShipPopup(ship, participant));

        this.markers[ship.imo] = marker;
      });
    });
  }

  updateMapMarkers() {
    // Remove all existing markers and re-add them (to pick up status changes)
    Object.values(this.markers).forEach((m) => this.map.removeLayer(m));
    this.markers = {};
    this.placeAllShips();
  }

  renderScoreboard() {
    const container = document.getElementById("scoreboard");
    container.innerHTML = "";

    const sorted = [...PARTICIPANTS].sort((a, b) => {
      const aPassed = a.ships.filter((s) => this.state.passed[s.imo]).length;
      const bPassed = b.ships.filter((s) => this.state.passed[s.imo]).length;
      return bPassed - aPassed;
    });

    sorted.forEach((participant, index) => {
      const passedCount = participant.ships.filter(
        (s) => this.state.passed[s.imo]
      ).length;
      const movingCount = participant.ships.filter(
        (s) => this.state.moving[s.imo] && !this.state.passed[s.imo]
      ).length;
      const waitingCount = 5 - passedCount - movingCount;

      const card = document.createElement("div");
      card.className = "score-card";
      card.style.borderLeftColor = participant.color;
      card.innerHTML = `
        <div class="score-rank">#${index + 1}</div>
        <div class="score-info">
          <div class="score-name" style="color:${participant.color}">${participant.name}</div>
          <div class="score-stats">
            <span class="stat passed-stat">${passedCount} passed</span>
            <span class="stat moving-stat">${movingCount} moving</span>
            <span class="stat waiting-stat">${waitingCount} waiting</span>
          </div>
          <div class="score-progress">
            ${participant.ships
              .map((s) => {
                const status = this.state.passed[s.imo]
                  ? "passed"
                  : this.state.moving[s.imo]
                    ? "moving"
                    : "waiting";
                return `<div class="progress-dot ${status}" title="${s.name}"></div>`;
              })
              .join("")}
          </div>
        </div>
      `;

      card.addEventListener("click", () => this.scrollToParticipant(participant.name));
      container.appendChild(card);
    });
  }

  renderShipList() {
    const container = document.getElementById("ship-list");
    container.innerHTML = "";

    PARTICIPANTS.forEach((participant) => {
      const section = document.createElement("div");
      section.className = "participant-section";
      section.id = `participant-${participant.name}`;

      const header = document.createElement("div");
      header.className = "participant-header";
      header.style.borderLeftColor = participant.color;
      header.innerHTML = `<h3 style="color:${participant.color}">${participant.name}</h3>`;
      section.appendChild(header);

      participant.ships.forEach((ship) => {
        const isPassed = !!this.state.passed[ship.imo];
        const isMoving = !!this.state.moving[ship.imo];
        const flagEmoji = FLAG_EMOJIS[ship.flag] || "\u{1F3F4}";

        const shipCard = document.createElement("div");
        shipCard.className = `ship-card ${isPassed ? "ship-passed" : isMoving ? "ship-moving" : "ship-waiting"}`;
        shipCard.innerHTML = `
          <div class="ship-card-main">
            <div class="ship-status-indicator ${isPassed ? "passed" : isMoving ? "moving" : "waiting"}"></div>
            <div class="ship-details">
              <div class="ship-name">${ship.name}</div>
              <div class="ship-meta">
                ${flagEmoji} ${ship.flag} &middot; IMO ${ship.imo}
                &middot; <a href="https://www.marinetraffic.com/en/ais/details/ships/imo:${ship.imo}" target="_blank" class="ship-link">Track</a>
                &middot; <a href="#" class="ship-link" onclick="event.preventDefault();tracker.locateShip('${ship.imo}')">Locate</a>
              </div>
              ${isPassed ? `<div class="ship-passed-time">Passed: ${new Date(this.state.passed[ship.imo].timestamp).toLocaleString()}</div>` : ""}
            </div>
            <div class="ship-actions">
              ${
                !isPassed
                  ? `
                <button class="btn btn-move ${isMoving ? "active" : ""}" onclick="tracker.toggleMoving('${ship.imo}')" title="Toggle moving">
                  ${isMoving ? "MOVING" : "WAITING"}
                </button>
                <button class="btn btn-pass" onclick="tracker.markPassed('${ship.imo}')" title="Mark as passed">
                  PASSED
                </button>
              `
                  : `
                <button class="btn btn-undo" onclick="tracker.undoPassed('${ship.imo}')" title="Undo passed">
                  UNDO
                </button>
              `
              }
            </div>
          </div>
        `;

        section.appendChild(shipCard);
      });

      container.appendChild(section);
    });
  }

  locateShip(imo) {
    const pos = this.state.positions[imo];
    if (pos && this.markers[imo]) {
      this.map.setView([pos.lat, pos.lng], 10, { animate: true });
      this.markers[imo].openPopup();
      // Scroll map into view
      document.getElementById("map").scrollIntoView({ behavior: "smooth" });
    }
  }

  scrollToParticipant(name) {
    const el = document.getElementById(`participant-${name}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  toggleMoving(imo) {
    if (this.state.moving[imo]) {
      delete this.state.moving[imo];
    } else {
      this.state.moving[imo] = true;
    }
    this.saveState();
    this.refresh();
  }

  markPassed(imo) {
    this.state.passed[imo] = {
      timestamp: Date.now(),
    };
    delete this.state.moving[imo];
    this.saveState();
    this.refresh();
    this.showNotification(imo);
  }

  undoPassed(imo) {
    delete this.state.passed[imo];
    this.saveState();
    this.refresh();
  }

  showNotification(imo) {
    let shipName = "";
    let ownerName = "";
    let ownerColor = "";
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (s.imo === imo) {
          shipName = s.name;
          ownerName = p.name;
          ownerColor = p.color;
        }
      });
    });

    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerHTML = `
      <div class="notification-content" style="border-left: 4px solid ${ownerColor}">
        <strong>${shipName}</strong> has passed through the Strait!
        <br><span style="color:${ownerColor}">${ownerName}</span> scores a point!
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  updateLeaderboard() {
    const totalShips = PARTICIPANTS.reduce(
      (sum, p) => sum + p.ships.length,
      0
    );
    const totalPassed = Object.keys(this.state.passed).length;
    const totalMoving = Object.keys(this.state.moving).length;

    document.getElementById("total-ships").textContent = totalShips;
    document.getElementById("total-passed").textContent = totalPassed;
    document.getElementById("total-moving").textContent = totalMoving;
    document.getElementById("total-waiting").textContent =
      totalShips - totalPassed - totalMoving;
  }

  refresh() {
    this.renderScoreboard();
    this.renderShipList();
    this.updateLeaderboard();
    this.updateMapMarkers();
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      document.getElementById("clock").textContent =
        now.toUTCString().replace("GMT", "UTC");
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Export state for sharing
  exportState() {
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hormuz-race-state.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import state
  importState(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.state = JSON.parse(e.target.result);
        this.saveState();
        this.refresh();
      } catch (err) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
  }

  // Refresh positions from live AIS data via CORS proxy
  async refreshPositions() {
    const btn = document.getElementById("refresh-btn");
    const statusEl = document.getElementById("refresh-status");
    btn.disabled = true;
    btn.textContent = "Refreshing...";
    statusEl.textContent = "Fetching live positions...";
    statusEl.style.display = "block";

    const allShips = [];
    PARTICIPANTS.forEach((p) => p.ships.forEach((s) => allShips.push(s)));

    let updated = 0;
    let failed = 0;

    // Process ships in batches of 5 to avoid hammering
    for (let i = 0; i < allShips.length; i += 5) {
      const batch = allShips.slice(i, i + 5);
      const promises = batch.map(async (ship) => {
        try {
          const pos = await this.fetchShipPosition(ship);
          if (pos) {
            this.state.positions[ship.imo] = pos;
            updated++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      });
      await Promise.all(promises);
      statusEl.textContent = `Updated ${updated}/${allShips.length} ships... (${failed} failed)`;
      // Small delay between batches
      if (i + 5 < allShips.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    this.saveState();
    this.refresh();

    const now = new Date();
    statusEl.textContent = `Last refresh: ${now.toLocaleTimeString()} - ${updated} updated, ${failed} failed`;
    btn.disabled = false;
    btn.textContent = "Refresh Positions";

    setTimeout(() => {
      statusEl.style.display = "none";
    }, 10000);
  }

  async fetchShipPosition(ship) {
    // Use allorigins as a CORS proxy to fetch myshiptracking vessel page
    const searchName = ship.name.replace(/ /g, "+");
    const searchUrl = `https://www.myshiptracking.com/vessels?name=${searchName}&imo=${ship.imo}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;

    try {
      const searchResp = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
      if (!searchResp.ok) return null;
      const searchHtml = await searchResp.text();

      // Find vessel page link
      const linkMatch = searchHtml.match(new RegExp(`href="(/vessels/[^"]*imo-${ship.imo}[^"]*)"`));
      if (!linkMatch) return null;

      const vesselUrl = `https://www.myshiptracking.com${linkMatch[1]}`;
      const vesselProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(vesselUrl)}`;

      const vesselResp = await fetch(vesselProxyUrl, { signal: AbortSignal.timeout(15000) });
      if (!vesselResp.ok) return null;
      const vesselHtml = await vesselResp.text();

      // Extract lat/lng
      const coordMatch = vesselHtml.match(/lat=([\d.-]+)&lng=([\d.-]+)/);
      if (!coordMatch) return null;

      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
        speed: 0,
        course: 0,
        lastUpdate: Date.now(),
      };
    } catch {
      return null;
    }
  }

  // Reset all state
  resetAll() {
    if (confirm("Are you sure you want to reset all tracking data?")) {
      this.state = { passed: {}, positions: {}, moving: {} };
      this.ensureAllPositions();
      this.saveState();
      this.refresh();
    }
  }
}

// Initialize on page load
let tracker;
document.addEventListener("DOMContentLoaded", () => {
  tracker = new ShipTracker();
});
