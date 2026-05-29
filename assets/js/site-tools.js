(function () {
  var script = document.currentScript;
  var commandSource = script ? script.getAttribute("data-command-source") : "";
  var tagGraphSource = script ? script.getAttribute("data-tag-graph-source") : "";
  var paletteState = {
    items: [],
    filtered: [],
    index: 0,
    loaded: false
  };
  var paletteElements = null;

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load " + url);
      }

      return response.json();
    });
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function normalize(value) {
    return (value || "").toString().toLowerCase();
  }

  function buildPalette() {
    var overlay = createElement("div", "command-palette", "");
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "command-palette-title");

    var panel = createElement("div", "command-palette-panel", "");
    var header = createElement("div", "command-palette-header", "");
    var title = createElement("h2", "", "Command Palette");
    title.id = "command-palette-title";
    var shortcut = createElement("span", "command-palette-shortcut", "Ctrl K");
    var input = document.createElement("input");
    input.type = "search";
    input.className = "command-palette-input";
    input.placeholder = "검색어 입력";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Command Palette 검색");
    input.setAttribute("aria-controls", "command-palette-results");

    var results = createElement("div", "command-palette-results", "");
    results.id = "command-palette-results";
    results.setAttribute("role", "listbox");

    header.appendChild(title);
    header.appendChild(shortcut);
    panel.appendChild(header);
    panel.appendChild(input);
    panel.appendChild(results);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closePalette();
      }
    });

    input.addEventListener("input", function () {
      paletteState.index = 0;
      renderPaletteResults(input.value);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        movePaletteSelection(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        movePaletteSelection(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        goToSelectedPaletteItem();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
      }
    });

    paletteElements = {
      overlay: overlay,
      input: input,
      results: results
    };
  }

  function loadPaletteItems() {
    if (paletteState.loaded || !commandSource) {
      return Promise.resolve();
    }

    return fetchJson(commandSource)
      .then(function (data) {
        paletteState.items = Array.isArray(data.items) ? data.items : [];
        paletteState.loaded = true;
      })
      .catch(function () {
        paletteState.items = [];
        paletteState.loaded = true;
      });
  }

  function scorePaletteItem(item, query) {
    if (!query) {
      if (item.type === "page") {
        return 30;
      }
      if (item.type === "category") {
        return 18;
      }
      if (item.type === "tag") {
        return 14;
      }
      return 8;
    }

    var title = normalize(item.title);
    var label = normalize(item.label);
    var keywords = normalize(item.keywords);
    var haystack = [title, label, keywords].join(" ");
    var score = 0;
    var terms = query.split(/\s+/).filter(Boolean);

    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (title === term) {
        score += 80;
      } else if (title.indexOf(term) === 0) {
        score += 48;
      } else if (title.indexOf(term) >= 0) {
        score += 32;
      } else if (haystack.indexOf(term) >= 0) {
        score += 14;
      } else {
        return 0;
      }
    }

    if (item.type === "page") {
      score += 10;
    }

    return score;
  }

  function getPaletteIcon(type) {
    if (type === "post") {
      return "fa-regular fa-file-lines";
    }
    if (type === "tag") {
      return "fas fa-tag";
    }
    if (type === "category") {
      return "far fa-folder-open";
    }
    return "fas fa-compass";
  }

  function renderPaletteResults(value) {
    var query = normalize(value).trim();
    var scored = paletteState.items
      .map(function (item) {
        return {
          item: item,
          score: scorePaletteItem(item, query)
        };
      })
      .filter(function (entry) {
        return entry.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || a.item.title.localeCompare(b.item.title);
      })
      .slice(0, 12);

    paletteState.filtered = scored.map(function (entry) {
      return entry.item;
    });

    paletteElements.results.innerHTML = "";

    if (paletteState.filtered.length === 0) {
      paletteElements.results.appendChild(
        createElement("div", "command-palette-empty", "검색 결과가 없습니다.")
      );
      return;
    }

    paletteState.filtered.forEach(function (item, index) {
      var option = createElement("button", "command-palette-item", "");
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", index === paletteState.index ? "true" : "false");
      option.dataset.index = index;

      var icon = createElement("span", "command-palette-item-icon", "");
      icon.innerHTML = '<i class="' + getPaletteIcon(item.type) + '"></i>';
      var text = createElement("span", "command-palette-item-text", "");
      var title = createElement("strong", "", item.title);
      var label = createElement("span", "", item.label || item.type);
      text.appendChild(title);
      text.appendChild(label);
      option.appendChild(icon);
      option.appendChild(text);

      option.addEventListener("click", function () {
        paletteState.index = Number(option.dataset.index) || 0;
        goToSelectedPaletteItem();
      });

      paletteElements.results.appendChild(option);
    });
  }

  function movePaletteSelection(delta) {
    if (paletteState.filtered.length === 0) {
      return;
    }

    paletteState.index =
      (paletteState.index + delta + paletteState.filtered.length) %
      paletteState.filtered.length;
    renderPaletteResults(paletteElements.input.value);
  }

  function goToSelectedPaletteItem() {
    var item = paletteState.filtered[paletteState.index];
    if (!item || !item.url) {
      return;
    }

    window.location.href = item.url;
  }

  function openPalette() {
    if (!paletteElements) {
      buildPalette();
    }

    loadPaletteItems().then(function () {
      paletteElements.overlay.removeAttribute("hidden");
      document.documentElement.classList.add("command-palette-open");
      paletteElements.input.value = "";
      paletteState.index = 0;
      renderPaletteResults("");
      paletteElements.input.focus();
    });
  }

  function closePalette() {
    if (!paletteElements) {
      return;
    }

    paletteElements.overlay.setAttribute("hidden", "");
    document.documentElement.classList.remove("command-palette-open");
  }

  function initCommandPalette() {
    createTopbarPaletteTrigger();

    document.addEventListener("keydown", function (event) {
      var key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openPalette();
      }
    });

    document.querySelectorAll("[data-command-palette-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", openPalette);
    });
  }

  function createTopbarPaletteTrigger() {
    if (document.getElementById("command-palette-topbar-trigger")) {
      return;
    }

    var searchTrigger = document.getElementById("search-trigger");
    if (!searchTrigger || !searchTrigger.parentElement) {
      return;
    }

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "command-palette-topbar-trigger";
    trigger.className = "btn btn-link";
    trigger.setAttribute("aria-label", "Command Palette");
    trigger.setAttribute("title", "Command Palette");
    trigger.setAttribute("data-command-palette-trigger", "");
    trigger.innerHTML = '<i class="fas fa-terminal fa-fw"></i>';
    searchTrigger.insertAdjacentElement("beforebegin", trigger);
  }

  function buildTagGraphData(data) {
    var maxNodes = 48;
    var maxEdges = 90;
    var tags = (data.tags || [])
      .slice()
      .sort(function (a, b) {
        return b.count - a.count || a.name.localeCompare(b.name);
      })
      .slice(0, maxNodes);
    var tagIndex = {};
    var edgeMap = {};

    tags.forEach(function (tag, index) {
      tag.index = index;
      tagIndex[tag.name] = index;
    });

    (data.posts || []).forEach(function (post) {
      var postTags = (post.tags || [])
        .filter(function (tag) {
          return tagIndex[tag] !== undefined;
        })
        .sort();

      for (var i = 0; i < postTags.length; i += 1) {
        for (var j = i + 1; j < postTags.length; j += 1) {
          var source = tagIndex[postTags[i]];
          var target = tagIndex[postTags[j]];
          var key = source + "-" + target;
          edgeMap[key] = edgeMap[key] || {
            source: source,
            target: target,
            weight: 0
          };
          edgeMap[key].weight += 1;
        }
      }
    });

    var edges = Object.keys(edgeMap)
      .map(function (key) {
        return edgeMap[key];
      })
      .sort(function (a, b) {
        return b.weight - a.weight;
      })
      .slice(0, maxEdges);

    return {
      nodes: tags,
      edges: edges
    };
  }

  function layoutGraph(nodes, edges) {
    var width = 960;
    var height = 520;
    var centerX = width / 2;
    var centerY = height / 2;
    var radius = Math.min(width, height) * 0.36;

    nodes.forEach(function (node, index) {
      var angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1);
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
      node.r = 8 + Math.min(18, Math.sqrt(node.count) * 3);
    });

    for (var tick = 0; tick < 180; tick += 1) {
      for (var i = 0; i < nodes.length; i += 1) {
        for (var j = i + 1; j < nodes.length; j += 1) {
          var a = nodes[i];
          var b = nodes[j];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var distance = Math.sqrt(dx * dx + dy * dy) || 1;
          var force = 900 / (distance * distance);
          var fx = (dx / distance) * force;
          var fy = (dy / distance) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      edges.forEach(function (edge) {
        var source = nodes[edge.source];
        var target = nodes[edge.target];
        var dx = target.x - source.x;
        var dy = target.y - source.y;
        var distance = Math.sqrt(dx * dx + dy * dy) || 1;
        var desired = 115 - Math.min(45, edge.weight * 8);
        var force = (distance - desired) * 0.012 * Math.min(edge.weight, 5);
        var fx = (dx / distance) * force;
        var fy = (dy / distance) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      nodes.forEach(function (node) {
        node.vx += (centerX - node.x) * 0.004;
        node.vy += (centerY - node.y) * 0.004;
        node.vx *= 0.72;
        node.vy *= 0.72;
        node.x = Math.max(48, Math.min(width - 48, node.x + node.vx));
        node.y = Math.max(48, Math.min(height - 48, node.y + node.vy));
      });
    }
  }

  function renderTagGraph(root, graph) {
    var canvas = root.querySelector("[data-tag-graph-canvas]");
    var status = root.querySelector("[data-tag-graph-status]");
    var namespace = "http://www.w3.org/2000/svg";
    var width = 960;
    var height = 520;
    var colors = [
      "#2563eb",
      "#0891b2",
      "#16a34a",
      "#ca8a04",
      "#dc2626",
      "#9333ea",
      "#db2777"
    ];
    var adjacency = {};

    graph.edges.forEach(function (edge) {
      adjacency[edge.source] = adjacency[edge.source] || {};
      adjacency[edge.target] = adjacency[edge.target] || {};
      adjacency[edge.source][edge.target] = true;
      adjacency[edge.target][edge.source] = true;
    });

    canvas.innerHTML = "";
    var svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("class", "tag-graph-svg");

    var edgeGroup = document.createElementNS(namespace, "g");
    edgeGroup.setAttribute("class", "tag-graph-edges");
    var nodeGroup = document.createElementNS(namespace, "g");
    nodeGroup.setAttribute("class", "tag-graph-nodes");

    graph.edges.forEach(function (edge) {
      var source = graph.nodes[edge.source];
      var target = graph.nodes[edge.target];
      var line = document.createElementNS(namespace, "line");
      line.setAttribute("x1", source.x.toFixed(1));
      line.setAttribute("y1", source.y.toFixed(1));
      line.setAttribute("x2", target.x.toFixed(1));
      line.setAttribute("y2", target.y.toFixed(1));
      line.setAttribute("stroke-width", (1 + Math.min(edge.weight, 5) * 0.55).toFixed(1));
      line.dataset.source = edge.source;
      line.dataset.target = edge.target;
      edgeGroup.appendChild(line);
    });

    graph.nodes.forEach(function (node, index) {
      var group = document.createElementNS(namespace, "g");
      group.setAttribute("class", "tag-graph-node");
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "link");
      group.setAttribute("aria-label", node.name + " 태그");
      group.setAttribute("transform", "translate(" + node.x.toFixed(1) + " " + node.y.toFixed(1) + ")");
      group.dataset.index = index;

      var circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("r", node.r.toFixed(1));
      circle.setAttribute("fill", colors[index % colors.length]);

      var text = document.createElementNS(namespace, "text");
      text.setAttribute("x", "0");
      text.setAttribute("y", (node.r + 14).toFixed(1));
      text.textContent = node.name;

      group.appendChild(circle);
      group.appendChild(text);
      group.addEventListener("click", function () {
        window.location.href = node.url;
      });
      group.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          window.location.href = node.url;
        }
      });
      group.addEventListener("mouseenter", function () {
        highlightTagGraph(root, index, adjacency);
        if (status) {
          var connected = Object.keys(adjacency[index] || {}).length;
          status.textContent = node.name + " · " + node.count + "개 글 · " + connected + "개 연결";
        }
      });
      group.addEventListener("focus", function () {
        highlightTagGraph(root, index, adjacency);
      });
      group.addEventListener("mouseleave", function () {
        resetTagGraph(root);
        if (status) {
          status.textContent = "";
        }
      });
      group.addEventListener("blur", function () {
        resetTagGraph(root);
      });

      nodeGroup.appendChild(group);
    });

    svg.appendChild(edgeGroup);
    svg.appendChild(nodeGroup);
    canvas.appendChild(svg);
  }

  function highlightTagGraph(root, index, adjacency) {
    root.querySelectorAll(".tag-graph-node").forEach(function (node) {
      var nodeIndex = Number(node.dataset.index);
      var active = nodeIndex === index || !!(adjacency[index] && adjacency[index][nodeIndex]);
      node.classList.toggle("is-dimmed", !active);
      node.classList.toggle("is-active", nodeIndex === index);
    });

    root.querySelectorAll(".tag-graph-edges line").forEach(function (line) {
      var active =
        Number(line.dataset.source) === index || Number(line.dataset.target) === index;
      line.classList.toggle("is-active", active);
      line.classList.toggle("is-dimmed", !active);
    });
  }

  function resetTagGraph(root) {
    root
      .querySelectorAll(".tag-graph-node, .tag-graph-edges line")
      .forEach(function (element) {
        element.classList.remove("is-active", "is-dimmed");
      });
  }

  function initTagGraph() {
    var root = document.querySelector("[data-tag-graph]");
    if (!root || !tagGraphSource) {
      return;
    }

    var render = function () {
      fetchJson(tagGraphSource)
        .then(function (data) {
          var graph = buildTagGraphData(data);
          layoutGraph(graph.nodes, graph.edges);
          renderTagGraph(root, graph);
        })
        .catch(function () {
          var status = root.querySelector("[data-tag-graph-status]");
          if (status) {
            status.textContent = "태그 그래프를 불러오지 못했습니다.";
          }
        });
    };

    var resetButton = root.querySelector("[data-tag-graph-reset]");
    if (resetButton) {
      resetButton.addEventListener("click", render);
    }

    render();
  }

  function init() {
    initCommandPalette();
    initTagGraph();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
