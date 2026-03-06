// Hormuz Race Tracker - Main Application

class ShipTracker {
  constructor() {
    this.map = null;
    this.markers = {};
    this.raceLines = [];
    this.finishGlow = null;
    this.sortBy = "distance";
    this.state = this.loadState();
    this.distanceCache = {};
    this.init();
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  loadState() {
    const DATA_VERSION = 7;
    const saved = localStorage.getItem("hormuz-race-state");
    if (saved) {
      const state = JSON.parse(saved);
      if (!state.positions) state.positions = {};
      if (!state.passed) state.passed = {};
      if (!state.raceLog) state.raceLog = [];
      delete state.moving;
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
      raceLog: [],
    };
  }

  saveState() {
    localStorage.setItem("hormuz-race-state", JSON.stringify(this.state));
  }

  ensureAllPositions() {
    let changed = false;
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (REAL_POSITIONS[s.imo]) {
          const real = REAL_POSITIONS[s.imo];
          if (
            !this.state.positions[s.imo] ||
            this.state.positions[s.imo].lat !== real.lat ||
            this.state.positions[s.imo].lng !== real.lng
          ) {
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

  ensureRaceLog() {
    if (!this.state.raceLog) this.state.raceLog = [];
    const loggedImos = new Set(
      this.state.raceLog.filter((e) => e.type === "crossed").map((e) => e.imo)
    );
    const passedEntries = Object.entries(this.state.passed)
      .filter(([imo]) => !loggedImos.has(imo))
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    passedEntries.forEach(([imo, data]) => {
      const info = this.getShipInfo(imo);
      const position = this.getFinishPosition(imo);
      this.state.raceLog.push({
        type: "crossed",
        imo,
        shipName: info.shipName,
        ownerName: info.ownerName,
        ownerColor: info.ownerColor,
        position,
        timestamp: data.timestamp,
      });
    });

    this.state.raceLog.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ============================================
  // UTILITY
  // ============================================

  getShipInfo(imo) {
    for (const p of PARTICIPANTS) {
      for (const s of p.ships) {
        if (s.imo === imo) {
          return {
            ship: s,
            shipName: s.name,
            ownerName: p.name,
            ownerColor: p.color,
            flag: s.flag,
            participant: p,
          };
        }
      }
    }
    return {
      ship: null,
      shipName: "Unknown",
      ownerName: "Unknown",
      ownerColor: "#888",
      flag: "",
      participant: null,
    };
  }

  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get the route waypoints from a ship to the finish line
  // Ships in the Persian Gulf route through the actual eastbound shipping lane
  getRouteToFinish(imo) {
    const pos = this.state.positions[imo];
    if (!pos) return null;

    // Ships already past the strait exit go direct
    const lastWp = SHIPPING_LANE[SHIPPING_LANE.length - 1];
    if (pos.lng >= lastWp.lng) {
      return [
        [pos.lat, pos.lng],
        [FINISH_LINE.lat, FINISH_LINE.lng],
      ];
    }

    // Route through shipping lane waypoints that are ahead of the ship
    const route = [[pos.lat, pos.lng]];
    for (const wp of SHIPPING_LANE) {
      if (wp.lng > pos.lng) {
        route.push([wp.lat, wp.lng]);
      }
    }
    route.push([FINISH_LINE.lat, FINISH_LINE.lng]);
    return route;
  }

  getDistanceToFinish(imo) {
    const route = this.getRouteToFinish(imo);
    if (!route) return Infinity;

    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += this.haversineDistance(
        route[i][0], route[i][1],
        route[i + 1][0], route[i + 1][1]
      );
    }
    return total;
  }

  computeAllDistances() {
    this.distanceCache = {};
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        this.distanceCache[s.imo] = this.getDistanceToFinish(s.imo);
      });
    });
  }

  getFinishedShips() {
    return Object.entries(this.state.passed)
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .map(([imo, data], i) => ({ imo, timestamp: data.timestamp, position: i + 1 }));
  }

  getFinishPosition(imo) {
    const sorted = Object.entries(this.state.passed).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );
    const idx = sorted.findIndex(([id]) => id === imo);
    return idx >= 0 ? idx + 1 : null;
  }

  ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  init() {
    this.ensureAllPositions();
    this.checkFinishCrossings();
    this.ensureRaceLog();
    this.computeAllDistances();
    this.initMap();
    this.renderFinishSlots();
    this.renderClosestShip();
    this.renderLeaderboard();
    this.renderShipList();
    this.renderRaceLog();
    this.detectWinner();
    this.initMobileTabs();
    this.startClock();
    this.startAutoRefresh();
  }

  initMobileTabs() {
    const tabs = document.querySelectorAll(".mobile-tabs .tab");
    const panelMap = {
      leaderboard: "panel-leaderboard",
      map: "panel-map",
      ships: "panel-ships",
      log: "panel-log",
    };

    // Set initial active panel
    document.getElementById("panel-leaderboard").classList.add("active");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        Object.values(panelMap).forEach((id) => {
          document.getElementById(id).classList.remove("active");
        });
        const targetId = panelMap[tab.dataset.tab];
        document.getElementById(targetId).classList.add("active");

        // Invalidate map size when showing map
        if (tab.dataset.tab === "map" && this.map) {
          setTimeout(() => this.map.invalidateSize(), 100);
        }
      });
    });
  }

  // ============================================
  // MAP
  // ============================================

  initMap() {
    this.map = L.map("map", {
      center: HORMUZ.center,
      zoom: HORMUZ.zoom,
      zoomControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(this.map);

    // Finished zone (green shading east of finish line)
    L.polygon(
      [
        [24.5, 56.42],
        [24.5, 58.5],
        [27.5, 58.5],
        [27.5, 56.42],
      ],
      {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.06,
        weight: 0,
      }
    ).addTo(this.map);

    // Glowing finish line (3 layers)
    this.finishGlow = L.polyline(HORMUZ.gateLine, {
      color: "#ff4757",
      weight: 14,
      opacity: 0.12,
    }).addTo(this.map);

    L.polyline(HORMUZ.gateLine, {
      color: "#ff4757",
      weight: 6,
      opacity: 0.35,
    }).addTo(this.map);

    L.polyline(HORMUZ.gateLine, {
      color: "#ff4757",
      weight: 2,
      dashArray: "10, 10",
      opacity: 0.9,
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

    // Location labels
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

    this.placeAllShips();
    this.drawRaceLines();
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
        <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span> Racing</div>
        <div class="legend-item"><span class="legend-dot" style="background:#10b981;opacity:0.4"></span> Finished</div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }

  getClosestUnpassedImos(n) {
    const unpassed = [];
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (!this.state.passed[s.imo]) {
          unpassed.push({ imo: s.imo, distance: this.distanceCache[s.imo] || Infinity });
        }
      });
    });
    unpassed.sort((a, b) => a.distance - b.distance);
    return new Set(unpassed.slice(0, n).map((s) => s.imo));
  }

  createShipIcon(ship, participant, isClose) {
    const isPassed = !!this.state.passed[ship.imo];

    let opacity = "";
    const size = isClose && !isPassed ? 40 : 32;
    const closeClass = isClose && !isPassed ? " close-ship" : "";

    if (isPassed) {
      opacity = "opacity:0.35;";
    }

    return L.divIcon({
      className: "ship-marker",
      html: `<div class="ship-icon${closeClass}" style="background:${participant.color};${opacity}width:${size}px;height:${size}px;">
        <span class="ship-icon-text">${ship.name.substring(0, 2).toUpperCase()}</span>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  createShipPopup(ship, participant) {
    const isPassed = !!this.state.passed[ship.imo];
    const pos = this.state.positions[ship.imo];
    const distance = this.distanceCache[ship.imo];
    const status = isPassed ? "FINISHED" : "RACING";
    const statusColor = isPassed ? "#10b981" : "#3b82f6";

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
      ${
        !isPassed && distance !== Infinity
          ? `<div style="font-size:12px;color:#3b82f6;font-weight:600;margin-top:4px">${distance.toFixed(1)} nm to finish</div>`
          : ""
      }
      ${pos ? `<div style="font-size:11px;color:#64748b;margin-top:4px">${pos.lat.toFixed(4)}N, ${pos.lng.toFixed(4)}E</div>` : ""}
    </div>`;
  }

  placeAllShips() {
    const closeImos = this.getClosestUnpassedImos(5);

    PARTICIPANTS.forEach((participant) => {
      participant.ships.forEach((ship) => {
        const pos = this.state.positions[ship.imo];
        if (!pos) return;

        const isClose = closeImos.has(ship.imo);
        const icon = this.createShipIcon(ship, participant, isClose);
        const marker = L.marker([pos.lat, pos.lng], { icon })
          .addTo(this.map)
          .bindPopup(this.createShipPopup(ship, participant));

        this.markers[ship.imo] = marker;
      });
    });
  }

  drawRaceLines() {
    // Remove existing race lines
    this.raceLines.forEach((l) => this.map.removeLayer(l));
    this.raceLines = [];

    const closeImos = this.getClosestUnpassedImos(5);

    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (this.state.passed[s.imo]) return;
        const route = this.getRouteToFinish(s.imo);
        if (!route) return;

        const isClose = closeImos.has(s.imo);
        const line = L.polyline(route, {
          color: p.color,
          weight: isClose ? 1.5 : 0.8,
          dashArray: isClose ? "6, 8" : "3, 10",
          opacity: isClose ? 0.5 : 0.15,
        }).addTo(this.map);

        this.raceLines.push(line);
      });
    });
  }

  updateMapMarkers() {
    Object.values(this.markers).forEach((m) => this.map.removeLayer(m));
    this.markers = {};
    this.placeAllShips();
    this.drawRaceLines();
  }

  // ============================================
  // RACE BANNER - FINISH SLOTS
  // ============================================

  renderFinishSlots() {
    const container = document.getElementById("finish-slots");
    const finished = this.getFinishedShips();
    const labels = ["1st", "2nd", "3rd", "4th", "5th"];

    let html = "";
    for (let i = 0; i < 5; i++) {
      const pos = i + 1;
      const ship = finished[i];

      if (ship) {
        const info = this.getShipInfo(ship.imo);
        const time = new Date(ship.timestamp).toLocaleTimeString();
        html += `
          <div class="finish-slot filled" data-position="${pos}">
            <div class="slot-position">${labels[i]}</div>
            <div class="slot-ship">${info.shipName}</div>
            <div class="slot-owner" style="color:${info.ownerColor}">${info.ownerName}</div>
            <div class="slot-time">${time}</div>
          </div>`;
      } else {
        html += `
          <div class="finish-slot" data-position="${pos}">
            <div class="slot-position">${labels[i]}</div>
            <div class="slot-empty">---</div>
          </div>`;
      }
    }
    container.innerHTML = html;

    // Update progress text
    const count = finished.length;
    document.getElementById("race-progress").textContent =
      `${Math.min(count, 5)} of 5 ships have crossed`;
  }

  renderClosestShip() {
    const container = document.getElementById("closest-ship");

    // Find closest unpassed ship
    let closest = null;
    let closestDist = Infinity;

    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (!this.state.passed[s.imo]) {
          const d = this.distanceCache[s.imo] || Infinity;
          if (d < closestDist) {
            closestDist = d;
            closest = { ship: s, participant: p, distance: d };
          }
        }
      });
    });

    if (closest) {
      container.innerHTML = `Closest: <span class="ship-highlight">${closest.ship.name}</span> &mdash; <span class="distance-highlight">${closest.distance.toFixed(1)} nm</span>`;
    } else {
      container.innerHTML = "All ships have finished!";
    }
  }

  // ============================================
  // LEADERBOARD
  // ============================================

  renderLeaderboard() {
    const container = document.getElementById("scoreboard");
    container.innerHTML = "";

    // Calculate max distance for progress bars
    let maxDistance = 0;
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (!this.state.passed[s.imo]) {
          const d = this.distanceCache[s.imo] || 0;
          if (d > maxDistance && d !== Infinity) maxDistance = d;
        }
      });
    });
    if (maxDistance === 0) maxDistance = 1;

    // Sort participants: passed count desc, then closest ship distance asc
    const sorted = [...PARTICIPANTS]
      .map((p) => {
        const passedCount = p.ships.filter(
          (s) => this.state.passed[s.imo]
        ).length;

        // Find closest unpassed ship
        let bestShip = null;
        let bestDist = Infinity;
        p.ships.forEach((s) => {
          if (!this.state.passed[s.imo]) {
            const d = this.distanceCache[s.imo] || Infinity;
            if (d < bestDist) {
              bestDist = d;
              bestShip = s;
            }
          }
        });

        return { participant: p, passedCount, bestShip, bestDist };
      })
      .sort((a, b) => {
        if (b.passedCount !== a.passedCount)
          return b.passedCount - a.passedCount;
        return a.bestDist - b.bestDist;
      });

    sorted.forEach((entry, index) => {
      const p = entry.participant;
      const progressPct =
        entry.bestDist === Infinity
          ? 100
          : Math.max(0, Math.min(100, ((maxDistance - entry.bestDist) / maxDistance) * 100));

      const card = document.createElement("div");
      card.className = "score-card";
      card.style.borderLeftColor = p.color;

      card.innerHTML = `
        <div class="score-card-top">
          <div class="score-rank">#${index + 1}</div>
          <div class="score-name" style="color:${p.color}">${p.name}</div>
          ${entry.passedCount > 0 ? `<div class="score-passed-badge">${entry.passedCount} passed</div>` : ""}
        </div>
        ${
          entry.bestShip
            ? `<div class="score-best-ship">
                Best: <span class="best-name">${entry.bestShip.name}</span>
                &mdash; <span class="best-distance">${entry.bestDist.toFixed(1)} nm</span>
              </div>
              <div class="score-progress-bar">
                <div class="score-progress-fill" style="width:${progressPct}%;background:${p.color}"></div>
              </div>`
            : `<div class="score-best-ship" style="color:#10b981">All ships finished!</div>`
        }
        <div class="score-dots">
          ${p.ships
            .map((s) => {
              const status = this.state.passed[s.imo] ? "passed" : "racing";
              return `<div class="progress-dot ${status}" title="${s.name}"></div>`;
            })
            .join("")}
        </div>
      `;

      card.addEventListener("click", () =>
        this.showParticipantShips(p.name)
      );
      container.appendChild(card);
    });
  }

  // ============================================
  // RACE LOG
  // ============================================

  renderRaceLog() {
    const container = document.getElementById("race-log");

    if (!this.state.raceLog || this.state.raceLog.length === 0) {
      container.innerHTML =
        '<div class="log-empty">No events yet. Ships will appear here as they cross the finish line.</div>';
      return;
    }

    container.innerHTML = this.state.raceLog
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleString();

        if (entry.type === "crossed") {
          return `
            <div class="log-entry crossed" style="border-left-color:${entry.ownerColor}">
              <div class="log-text">
                <span class="log-ship">${entry.shipName}</span> crossed the finish line!
                <span class="log-owner" style="color:${entry.ownerColor}">${entry.ownerName}</span>
                takes <span class="log-position">${this.ordinal(entry.position)}</span>!
              </div>
              <div class="log-time">${time}</div>
            </div>`;
        }

        if (entry.type === "movement") {
          const lines = entry.movers.map((m) => {
            const dir = m.delta > 0 ? "closer" : "further";
            const arrow = m.delta > 0 ? "\u25B2" : "\u25BC";
            const cls = m.delta > 0 ? "moving-closer" : "moving-further";
            return `<div class="log-mover ${cls}">
              <span class="log-ship">${m.shipName}</span>
              <span class="log-owner" style="color:${m.ownerColor}">${m.ownerName}</span>
              <span class="log-delta">${arrow} ${Math.abs(m.delta).toFixed(1)} nm ${dir}</span>
              <span class="log-dist">${m.newDist.toFixed(1)} nm left</span>
            </div>`;
          }).join("");

          return `
            <div class="log-entry movement">
              <div class="log-text log-movement-header">Position update &mdash; ${entry.movers.length} ship${entry.movers.length > 1 ? "s" : ""} moved</div>
              <div class="log-movers">${lines}</div>
              <div class="log-time">${time}</div>
            </div>`;
        }

        return "";
      })
      .join("");
  }

  addRaceLogEntry(entry) {
    if (!this.state.raceLog) this.state.raceLog = [];
    this.state.raceLog.unshift(entry);
    this.state.raceLog.sort((a, b) => b.timestamp - a.timestamp);
    // Keep log from growing unbounded
    if (this.state.raceLog.length > 50) {
      this.state.raceLog = this.state.raceLog.slice(0, 50);
    }
  }

  logMovements(oldDistances) {
    const movers = [];

    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (this.state.passed[s.imo]) return;
        const oldDist = oldDistances[s.imo];
        if (oldDist === undefined || oldDist === Infinity) return;
        const newDist = this.distanceCache[s.imo];
        if (newDist === undefined || newDist === Infinity) return;

        const delta = oldDist - newDist; // positive = moved closer
        if (Math.abs(delta) < 0.5) return; // skip negligible movement

        movers.push({
          imo: s.imo,
          shipName: s.name,
          ownerName: p.name,
          ownerColor: p.color,
          delta,
          newDist,
        });
      });
    });

    if (movers.length === 0) return;

    // Sort by most movement toward finish
    movers.sort((a, b) => b.delta - a.delta);

    this.addRaceLogEntry({
      type: "movement",
      movers,
      timestamp: Date.now(),
    });

    this.saveState();
  }

  // ============================================
  // SHIP LIST
  // ============================================

  renderShipList() {
    const container = document.getElementById("ship-list");
    container.innerHTML = "";

    // Build flat list
    const allShips = [];
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        allShips.push({
          ship: s,
          participant: p,
          distance: this.distanceCache[s.imo] || Infinity,
          isPassed: !!this.state.passed[s.imo],
          passedTime: this.state.passed[s.imo]?.timestamp,
        });
      });
    });

    // Compute distance rank for non-passed ships
    const unpassedSorted = allShips
      .filter((s) => !s.isPassed)
      .sort((a, b) => a.distance - b.distance);
    const distanceRank = {};
    unpassedSorted.forEach((s, i) => {
      distanceRank[s.ship.imo] = i + 1;
    });

    if (this.sortBy === "owner") {
      this.renderShipListByOwner(allShips, distanceRank);
    } else {
      this.renderShipListFlat(allShips, distanceRank);
    }
  }

  renderShipListFlat(allShips, distanceRank) {
    const container = document.getElementById("ship-list");

    // Sort by distance (finished ships last, ordered by finish time)
    allShips.sort((a, b) => {
      if (a.isPassed && !b.isPassed) return 1;
      if (!a.isPassed && b.isPassed) return -1;
      if (a.isPassed && b.isPassed)
        return a.passedTime - b.passedTime;
      return a.distance - b.distance;
    });

    allShips.forEach((entry) => {
      container.appendChild(
        this.createShipCardElement(entry, distanceRank, true)
      );
    });
  }

  renderShipListByOwner(allShips, distanceRank) {
    const container = document.getElementById("ship-list");

    PARTICIPANTS.forEach((p) => {
      const section = document.createElement("div");
      section.className = "participant-section";
      section.id = `participant-${p.name}`;

      const header = document.createElement("div");
      header.className = "participant-header";
      header.style.borderLeftColor = p.color;
      header.innerHTML = `<h3><a href="#" style="color:${p.color};text-decoration:none" onclick="event.preventDefault();tracker.showParticipantShips('${p.name}')">${p.name}</a></h3>`;
      section.appendChild(header);

      const shipsDiv = document.createElement("div");
      shipsDiv.className = "participant-ships";

      const ships = allShips
        .filter((s) => s.participant.name === p.name)
        .sort((a, b) => a.distance - b.distance);

      ships.forEach((entry) => {
        shipsDiv.appendChild(
          this.createShipCardElement(entry, distanceRank, false)
        );
      });

      section.appendChild(shipsDiv);
      container.appendChild(section);
    });
  }

  createShipCardElement(entry, distanceRank, showOwner) {
    const { ship, participant, distance, isPassed } = entry;
    const flagEmoji = FLAG_EMOJIS[ship.flag] || "\u{1F3F4}";
    const rank = distanceRank[ship.imo];
    const finishPos = isPassed ? this.getFinishPosition(ship.imo) : null;

    const card = document.createElement("div");
    card.className = `ship-card ${isPassed ? "ship-passed" : ""}`;

    card.innerHTML = `
      <div class="ship-card-main">
        <div class="ship-status-indicator ${isPassed ? "passed" : "racing"}"></div>
        <div class="ship-details">
          <div class="ship-name-row">
            <span class="ship-name">${ship.name}</span>
            ${
              !isPassed && distance !== Infinity
                ? `<span class="ship-distance">${distance.toFixed(1)} nm</span>`
                : ""
            }
            ${
              isPassed && finishPos
                ? `<span class="ship-distance" style="color:#10b981">${this.ordinal(finishPos)} place</span>`
                : ""
            }
          </div>
          <div class="ship-meta">
            ${flagEmoji} ${ship.flag}
            ${showOwner ? ` &middot; <a href="#" class="ship-link" style="color:${participant.color};font-weight:600" onclick="event.preventDefault();tracker.showParticipantShips('${participant.name}')">${participant.name}</a>` : ""}
            &middot; <a href="https://www.marinetraffic.com/en/ais/details/ships/imo:${ship.imo}" target="_blank" class="ship-link">Track</a>
            &middot; <a href="#" class="ship-link" onclick="event.preventDefault();tracker.locateShip('${ship.imo}')">Locate</a>
            ${!isPassed && rank ? ` &middot; <span class="ship-rank">#${rank} closest</span>` : ""}
          </div>
          ${isPassed ? `<div class="ship-passed-time">Crossed: ${new Date(this.state.passed[ship.imo].timestamp).toLocaleString()}</div>` : ""}
        </div>
      </div>
    `;

    return card;
  }

  setSort(sortBy) {
    this.sortBy = sortBy;
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.sort === sortBy);
    });
    this.renderShipList();
  }

  // ============================================
  // AUTO-DETECT FINISH CROSSINGS
  // ============================================

  checkFinishCrossings() {
    const FINISH_LNG = 56.42;
    const newCrossings = [];

    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (this.state.passed[s.imo]) return;
        const pos = this.state.positions[s.imo];
        if (!pos) return;
        if (pos.lng >= FINISH_LNG) {
          newCrossings.push({ imo: s.imo, lng: pos.lng });
        }
      });
    });

    if (newCrossings.length === 0) return;

    // Order simultaneous crossings by longitude (further east = crossed first)
    newCrossings.sort((a, b) => b.lng - a.lng);

    let needsRefresh = false;
    newCrossings.forEach((crossing) => {
      const position = Object.keys(this.state.passed).length + 1;
      this.state.passed[crossing.imo] = { timestamp: Date.now() };

      const info = this.getShipInfo(crossing.imo);

      this.addRaceLogEntry({
        type: "crossed",
        imo: crossing.imo,
        shipName: info.shipName,
        ownerName: info.ownerName,
        ownerColor: info.ownerColor,
        position,
        timestamp: Date.now(),
      });

      needsRefresh = true;

      // Celebration for top 5, notification for others
      if (position <= 5) {
        setTimeout(() => this.triggerCelebration(info, position), (position - 1) * 500);
      } else {
        this.showNotification(crossing.imo);
      }
    });

    if (needsRefresh) {
      this.saveState();

      // Detect winner if 5+ have finished
      if (Object.keys(this.state.passed).length >= 5) {
        setTimeout(() => this.detectWinner(), 3500);
      }
    }
  }

  locateShip(imo) {
    const pos = this.state.positions[imo];
    if (pos && this.markers[imo]) {
      this.map.setView([pos.lat, pos.lng], 10, { animate: true });
      this.markers[imo].openPopup();
      document.getElementById("map").scrollIntoView({ behavior: "smooth" });

      // On mobile, switch to map tab
      const mapTab = document.querySelector('.tab[data-tab="map"]');
      if (mapTab && window.innerWidth <= 768) {
        mapTab.click();
      }
    }
  }

  showParticipantShips(name) {
    const participant = PARTICIPANTS.find((p) => p.name === name);
    if (!participant) return;

    // Close all existing popups
    Object.values(this.markers).forEach((m) => m.closePopup());

    // Collect positions and open popups for this participant's ships
    const bounds = [];
    participant.ships.forEach((s) => {
      const pos = this.state.positions[s.imo];
      if (pos && this.markers[s.imo]) {
        bounds.push([pos.lat, pos.lng]);
        this.markers[s.imo].openPopup();
      }
    });

    if (bounds.length === 0) return;

    // Fit map to show all their ships
    if (bounds.length === 1) {
      this.map.setView(bounds[0], 10, { animate: true });
    } else {
      this.map.fitBounds(bounds, { padding: [50, 50], animate: true, maxZoom: 10 });
    }

    // Switch to map tab on mobile
    const mapTab = document.querySelector('.tab[data-tab="map"]');
    if (mapTab && window.innerWidth <= 768) {
      mapTab.click();
    }
  }

  // ============================================
  // CELEBRATIONS
  // ============================================

  triggerCelebration(info, position) {
    this.triggerConfetti();
    this.showCelebrationBanner(info, position);
    this.flashFinishLine();
  }

  triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = "block";

    const colors = [
      "#ffd700",
      "#ff4757",
      "#10b981",
      "#3b82f6",
      "#f59e0b",
      "#ff6b81",
      "#06b6d4",
      "#8b5cf6",
    ];
    const particles = [];

    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        w: 4 + Math.random() * 10,
        h: 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 2 + Math.random() * 5,
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 12,
        wobble: Math.random() * 10,
        drift: (Math.random() - 0.5) * 2,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p) => {
        p.y += p.speed;
        p.x += Math.sin(frame * 0.03 + p.wobble) * 1.5 + p.drift;
        p.angle += p.spin;
        p.speed += 0.02; // gravity

        if (p.y < canvas.height + 20) active = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (active && frame < 350) {
        requestAnimationFrame(animate);
      } else {
        canvas.style.display = "none";
      }
    };
    requestAnimationFrame(animate);
  }

  showCelebrationBanner(info, position) {
    const banner = document.getElementById("celebration-banner");
    banner.className = "celebration-banner";
    banner.style.background = info.ownerColor;
    banner.innerHTML = `${info.shipName} crosses the line! <span style="opacity:0.8">${info.ownerName}</span> takes ${this.ordinal(position)}!`;

    // Trigger animation
    requestAnimationFrame(() => {
      banner.classList.add("show");
    });

    setTimeout(() => {
      banner.classList.remove("show");
    }, 3200);
  }

  flashFinishLine() {
    if (!this.finishGlow) return;
    let flashes = 0;
    const flash = () => {
      this.finishGlow.setStyle({
        opacity: flashes % 2 === 0 ? 0.6 : 0.12,
      });
      flashes++;
      if (flashes < 8) {
        setTimeout(flash, 200);
      } else {
        this.finishGlow.setStyle({ opacity: 0.12 });
      }
    };
    flash();
  }

  showNotification(imo) {
    const info = this.getShipInfo(imo);

    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerHTML = `
      <div class="notification-content" style="border-left: 4px solid ${info.ownerColor}">
        <strong>${info.shipName}</strong> has passed through the Strait!
        <br><span style="color:${info.ownerColor}">${info.ownerName}</span> scores!
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  detectWinner() {
    const finished = this.getFinishedShips();
    if (finished.length >= 5) {
      const first = finished[0];
      const info = this.getShipInfo(first.imo);
      const banner = document.getElementById("winner-banner");
      banner.innerHTML = `RACE COMPLETE! ${info.ownerName.toUpperCase()} WINS WITH ${info.shipName.toUpperCase()}!`;
      banner.style.display = "block";
    }
  }

  // ============================================
  // REFRESH
  // ============================================

  refresh() {
    this.computeAllDistances();
    this.renderFinishSlots();
    this.renderClosestShip();
    this.renderLeaderboard();
    this.renderShipList();
    this.renderRaceLog();
    this.updateMapMarkers();
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      document.getElementById("clock").textContent = now
        .toUTCString()
        .replace("GMT", "UTC");
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ============================================
  // IMPORT / EXPORT
  // ============================================

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

  importState(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.state = JSON.parse(e.target.result);
        if (!this.state.raceLog) this.state.raceLog = [];
        this.saveState();
        this.ensureRaceLog();
        this.refresh();
      } catch (err) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
  }

  async refreshPositions() {
    const btn = document.getElementById("refresh-btn");
    const statusEl = document.getElementById("refresh-status");
    btn.disabled = true;
    btn.textContent = "Refreshing...";
    statusEl.textContent = "Fetching live positions...";
    statusEl.style.display = "block";

    // Snapshot distances before refresh for movement detection
    const oldDistances = {};
    PARTICIPANTS.forEach((p) => {
      p.ships.forEach((s) => {
        if (!this.state.passed[s.imo]) {
          oldDistances[s.imo] = this.distanceCache[s.imo] || Infinity;
        }
      });
    });

    const allShips = [];
    PARTICIPANTS.forEach((p) => p.ships.forEach((s) => allShips.push(s)));

    let updated = 0;
    let failed = 0;

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
      if (i + 5 < allShips.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    this.saveState();
    this.checkFinishCrossings();
    this.computeAllDistances();
    this.logMovements(oldDistances);
    this.refresh();

    const now = new Date();
    statusEl.textContent = `Last refresh: ${now.toLocaleTimeString()} - ${updated} updated, ${failed} failed`;
    btn.disabled = false;
    btn.textContent = "Refresh";

    // Reset auto-refresh countdown
    this.resetAutoRefreshCountdown();
  }

  async fetchShipPosition(ship) {
    const searchName = ship.name.replace(/ /g, "+");
    const searchUrl = `https://www.myshiptracking.com/vessels?name=${searchName}&imo=${ship.imo}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;

    try {
      const searchResp = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (!searchResp.ok) return null;
      const searchHtml = await searchResp.text();

      const linkMatch = searchHtml.match(
        new RegExp(`href="(/vessels/[^"]*imo-${ship.imo}[^"]*)"`)
      );
      if (!linkMatch) return null;

      const vesselUrl = `https://www.myshiptracking.com${linkMatch[1]}`;
      const vesselProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(vesselUrl)}`;

      const vesselResp = await fetch(vesselProxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (!vesselResp.ok) return null;
      const vesselHtml = await vesselResp.text();

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

  resetAll() {
    if (confirm("Are you sure you want to reset all tracking data?")) {
      this.state = {
        passed: {},
        positions: {},
        raceLog: [],
      };
      this.ensureAllPositions();
      this.saveState();
      document.getElementById("winner-banner").style.display = "none";
      this.refresh();
    }
  }

  // ============================================
  // AUTO-REFRESH TIMER
  // ============================================

  startAutoRefresh() {
    const INTERVAL = 5 * 60; // 5 minutes in seconds
    this.autoRefreshRemaining = INTERVAL;

    // Update countdown every second
    this.autoRefreshCountdown = setInterval(() => {
      this.autoRefreshRemaining--;
      const statusEl = document.getElementById("refresh-status");

      if (this.autoRefreshRemaining <= 0) {
        this.autoRefreshRemaining = INTERVAL;
        this.refreshPositions();
      } else {
        const min = Math.floor(this.autoRefreshRemaining / 60);
        const sec = this.autoRefreshRemaining % 60;
        statusEl.textContent = `Auto-refresh in ${min}:${sec.toString().padStart(2, "0")}`;
        statusEl.style.display = "block";
      }
    }, 1000);
  }

  resetAutoRefreshCountdown() {
    this.autoRefreshRemaining = 5 * 60;
  }
}

// Initialize on page load
let tracker;
document.addEventListener("DOMContentLoaded", () => {
  tracker = new ShipTracker();
});
