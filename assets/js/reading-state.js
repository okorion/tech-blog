(function () {
  var script = document.currentScript;
  var baseurl = script ? script.getAttribute("data-baseurl") || "" : "";
  var storageKey = "okorion:read-posts:v1";
  var postPathPattern = /^\/posts\/[^/]+\/?$/;

  function getStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function normalizePath(value) {
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) {
        return null;
      }

      var path = url.pathname;
      if (baseurl && path.indexOf(baseurl + "/") === 0) {
        path = path.slice(baseurl.length);
      }

      if (path.length > 1 && path.endsWith("/")) {
        return path;
      }

      return path + "/";
    } catch (error) {
      return null;
    }
  }

  function readStore(storage) {
    try {
      return JSON.parse(storage.getItem(storageKey) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeStore(storage, store) {
    try {
      storage.setItem(storageKey, JSON.stringify(store));
    } catch (error) {
      return false;
    }

    return true;
  }

  function createReadMarker() {
    var marker = document.createElement("span");
    marker.className = "read-marker";
    marker.textContent = "읽음";
    return marker;
  }

  function getMarkerTarget(link) {
    return (
      link.querySelector("h1, h2, h3, h4, p, .learning-path-post-title") ||
      link
    );
  }

  function markReadLinks(store) {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var postPath = normalizePath(link.getAttribute("href"));
      if (!postPath || !postPathPattern.test(postPath) || !store[postPath]) {
        return;
      }

      link.dataset.readState = "read";
      if (link.querySelector(".read-marker")) {
        return;
      }

      getMarkerTarget(link).appendChild(createReadMarker());
    });
  }

  function showCurrentPostStatus(currentPath) {
    if (!postPathPattern.test(currentPath)) {
      return;
    }

    var heading = document.querySelector("article header h1[data-toc-skip]");
    if (!heading || document.querySelector(".post-read-status")) {
      return;
    }

    var status = document.createElement("span");
    status.className = "post-read-status";
    status.textContent = "읽은 글";
    heading.insertAdjacentElement("afterend", status);
  }

  function updateLearningPathProgress(store) {
    document.querySelectorAll("[data-learning-path]").forEach(function (path) {
      var total = Number(path.getAttribute("data-post-count")) || 0;
      var read = 0;

      path.querySelectorAll("a[href]").forEach(function (link) {
        var postPath = normalizePath(link.getAttribute("href"));
        if (postPath && store[postPath]) {
          read += 1;
        }
      });

      var label = path.querySelector("[data-progress-label]");
      var bar = path.querySelector("[data-progress-bar]");
      var percent = total > 0 ? Math.round((read / total) * 100) : 0;

      if (label) {
        label.textContent = read + " / " + total;
      }

      if (bar) {
        bar.style.width = percent + "%";
      }
    });
  }

  function init() {
    var storage = getStorage();
    if (!storage) {
      return;
    }

    var store = readStore(storage);
    var currentPath = normalizePath(window.location.href);

    if (currentPath && postPathPattern.test(currentPath)) {
      store[currentPath] = new Date().toISOString();
      writeStore(storage, store);
      showCurrentPostStatus(currentPath);
    }

    markReadLinks(store);
    updateLearningPathProgress(store);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", init);
})();
