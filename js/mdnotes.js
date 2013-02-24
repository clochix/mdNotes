/*jshint browser: true, esnext: true, devel: true, unused: false */
/*global utils: true, marked: true */
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
              db.createObjectStore(storeName, {keyPath: "id"});
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

        db.createObjectStore(storeName, {keyPath: "id"});
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
        content = document.getElementById('content'),
        preview = document.getElementById('preview'),
        currentKey
        ;

    /**
     * Load notes
     *
     * @param {Fucntion} [cb]
     */
    function getNotes(cb) {
      var notes = document.getElementById("notes"),
          li, deleteButton;

      notes.innerHTML = "";
      db.read(function (res) {
        if (res.length === 0) {
          notes.textContent = "Aucune note, cliquez sur '+' pour créer la première";
        } else {
          res.forEach(function (item) {
            var title;
            if (!item.title) {
              item.title = 'Untitled';
            }
            li = document.querySelector('[data-template-id=list-item]').cloneNode(true);
            title = li.querySelector('[data-template-id=list-item-title]');
            title.textContent = item.title;
            title.setAttribute('href', '#' + item.id);
            li.dataset.key = item.id;
            li.querySelector('[data-template-id=list-item-meta]').textContent = utils.format("Créée le %s, mise à jour le %s", new Date(parseInt(item.created, 10)).toISOString().substr(0, 19), new Date(parseInt(item.updated, 10)).toISOString().substr(0, 19));
            notes.appendChild(li);
          });
        }
        if (cb) {
          cb();
        }
      });
    }

    /**
     * Save current note
     */
    function saveNote() {
      /*jshint regexp: false */
      var title = /^#.*/m.exec(content.value) || /^.*/m.exec(content.value);
      title = title[0].replace(/^#\s*/, '');
      db.set({
        id: form.dataset.key,
        title: title,
        content: content.value,
        created: form.dataset.created,
        updated: Date.now()
      }, function onSaved() {
        content.classList.add('saved');
        window.setTimeout(function () {
          content.classList.remove('saved');
        }, 500);
        getNotes();
      });
    }

    /**
     * Insert tags at cursor or around selection
     * @param {String} start string to insert before selection
     * @param {String} [end] string to insert after selection
     *
     */
    function addTag(start, end) {
      end = end || '';
      var val = content.value;
      content.value = val.slice(0, content.selectionStart) + start + val.slice(content.selectionStart, content.selectionEnd) + end + val.slice(content.selectionEnd);
    }

    /**
     * display content
     */
    function initContent(val) {
      val = val || '';
      content.parentNode.classList.remove('hidden');
      if (utils.device.type !== 'desktop') {
        preview.classList.add('hidden');
      }
      document.getElementById('previewSwitch').checked = false;
      content.style.minHeight = (window.innerHeight - content.getBoundingClientRect().top - 10) + 'px';
      content.value     = val;
      preview.innerHTML = val.length === 0 ? '' : marked(val);
    }

    // Init DB
    db = new DB('notes', 'note', 6);
    db.init(getNotes);

    // Add event listeners {
    // Display note
    document.getElementById("notes").addEventListener('click', function (ev) {
      var current = ev.target;
      while (typeof current.dataset !== 'undefined' && typeof current.dataset.key === 'undefined' && typeof current.parentNode !== 'undefined') {
        current = current.parentNode;
      }
      if (current && typeof current.dataset !== 'undefined' && typeof current.dataset.key !== 'undefined') {
        currentKey = current.dataset.key;
        if (ev.target.classList.contains('close')) {
          setActivePanel('confirm');

        } else {
          db.read(currentKey, function onRead(res) {
            form.dataset.key  = res.id;
            form.dataset.created  = res.created;
            initContent(res.content);
          });
          setActivePanel('detail');
          content.focus();
        }
      }
    }, false);
    // Add note
    document.getElementById("add").addEventListener('click', function () {
      form.dataset.key      = utils.uuid();
      form.dataset.created  = Date.now();
      initContent('# titre');
      setActivePanel('detail');
      // Select title {
      content.focus();
      var s = window.getSelection(), i, range;
      if (s.rangeCount > 0) {
        if (typeof s.empty === 'function') {
          s.empty();
        } else if (typeof s.removeRange === 'function') {
          for (i = 0; i < s.rangeCount; i++) {
            s.removeRange(s.getRangeAt(i));
          }
        }
      }
      content.select();
      range = document.createRange();
      range.selectNodeContents(content);
      range.setStart(content.nextSibling, 2);
      range.setEnd(content.nextSibling, content.value.length);
      s.addRange(range);
      // }
    }, false);
    // Save note
    document.getElementById("save").addEventListener('click', saveNote, false);
    // Edit form {
    content.addEventListener('focus', function () {
      iSave = window.setInterval(saveNote, 60000);
      content.classList.add('active');
    }, false);
    content.addEventListener('blur', function () {
      if (iSave) {
        window.clearInterval(iSave);
      }
      content.classList.remove('active');
      saveNote();
      preview.innerHTML = marked(content.value);
    }, false);
    document.getElementById('back').addEventListener('click', function () {setActivePanel('list'); }, false);
    document.getElementById('close').addEventListener('click', function () {}, false);
    Array.prototype.forEach.call(document.querySelectorAll('#toolbox .tag'), function (button) {
      button.addEventListener('click', function () {addTag(button.dataset.start, button.dataset.end); }, false);
    });
    document.getElementById('previewSwitch').addEventListener('change', function () {
      if (utils.device.type !== 'desktop') {
        content.parentNode.classList.toggle('hidden');
        preview.classList.toggle('hidden');
      }
      preview.innerHTML = marked(content.value);
    }, false);
    // }
    // Confirm dialog
    document.getElementById('deleteConfirm').addEventListener('click', function () {
      db.remove(currentKey, function () {
        getNotes(function () {
          setActivePanel('list');
        });
      });
    }, false);
    document.getElementById('deleteCancel').addEventListener('click', function () {
      setActivePanel('list');
    }, false);
    document.querySelector('#detail .fullscreen').addEventListener('click', function () {
      content.classList.toggle('active');
    });

    document.body.classList.remove('notStarted');

    // }

    // Keyboard navigation
    content.addEventListener('keydown', function (e) {
      // ESC to cancel edit mode
      if (e.target === content && e.charCode === 0 && e.keyCode === 27) {
        content.classList.remove('active');
      }
    });
  }

  //window.addEventListener("DOMContentLoaded", init, false);
  window.addEventListener("load", onResize, false);
  window.addEventListener("load", init, false);
  window.addEventListener("onresize", onResize, false);
  window.matchMedia("(orientation: portrait)").addListener(onResize);
})();
