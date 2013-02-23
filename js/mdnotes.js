/*jshint browser: true, esnext: true, devel: true, unused: false */
/*global marked: true */
(function () {
  /*jshint maxstatements: 32 */
  "use strict";
  function DB(dbName, storeName, version) {
    var idb = window.indexedDD || window.webkitIndexedDB || window.mozIndexedDB,
        db,
        req;

    if ('webkitIndexedDB' in window) {
      window.IDBTransaction = window.webkitIDBTransaction;
      window.IDBKeyRange = window.webkitIDBKeyRange;
    }

    function getStore(mode) {
      mode = mode || 'readonly';
      return db.transaction([storeName], mode).objectStore(storeName);
    }
    function initDb(cb) {
      var request = idb.open(dbName, version);

      request.onsuccess = function (e) {
        db = e.target.result;

        // For old Chromes {
        if (db.setVersion) {
          console.log("in old setVersion");
          if (db.version !== version) {
            req = db.setVersion(version);
            req.onsuccess = function () {
              if (db.objectStoreNames.contains(storeName)) {
                db.deleteObjectStore(storeName);
              }
              db.createObjectStore(storeName, {keyPath: "timeStamp"});
              req.result.oncomplete = function (e) {
                if (cb) {
        cb();
                }
              };
            };
          }
        } else {
        // }
          cb();
        }
      };
      request.onupgradeneeded = function (e) {
        db = e.target.result;
        if (db.objectStoreNames.contains(storeName)) {
          db.deleteObjectStore(storeName);
        }

        db.createObjectStore(storeName, {keyPath: "timeStamp"});
      };
      request.onerror = function onError(e) {
        console.log("Error on Open", e);
      };
    }

    function set(data, cb) {
      var request = getStore('readwrite').put(data);
      request.onsuccess = function (e) {
        cb();
      };
      request.onerror = function (e) {
        console.log("Error Adding: ", e);
      };
    }
    function read(id, cb) {
      var request, results = [];
      if (typeof id === 'function') {
        cb = id;
        request = getStore().openCursor();
        request.onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor['continue']();
          } else {
            cb(results);
          }
        };
        request.onerror = function (e) {
          console.log("Error on cursor: ", e);
        };
      } else {
        request = getStore().get(id);
        request.onsuccess = function (e) {
          cb(e.target.result);
        };
        request.onerror = function (e) {
          console.log("Error reading", e);
        };
      }
    }
    function remove(id, cb) {
      var request = getStore('readwrite')['delete'](id);
      request.onsuccess = function (e) {
        cb();
      };
      request.onerror = function (e) {
        console.log("Error deleting: ", e);
      };
    }

    return {
      init: initDb,
      set: set,
      read: read,
      remove: remove
    };

  }

  function onResize() {
    utils.getDeviceType();
    console.log(utils.device);
  }

  /**
   * Switch active panel
   *
   * @param {String} new active panel selector
   */
  function setActivePanel(panel) {
    if (utils.device.type === 'desktop') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (e) {
        if (e.dataset.panel === panel) {
          e.classList.remove('inactive');
          e.classList.add('active');
        } else {
          e.classList.remove('active');
          e.classList.add('inactive');
        }
      });
    } else {
    Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (e) { e.style.display = e.dataset.panel === panel ? '' : 'none'; });
  }
  }

  function init() {
    setActivePanel('list');
    var db,
        iSave,
        form    = document.getElementById('form'),
        title   = document.getElementById('title'),
        content = document.getElementById('content'),
        preview = document.getElementById('preview')
        ;

    function getNotes() {
      var notes = document.getElementById("notes"),
          li;

      notes.innerHTML = "";
      db.read(function (res) {
        if (res.length === 0) {
          notes.textContent = "Aucune note, cliquez sur '+' pour créer la première";
        } else {
          res.forEach(function (item) {
            li = document.createElement("li");
            li.textContent = item.title;
            li.dataset.key = item.timeStamp;
            notes.appendChild(li);
          });
        }
      });
    }
    function saveNote() {
      db.set({
        title: title.value,
        content: content.value,
        timeStamp: form.dataset.key
      }, function onSaved() {
        title.classList.add('saved');
        content.classList.add('saved');
        window.setTimeout(function () {
          title.classList.remove('saved');
          content.classList.remove('saved');
        }, 500);
        getNotes();
      });
    }

    function addTag(start, end) {
      end = end || '';
      var val = content.value;
      content.value = val.slice(0, content.selectionStart) + start + val.slice(content.selectionStart, content.selectionEnd) + end + val.slice(content.selectionEnd);
    }

    function initContent() {
      content.parentNode.classList.remove('hidden');
      preview.classList.add('hidden');
      document.getElementById('previewSwitch').checked = false;
    }

    db = new DB('notes', 'note', 5);
    db.init(getNotes);
    document.getElementById("notes").addEventListener('click', function (e) {
      var key = e.target.dataset.key;
      if (key) {
        db.read(key, function onRead(res) {
          form.dataset.key  = res.timeStamp;
          title.value       = res.title;
          content.value     = res.content;
          preview.innerHTML = marked(res.content);
          initContent();
        });
        setActivePanel('detail');
      }
    }, false);
    document.getElementById("add").addEventListener('click', function () {
      form.dataset.key  = '' + new Date().getTime();
      title.value       = '';
      content.value     = '';
      preview.innerHTML = '';
      initContent();
      setActivePanel('detail');
    }, false);
    document.getElementById("save").addEventListener('click', saveNote, false);
    title.addEventListener('blur', saveNote, false);
    content.addEventListener('focus', function () {
      iSave = window.setInterval(saveNote, 10000);
    }, false);
    content.addEventListener('blur', function () {
      if (iSave) {
        window.clearInterval(iSave);
      }
      saveNote();
      preview.innerHTML = marked(content.value);
    }, false);
    document.getElementById('back').addEventListener('click', function () {setActivePanel('list'); }, false);
    document.getElementById('close').addEventListener('click', function () {}, false);
    document.querySelector('#toolbox .h1').addEventListener('click', function () {addTag('# '); }, false);
    document.querySelector('#toolbox .link').addEventListener('click', function () {addTag('[', ']()'); }, false);
    document.querySelector('#toolbox .pre').addEventListener('click', function () {addTag('    ', ''); }, false);
    document.getElementById('previewSwitch').addEventListener('change', function () {content.parentNode.classList.toggle('hidden'); preview.classList.toggle('hidden'); preview.innerHTML = marked(content.value); }, false);

    document.body.classList.remove('notStarted');

  }

  //window.addEventListener("DOMContentLoaded", init, false);
  window.addEventListener("load", onResize, false);
  window.addEventListener("load", init, false);
  window.addEventListener("onresize", onResize, false);
  window.matchMedia("(orientation: portrait)").addListener(onResize);
})();
