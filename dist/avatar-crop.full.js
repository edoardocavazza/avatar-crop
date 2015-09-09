(function() {

  var myRequestAnimFrame = (function() {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function(callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  })();

  function clone(obj) {
    var res = {};
    for (var k in obj) res[k] = obj[k];
    return res;
  }

  function bind(elem, evt, fn) {
    elem.addEventListener(evt, fn, false);
  }

  function unbind(elem, evt) {
    elem.removeEventListener(evt);
  }

  function createBoard() {
    var c = document.createElement('canvas');
    c.style.border = 'solid 1px #DDD';
    c.style.backgroundColor = '#FFF';
    c.style.backgroundImage = 'url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzIgMzIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxyZWN0IGZpbGw9IiNDQ0NDQ0MiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIvPjxyZWN0IHg9IjE2IiB5PSIxNiIgZmlsbD0iI0NDQ0NDQyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+PC9zdmc+")';
    c.style.userSelect = 'none';
    c.style.webkitUserSelect = 'none';
    return c;
  }

  var defaults = {
    interactive: true,
    droppable: true,
    selectable: true,
    width: null,
    height: null,
    message: 'Drop an image or click to select one.',
    minZoom: 1,
    maxZoom: Infinity
  }

  function AvatarCropFilter(name, fn, defaults) {
    this.name = name;
    this.fn = fn;
    this.configs = defaults || {};
  }

  AvatarCropFilter.prototype.exec = function(self, data, canvas) {
    return this.fn.call(this, self, data, canvas);
  }

  AvatarCropFilter.prototype.config = function(data) {
    for (var k in data) {
      this.configs[k] = data[k];
    }
  }

  function AvatarCrop(el, options) {
    if (!el) {
      throw 'Missing element.';
    }
    var self = this;
    this.canvas = createBoard();
    this._callbacks = {};
    this.filters = [];
    this.config(options);
    el.appendChild(this.canvas);
    this.clear();
  }

  var proto = AvatarCrop.prototype;

  AvatarCrop.DEFAULT_WIDTH = 256;
  AvatarCrop.DEFAULT_HEIGHT = 256;
  AvatarCrop.DEFAULT_WHEEL_FACTOR = 100;
  AvatarCrop.DEFAULT_ANIM_DURATE = 250;
  AvatarCrop.DEFAULT_MODE = 'fit';
  AvatarCrop.filters = {};
  AvatarCrop.Filter = AvatarCropFilter;

  AvatarCrop.registerFilter = function(name, fn, config) {
    AvatarCrop.filters[name] = {
      fn: fn,
      defaults: config
    }
  }

  proto.config = function(options) {
    var old = clone(this.options || {});
    var opt = this.options || clone(defaults);
    if (options) {
      for (var k in options) {
        if (typeof opt[k] !== 'undefined') {
          opt[k] = options[k];
        }
      }
    }
    if (this.canvas) {
      this.canvas.width = opt.width || AvatarCrop.DEFAULT_WIDTH;
      this.canvas.height = opt.height || AvatarCrop.DEFAULT_HEIGHT;
      if (opt.interactive && !old.interactive) {
        this.bindInteractive();
      } else if (old.interactive) {
        this.unbindInteractive();
      }
      if (opt.droppable && !old.droppable) {
        this.bindDroppable();
      } else if (old.droppable) {
        this.unbindDroppable();
      }
      if (opt.selectable && !old.selectable) {
        this.bindSelectable();
      } else if (old.selectable) {
        this.unbindSelectable();
      }
    }
    this.options = opt;
  }

  proto.addEventListener = function(name, fn) {
    this._callbacks[name] = this._callbacks[name] || [];
    this._callbacks[name].push(fn);
  }

  proto.fire = function(evt) {
    var clbs = this._callbacks[evt] || [];
    for (var i = 0, len = clbs.length; i < len; i++) {
      clbs[i].apply(this);
    }
  }

  proto.bindInteractive = function() {
    var self = this,
        canvas = this.canvas,
        ctx = canvas.getContext('2d'),
        canMouseX = 0,
        canMouseY = 0,
        wheel = 0,
        isDragging = false;

    function handleMouseDown(e) {
      if (self.data) {
        canMouseX = e.clientX + self._offsetX;
        canMouseY = e.clientY + self._offsetY;
        isDragging = true;
      }
    }

    function handleMouseUp(e) {
      isDragging = false;
    }

    function handleMouseMove(e) {
      if (isDragging) {
        self.move(e.clientX - canMouseX, e.clientY - canMouseY, 1);
      }
    }

    function handleMouseWheel(e) {
      if (self.data) {
        if (isDragging) return true;
        e.stopPropagation();
        e.preventDefault();
        var delta = -(e.detail ? e.detail * (-120) : e.wheelDelta) / AvatarCrop.DEFAULT_WHEEL_FACTOR;
        self.zoom(self._zoom + delta, 1);
        wheel = delta;
        return false;
      }
    }

    function handleDblClick(e) {
      if (self.data) {
        e.stopPropagation();
        e.preventDefault();
        if (self._zoom == 1) {
          if (self._offsetX == 0 && self._offsetY == 0) {
            self.fill();
          } else {
            self.center();
          }
        } else {
          self.fit();
        }
        return false;
      }
    }

    bind(canvas, 'mousedown', handleMouseDown);
    bind(canvas, 'mousemove', handleMouseMove);
    bind(canvas, 'mouseup', handleMouseUp);
    bind(canvas, 'mouseout', handleMouseUp);
    bind(canvas, 'dblclick', handleDblClick);
    bind(canvas, 'mousewheel', handleMouseWheel);
    bind(canvas, 'DOMMouseScroll', handleMouseWheel);
  }

  proto.unbindInteractive = function() {
    var canvas = this.canvas;
    unbind(canvas, 'mousedown');
    unbind(canvas, 'mousemove');
    unbind(canvas, 'mouseup');
    unbind(canvas, 'mouseout');
    unbind(canvas, 'dblclick');
    unbind(canvas, 'mousewheel');
    unbind(canvas, 'DOMMouseScroll');
  }

  proto.bindDroppable = function() {
    var self = this,
        canvas = this.canvas;
    if (typeof FileReader !== 'undefined') {
      bind(canvas, 'drop', function(e) {
        e.preventDefault();
        var files = e.dataTransfer.files;
        if (files.length > 0) {
          self.handleFile(files[0]);
        }
      });

      bind(canvas, 'dragover', function(e) {
        e.preventDefault();
      });
    }
  }

  proto.unbindDroppable = function() {
    var canvas = this.canvas;
    unbind(canvas, 'dragover');
    unbind(canvas, 'drop');
  }

  proto.bindSelectable = function () {
    var self = this,
        canvas = this.canvas;
    bind(canvas, 'click', function(e) {
      if (!self.data) {
        var input = document.createElement('input');
        input.type = 'file';
        input.style.visibility = 'hidden';
        document.body.appendChild(input);
        var ev = document.createEvent('MouseEvents');
        ev.initEvent('click', true, true);
        ev.synthetic = true;

        bind(input, 'change', function(fileEv) {
          if (this.files && this.files[0]) {
            self.handleFile(this.files[0]);
          }
          if (input.parentNode) {
            document.body.removeChild(input);
          }
        });
        setTimeout(function() {
          if (input.parentNode) {
            document.body.removeChild(input);
          }
        }, 20 * 1000);

        input.dispatchEvent(ev, true);
      }
    });
  }

  proto.unbindSelectable = function() {
    unbind(this.canvas, 'click');
  }

  proto.setLoadState = function(load) {
    var self = this,
      start = Date.now(),
      lines = 16,
      canvas = this.canvas,
      cW = canvas.width,
      cH = canvas.height,
      context = canvas.getContext('2d');
    if (load) {

      self._loading = true;
      canvas.style.cursor = 'progress';
      var draw = function() {
        myRequestAnimFrame(function() {
          var rotation = parseInt(((new Date() - start) / 1000) * lines) / lines;
          context.save();
          context.clearRect(0, 0, cW, cH);
          context.translate(cW / 2, cH / 2);
          context.rotate(Math.PI * 2 * rotation);
          for (var i = 0; i < lines; i++) {
            context.beginPath();
            context.rotate(Math.PI * 2 / lines);
            context.moveTo(cW / 10, 0);
            context.lineTo(cW / 4, 0);
            context.lineWidth = cW / 30;
            context.strokeStyle = "rgba(0, 0, 0," + i / lines + ")";
            context.stroke();
          }
          context.restore();
          if (self._loading) {
            draw();
          }
        });
      }
      draw();
    } else {
      context.clearRect(0, 0, cW, cH);
      canvas.style.cursor = 'default';
      delete this._loading;
    }
  }

  proto.handleFile = function(file) {
    if (file.type.indexOf('image') !== -1) {
      var self = this,
        reader = new FileReader();
      self.setLoadState(true);
      self.canvas.style.cursor = 'progress';
      reader.onload = function(e) {
        self.setLoadState(false);
        self.setSource(e.target.result);
      };
      reader.onerror = function() {
        self.setLoadState(false);
      }
      reader.readAsDataURL(file);
    }
  }

  proto.setSource = function(data) {
    var self = this,
      canvas = this.canvas,
      image = new Image();

    self.setLoadState(true);
    image.addEventListener('load', function() {
      self.fire('load');
      self.setLoadState(false);
      self.data = image;
      self.reset();
      if (self.options.interactive) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    });
    img.addEventListener('error', function() {
      self.setLoadState(false);
    });
    image.src = data;
  }

  proto.fit = function(durate) {
    return this.moveAndZoom(0, 0, 1, durate || AvatarCrop.DEFAULT_ANIM_DURATE);
  }

  proto.fill = function(durate) {
    if (this.data) {
      var image = this.data,
        imageW = image.width,
        imageH = image.height;
      if (imageH > imageW) {
        this.moveAndZoom(0, 0, imageH / imageW, durate || AvatarCrop.DEFAULT_ANIM_DURATE);
      } else {
        this.moveAndZoom(0, 0, imageW / imageH, durate || AvatarCrop.DEFAULT_ANIM_DURATE);
      }
    }
    return this;
  }

  proto.move = function(x, y, durate) {
    return this.moveAndZoom(x, y, this._zoom, durate);
  }

  proto.zoom = function(zoom, durate) {
    var x = (-this._offsetX / this._zoom) * zoom,
      y = (-this._offsetY / this._zoom) * zoom;
    return this.moveAndZoom(x, y, zoom, durate);
  }

  proto.moveAndZoom = function(x, y, zoom, durate) {
    if (this.data) {
      durate = durate || 0;
      x = -x;
      y = -y;
      var self = this,
        options = this.options,
        start = Date.now(),
        end = start + durate,
        startZoom = this._zoom,
        startX = this._offsetX,
        startY = this._offsetY,
        rangeZoom = zoom - startZoom,
        rangeX = x - startX,
        rangeY = y - startY;

      zoom = Math.min(Math.max(zoom, options.minZoom), options.maxZoom);

      function setVals(xTmp, yTmp, zoomTmp) {
        self._offsetX = xTmp;
        self._offsetY = yTmp;
        self._zoom = zoomTmp;
        if (durate) {
            self.render();
        }
      }

      if (durate && durate !== 1) {
        var animate = function() {
          myRequestAnimFrame(function() {
            var time = Date.now(),
              frame = Math.min(time - start, durate) / durate,
              fracZoom = rangeZoom * frame,
              zoomTmp = startZoom + fracZoom,
              fracX = rangeX * frame,
              xTmp = startX + fracX,
              fracY = rangeY * frame,
              yTmp = startY + fracY;

            setVals(xTmp, yTmp, zoomTmp);
            if (time < end) animate();
          }, 10);
        }
        animate();
      } else {
        setVals(x, y, zoom);
      }
    }
    return this;
  }

  proto.reset = function(durate) {
    if (typeof this[AvatarCrop.DEFAULT_MODE] == 'function') {
      this[AvatarCrop.DEFAULT_MODE].call(this, durate);
    }
    return this;
  }

  proto.center = function(durate) {
    return this.moveAndZoom(0, 0, this._zoom, durate || AvatarCrop.DEFAULT_ANIM_DURATE);
  }

  proto.clear = function() {
    this.filters = [];
    this._offsetX = 0;
    this._offsetY = 0;
    this._zoom = 1;
    this.data = null;
    var canvas = this.canvas,
        ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillText(this.options.message, canvas.width / 2, canvas.height / 2);
    if (this.options.selectable) {
      canvas.style.cursor = 'pointer';
    }
    this.fire('clear');
  }

  proto.render = function() {
    if (this.data) {
      var self = this,
        image = this.data,
        zoom = this._zoom,
        canvas = this.canvas,
        ctx = canvas.getContext('2d'),
        imageW = image.width,
        imageH = image.height,
        rap = imageW / imageH,
        filters = this.filters;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (rap < 1) {
        var w = canvas.height * rap;
        ctx.drawImage(image, 0, 0, imageW, imageH, (canvas.width - w * zoom) / 2 - this._offsetX, (canvas.height - canvas.height * zoom) / 2 - this._offsetY, w * zoom, canvas.height * zoom);
      } else {
        var h = canvas.width / rap;
        ctx.drawImage(image, 0, 0, imageW, imageH, (canvas.width - canvas.width * zoom) / 2 - this._offsetX, (canvas.height - h * zoom) / 2 - this._offsetY, canvas.width * zoom, h * zoom);
      }

      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (var i = 0, len = filters.length; i < len; i++) {
        imageData = filters[i].exec(this, imageData, canvas);
      }
      ctx.putImageData(imageData, 0, 0);
      clearTimeout(self.fireTimeout);
      self.fireTimeout = setTimeout(function() {
        self.fire('change');
        delete self.fireTimeout;
      }, 250);
    }
  }

  proto.save = function() {
    if (this.data) {
      return this.canvas.toDataURL();
    }
  }

  proto.hasFilter = function(name) {
    var filters = this.filters;
    for (var i = 0, len = filters.length; i < len; i++) {
      if (filters[i].name == name) {
        return true;
      }
    }
    return false;
  }

  proto.addFilter = function(name, fn) {
    if (this.hasFilter(name)) {
      return this;
    }
    if (typeof fn == 'function') {
      this.filters.push(new AvatarCrop.Filter(name, fn));
    } else if (AvatarCrop.filters[name]) {
      var filterDef = AvatarCrop.filters[name],
        filter = new AvatarCrop.Filter(name, filterDef.fn, filterDef.defaults);
      if (fn) {
        filter.config(fn);
      }
      this.filters.push(filter);
    }
    return this;
  }

  proto.removeFilter = function(name) {
    var filters = this.filters;
    for (var i = 0, len = filters.length; i < filters.length; i++) {
      if (filters[i].name == name) {
        this.filters.splice(i, 1);
        return this;
      }
    }
    return this;
  }

  proto.removeAllFilters = function() {
    this.filters = [];
    return this;
  }

  proto.updateFilter = function(name, options) {
    var filters = this.filters;
    for (var i = 0, len = filters.length; i < filters.length; i++) {
      if (filters[i].name == name) {
        filters[i].config(options);
        return this;
      }
    }
  }

  if (typeof module != 'undefined') {
    module.exports = AvatarCrop;
  } else if (typeof define == 'function' && typeof define.amd == 'object') {
    define(function() {
      return {
        'AvatarCrop': AvatarCrop
      }
    });
  } else {
    window.AvatarCrop = AvatarCrop;
  }

})(window);

(function () {

	AvatarCrop.execFilter = function(imageData, canvas, effects) {
		var outerRadius, gradient,
			ctx = canvas.getContext('2d'),
			width = canvas.width,
			height = canvas.height;

		// get gradient radius if vignette or lighten center are used
		if (!!effects.vignette || !!effects.lighten) {
			outerRadius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
		}

		if (!!effects.lighten) {
			ctx.globalCompositeOperation = 'lighter';
			gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, outerRadius);
			gradient.addColorStop(0, ['rgba(255,255,255,', effects.lighten, ')'].join(''));
			gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
			gradient.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);
		}

		// temporary var for faster looping
		var
			idx,
			j, // for check value loop
			r, g, b, // for sepia
			average,
			sepiatone,
			noise,
			_imageData = imageData.data,
			viewFinderImageData,
			contrastFactor;

		if (!!effects.contrast) {
			contrastFactor = (259 * (effects.contrast + 255)) / (255 * (259 - effects.contrast));
		}

		if (!!effects.viewFinder) {
			viewFinderImageData = window.vjsImageCache[[width, height, effects.viewFinder].join('-')];
		}

		// loop backwards so the length has to be evaluated only once; --i is faster than ++i, i-- or i++
		for (var i = (width * height); i >= 0; --i) {
			// idx = i * 4;
			// bitshift operartions are faster
			idx = i << 2;

			// curves
			if (!!effects.curves) {
				_imageData[idx] = effects.curves.r[_imageData[idx]];
				_imageData[idx + 1] = effects.curves.g[_imageData[idx + 1]];
				_imageData[idx + 2] = effects.curves.b[_imageData[idx + 2]];
			}

			// contrast
			if (!!effects.contrast) {
				_imageData[idx] = contrastFactor * (_imageData[idx] - 128) + 128;
				_imageData[idx + 1] = contrastFactor * (_imageData[idx + 1] - 128) + 128;
				_imageData[idx + 2] = contrastFactor * (_imageData[idx + 2] - 128) + 128;
			}

			// brightness
			if (!!effects.brightness) {
				_imageData[idx] += effects.brightness;
				_imageData[idx + 1] += effects.brightness;
				_imageData[idx + 2] += effects.brightness;
			}

			// screen
			if (!!effects.screen) {
				_imageData[idx] = 255 - ((255 - _imageData[idx]) * (255 - effects.screen.r * effects.screen.a) / 255);
				_imageData[idx + 1] = 255 - ((255 - _imageData[idx + 1]) * (255 - effects.screen.g * effects.screen.a) / 255);
				_imageData[idx + 2] = 255 - ((255 - _imageData[idx + 2]) * (255 - effects.screen.b * effects.screen.a) / 255);
			}

			// noise
			if (!!effects.noise) {
				noise = effects.noise - Math.random() * effects.noise / 2;
				_imageData[idx] += noise;
				_imageData[idx + 1] += noise;
				_imageData[idx + 2] += noise;
			}

			// view finder
			if (!!effects.viewFinder) {
				_imageData[idx] = _imageData[idx] * viewFinderImageData[idx] / 255;
				_imageData[idx + 1] = _imageData[idx + 1] * viewFinderImageData[idx + 1] / 255;
				_imageData[idx + 2] = _imageData[idx + 2] * viewFinderImageData[idx + 2] / 255;
			}

			// sepia
			if (!!effects.sepia) {
				r = _imageData[idx];
				g = _imageData[idx + 1];
				b = _imageData[idx + 2];
				_imageData[idx] = r * 0.393 + g * 0.769 + b * 0.189;
				_imageData[idx + 1] = r * 0.349 + g * 0.686 + b * 0.168;
				_imageData[idx + 2] = r * 0.272 + g * 0.534 + b * 0.131;
			}

			// desaturate
			if (!!effects.desaturate) {
				average = (_imageData[idx] + _imageData[idx + 1] + _imageData[idx + 2]) / 3;
				_imageData[idx] += ((average - _imageData[idx]) * effects.desaturate);
				_imageData[idx + 1] += ((average - _imageData[idx + 1]) * effects.desaturate);
				_imageData[idx + 2] += ((average - _imageData[idx + 2]) * effects.desaturate);
			}

			// check value range 0-255 and parse to int
			// http://jsperf.com/min-max-vs-if-else
			// http://jsperf.com/parseint-vs-double-bitwise-not2
			for (j = 2; j >= 0; --j) {
				_imageData[idx + j] = ~~(_imageData[idx + j] > 255 ? 255 : _imageData[idx + j] < 0 ? 0 : _imageData[idx + j]);
			}
		}

		// write image data, finalize vintageJS
		return imageData;
	}

})(window);

(function () {
	AvatarCrop.registerFilter('1977', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			curves: {'a':[0,1,3,4,6,7,9,10,12,13,14,16,17,19,20,22,23,25,26,28,29,31,32,34,35,37,38,39,41,42,44,45,46,48,49,50,52,53,54,55,57,58,59,60,61,62,64,65,66,67,68,69,70,72,73,74,75,76,77,78,79,80,81,82,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,125,126,127,128,129,130,131,132,133,134,135,136,137,137,138,139,140,141,142,143,144,145,146,146,147,148,149,150,151,152,153,153,154,155,156,157,158,159,160,160,161,162,163,164,165,166,166,167,168,169,170,171,172,172,173,174,175,176,177,178,178,179,180,181,182,183,183,184,185,186,187,188,188,189,190,191,192,193,193,194,195,196,197,198,199,199,200,201,202,203,204,204,205,206,207,208,209,209,210,211,212,213,214,215,215,216,217,218,219,220,221,221,222,223,224,225,226,227,227,228,229,230,231,232,233,233,234,235,236,237,238,239,240,241,241,242,243,244,245,246,247,248,249,250,250,251,252,253,254,255,255], 'r':[58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,58,59,60,60,61,62,62,63,63,64,64,65,66,66,67,67,68,69,69,70,70,71,72,72,73,74,74,75,76,77,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,95,96,97,98,99,100,102,103,104,105,106,108,109,110,111,112,113,114,116,117,118,119,120,121,122,123,125,126,127,128,129,130,131,133,134,135,136,137,138,140,141,142,143,144,146,147,148,149,151,152,153,154,156,157,158,160,161,162,164,165,166,168,169,170,172,173,175,176,177,179,180,182,183,185,186,188,189,191,192,193,194,196,197,198,199,200,201,202,203,204,204,205,206,206,207,208,208,209,209,210,210,211,211,212,212,212,213,213,213,213,213,214,214,214,214,214,214,214,214,214,214,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,215,214,214,214,214,214,214,214,214,214,214,213,213,213,213,213,213,213,212,212,212,212,212], 'g':[40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,41,41,42,42,42,42,43,43,43,43,44,44,44,44,45,45,45,45,46,46,46,47,47,48,48,48,49,49,50,50,51,52,52,53,54,54,55,56,57,58,59,60,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,153,154,155,156,157,158,160,161,162,163,164,166,167,168,169,171,172,173,174,175,176,178,179,180,181,182,183,185,186,187,188,189,190,191,192,193,195,196,197,198,199,200,201,202,203,205,206,207,208,209,210,211,212,214,215,216,217,218,220,221,222,223,225,226,227,228,230,231,232,233,235,236,237,239,240,241,242,244,245,246,247,249,250,251,252,254,255,255], 'b':[45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,46,46,47,47,47,48,48,48,48,49,49,49,50,50,50,51,51,51,52,52,53,53,54,54,55,56,56,57,58,59,60,61,62,62,63,64,65,66,68,69,70,71,72,73,74,75,76,77,79,80,81,82,83,84,85,86,87,89,90,91,92,93,94,96,97,98,99,100,102,103,104,105,107,108,109,110,112,113,114,115,117,118,119,120,122,123,124,126,127,128,130,131,133,134,135,137,138,140,141,143,144,145,147,148,149,151,152,153,155,156,157,159,160,161,162,164,165,166,167,168,170,171,172,173,174,175,176,177,178,179,180,181,182,184,185,186,187,188,188,189,190,191,192,193,193,194,195,195,196,196,196,197,197,197,197,198,198,198,198,198,198,198,198,198,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,199,198,198,198,198,198,198,197,197,197,197,197,197,197,197,197,197,197,197,197,197,198,198,198,198,198,198,198]}
		});
	});
})();

(function() {

	var mul_table = [
		512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
		454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
		482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
		437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
		497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
		320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
		446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
		329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
		505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
		399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
		324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
		268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
		451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
		385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
		332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
		289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259
	];


	var shg_table = [
		9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
		17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
		19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
		20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
		21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
		21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
		22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
		22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24
	];

	function BlurStack() {
		this.r = 0;
		this.g = 0;
		this.b = 0;
		this.a = 0;
		this.next = null;
	}

	function stackBlurCanvasRGBA(imageData, top_x, top_y, width, height, radius) {
		if (isNaN(radius) || radius < 1) return;
		radius |= 0;

		var pixels = imageData.data;
		var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum,
			r_out_sum, g_out_sum, b_out_sum, a_out_sum,
			r_in_sum, g_in_sum, b_in_sum, a_in_sum,
			pr, pg, pb, pa, rbs;

		var div = radius + radius + 1;
		var w4 = width << 2;
		var widthMinus1 = width - 1;
		var heightMinus1 = height - 1;
		var radiusPlus1 = radius + 1;
		var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

		var stackStart = new BlurStack();
		var stack = stackStart;
		for (i = 1; i < div; i++) {
			stack = stack.next = new BlurStack();
			if (i == radiusPlus1) var stackEnd = stack;
		}
		stack.next = stackStart;
		var stackIn = null;
		var stackOut = null;

		yw = yi = 0;

		var mul_sum = mul_table[radius];
		var shg_sum = shg_table[radius];

		for (y = 0; y < height; y++) {
			r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;

			r_out_sum = radiusPlus1 * (pr = pixels[yi]);
			g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
			b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
			a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

			r_sum += sumFactor * pr;
			g_sum += sumFactor * pg;
			b_sum += sumFactor * pb;
			a_sum += sumFactor * pa;

			stack = stackStart;

			for (i = 0; i < radiusPlus1; i++) {
				stack.r = pr;
				stack.g = pg;
				stack.b = pb;
				stack.a = pa;
				stack = stack.next;
			}

			for (i = 1; i < radiusPlus1; i++) {
				p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
				r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
				g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
				b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;
				a_sum += (stack.a = (pa = pixels[p + 3])) * rbs;

				r_in_sum += pr;
				g_in_sum += pg;
				b_in_sum += pb;
				a_in_sum += pa;

				stack = stack.next;
			}


			stackIn = stackStart;
			stackOut = stackEnd;
			for (x = 0; x < width; x++) {
				pixels[yi + 3] = pa = (a_sum * mul_sum) >> shg_sum;
				if (pa != 0) {
					pa = 255 / pa;
					pixels[yi] = ((r_sum * mul_sum) >> shg_sum) * pa;
					pixels[yi + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
					pixels[yi + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
				} else {
					pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
				}

				r_sum -= r_out_sum;
				g_sum -= g_out_sum;
				b_sum -= b_out_sum;
				a_sum -= a_out_sum;

				r_out_sum -= stackIn.r;
				g_out_sum -= stackIn.g;
				b_out_sum -= stackIn.b;
				a_out_sum -= stackIn.a;

				p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

				r_in_sum += (stackIn.r = pixels[p]);
				g_in_sum += (stackIn.g = pixels[p + 1]);
				b_in_sum += (stackIn.b = pixels[p + 2]);
				a_in_sum += (stackIn.a = pixels[p + 3]);

				r_sum += r_in_sum;
				g_sum += g_in_sum;
				b_sum += b_in_sum;
				a_sum += a_in_sum;

				stackIn = stackIn.next;

				r_out_sum += (pr = stackOut.r);
				g_out_sum += (pg = stackOut.g);
				b_out_sum += (pb = stackOut.b);
				a_out_sum += (pa = stackOut.a);

				r_in_sum -= pr;
				g_in_sum -= pg;
				b_in_sum -= pb;
				a_in_sum -= pa;

				stackOut = stackOut.next;

				yi += 4;
			}
			yw += width;
		}


		for (x = 0; x < width; x++) {
			g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;

			yi = x << 2;
			r_out_sum = radiusPlus1 * (pr = pixels[yi]);
			g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
			b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
			a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

			r_sum += sumFactor * pr;
			g_sum += sumFactor * pg;
			b_sum += sumFactor * pb;
			a_sum += sumFactor * pa;

			stack = stackStart;

			for (i = 0; i < radiusPlus1; i++) {
				stack.r = pr;
				stack.g = pg;
				stack.b = pb;
				stack.a = pa;
				stack = stack.next;
			}

			yp = width;

			for (i = 1; i <= radius; i++) {
				yi = (yp + x) << 2;

				r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
				g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
				b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;
				a_sum += (stack.a = (pa = pixels[yi + 3])) * rbs;

				r_in_sum += pr;
				g_in_sum += pg;
				b_in_sum += pb;
				a_in_sum += pa;

				stack = stack.next;

				if (i < heightMinus1) {
					yp += width;
				}
			}

			yi = x;
			stackIn = stackStart;
			stackOut = stackEnd;
			for (y = 0; y < height; y++) {
				p = yi << 2;
				pixels[p + 3] = pa = (a_sum * mul_sum) >> shg_sum;
				if (pa > 0) {
					pa = 255 / pa;
					pixels[p] = ((r_sum * mul_sum) >> shg_sum) * pa;
					pixels[p + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
					pixels[p + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
				} else {
					pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
				}

				r_sum -= r_out_sum;
				g_sum -= g_out_sum;
				b_sum -= b_out_sum;
				a_sum -= a_out_sum;

				r_out_sum -= stackIn.r;
				g_out_sum -= stackIn.g;
				b_out_sum -= stackIn.b;
				a_out_sum -= stackIn.a;

				p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

				r_sum += (r_in_sum += (stackIn.r = pixels[p]));
				g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
				b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));
				a_sum += (a_in_sum += (stackIn.a = pixels[p + 3]));

				stackIn = stackIn.next;

				r_out_sum += (pr = stackOut.r);
				g_out_sum += (pg = stackOut.g);
				b_out_sum += (pb = stackOut.b);
				a_out_sum += (pa = stackOut.a);

				r_in_sum -= pr;
				g_in_sum -= pg;
				b_in_sum -= pb;
				a_in_sum -= pa;

				stackOut = stackOut.next;

				yi += width;
			}
		}

		return imageData;
	}

	AvatarCrop.registerFilter('blur', function(self, imageData, canvas) {
		var context = canvas.getContext('2d');
		return stackBlurCanvasRGBA(imageData, 0, 0, canvas.width, canvas.height, this.configs.radius);
	}, {
		radius: 5
	});
})();

(function () {
	AvatarCrop.registerFilter('brannan', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[50,50,50,50,50,50,50,50,50,50,50,50,50,51,51,51,51,51,52,53,54,55,56,57,59,60,62,63,64,66,67,68,69,70,71,71,72,73,73,74,75,75,76,76,77,77,78,78,79,79,80,80,81,81,82,83,83,84,85,86,87,88,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,111,112,113,114,115,116,118,119,120,121,122,124,125,126,128,129,130,132,133,134,136,137,139,140,141,143,144,146,147,149,150,152,153,154,156,157,159,160,162,163,164,166,167,169,170,171,173,174,175,177,178,179,181,182,183,185,186,187,189,190,192,193,195,196,198,199,201,203,204,206,207,209,210,212,213,215,216,217,219,220,221,223,224,225,226,227,228,229,230,231,232,233,234,235,236,236,237,238,239,239,240,241,241,242,243,243,244,244,245,246,246,247,247,248,248,249,249,249,250,250,251,251,251,252,252,252,253,253,253,254,254,254,254,254,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,254,254,254,254], 'g':[0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,3,4,4,5,6,7,8,10,11,12,13,14,16,17,18,19,20,21,23,24,25,26,27,28,29,30,32,33,34,35,36,38,39,40,41,43,44,45,47,48,50,51,53,54,56,57,59,61,62,64,66,68,70,72,74,76,78,80,82,84,87,89,91,93,95,97,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160,161,163,165,167,168,170,172,173,175,176,178,179,181,182,183,184,186,187,188,189,190,191,192,193,193,194,195,196,196,197,198,198,199,200,200,201,202,202,203,203,204,204,205,205,206,207,207,208,208,209,210,210,211,212,212,213,214,214,215,216,217,217,218,219,219,220,221,221,222,222,223,224,224,225,225,226,226,227,228,228,229,229,229,230,230,231,231,232,232,233,233,233,234,234,234,235,235,236,236,236,237,237,237,238,238,239,239,239,240,240,240,241,241,241,242,242,242,243,243,243,244,244,244,245,245,245,246,246,247,247,247,248,248,249,249,250,250,251,251,252,252,252], 'b':[48,48,48,48,48,48,48,48,49,49,49,49,49,49,49,50,50,50,51,51,51,52,52,53,53,54,54,54,55,55,56,56,57,57,58,58,59,60,60,61,61,62,62,63,64,64,65,66,66,67,68,68,69,70,71,71,72,73,74,75,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,92,93,94,95,96,98,99,100,101,102,103,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,132,133,134,135,136,137,138,139,140,141,141,142,143,144,145,146,146,147,148,148,149,150,151,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,168,169,170,171,172,173,174,175,176,177,178,178,179,180,181,181,182,183,183,184,184,185,185,185,186,186,187,187,187,188,188,188,189,189,190,190,191,191,192,193,193,194,195,195,196,197,198,199,200,200,201,202,203,204,205,206,206,207,208,209,210,211,211,212,213,214,214,215,216,216,217,218,218,219,219,220,220,221,222,222,222,223,223,224,224,224,225,225,225,225,225,225,225,225,225,225,225,225,225,225,225,225,225]},
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('gotham', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
      desaturate: 1,
      curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4,4,4,5,5,5,6,6,7,7,7,8,8,9,9,10,10,11,11,12,12,12,13,13,14,14,15,15,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,25,25,25,26,26,27,27,28,28,29,29,30,30,31,32,32,33,33,34,34,35,35,36,36,37,38,38,39,39,40,41,41,42,42,43,44,44,45,45,46,47,47,48,48,49,50,50,51,52,52,53,54,54,55,56,57,58,58,59,60,61,62,63,64,65,66,67,68,70,71,73,74,76,77,79,80,82,83,84,86,87,88,90,91,92,94,95,96,98,99,100,102,103,104,106,107,109,110,111,113,114,116,118,119,121,123,124,126,128,129,131,133,135,137,138,140,142,144,146,148,149,151,153,155,156,158,160,162,163,165,167,168,170,172,173,175,176,178,180,181,183,184,186,187,189,191,192,194,195,197,198,200,201,203,204,205,207,208,210,211,213,214,215,217,218,219,221,222,223,224,225,227,228,229,230,231,233,234,235,237,238,239,241,242,244,245,246,248,249,251,252,254,255,255], 'g':[0,0,0,0,0,1,1,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4,4,4,4,5,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,12,12,12,13,13,14,14,14,15,15,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,26,26,27,28,28,29,30,30,31,32,32,33,34,35,35,36,37,38,39,39,40,41,42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,67,68,69,70,71,72,73,74,75,77,78,79,81,82,83,84,86,87,88,90,91,92,93,95,96,97,99,100,101,102,104,105,106,108,109,110,112,113,115,116,118,119,121,122,124,125,127,128,130,132,133,135,137,138,140,142,143,145,147,149,150,152,154,155,157,159,160,162,163,165,167,168,170,171,173,174,176,177,179,180,182,183,185,186,188,189,191,192,194,195,196,198,199,201,202,204,205,206,208,209,211,212,213,215,216,217,219,220,221,223,224,225,226,228,229,230,232,233,234,236,237,239,240,242,243,245,246,248,249,251,252,254,255,255], 'b':[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2,2,3,3,4,4,4,5,5,6,6,7,7,8,9,9,10,10,11,12,12,13,13,14,15,15,16,17,17,18,19,20,20,21,22,22,23,24,24,25,26,27,27,28,29,30,31,32,33,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,58,59,60,61,62,63,64,66,67,68,69,70,71,73,74,75,76,77,78,79,81,82,83,84,85,86,87,88,89,90,91,92,93,94,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,131,132,133,134,135,136,137,138,139,140,140,141,142,143,144,145,146,148,149,150,151,152,153,155,156,157,158,160,161,162,164,165,166,168,169,171,172,173,175,176,178,179,181,182,184,186,187,189,190,192,194,195,197,199,201,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,235,237,239,241,243,244,246,248,250,251,253,255,255]},
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('greyscale', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			desaturate: 1
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('hefe', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
      curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[32,32,32,32,32,32,32,32,32,32,32,32,32,33,33,33,33,33,34,35,36,38,39,41,43,45,48,50,52,54,56,58,60,62,64,65,67,69,71,73,75,77,79,81,83,85,87,89,91,93,95,96,98,100,102,104,106,108,110,112,114,116,117,119,121,123,125,126,128,130,132,133,135,137,139,140,142,144,146,147,149,151,152,154,155,157,158,160,161,163,164,166,167,168,170,171,172,173,175,176,177,178,179,180,181,182,184,185,186,187,188,189,190,190,191,192,193,194,195,196,197,197,198,199,200,201,201,202,203,204,204,205,205,206,206,207,207,208,208,209,209,210,210,211,211,212,212,213,213,214,214,215,215,216,216,217,217,218,218,219,219,220,220,221,221,221,222,222,223,223,224,224,225,225,225,226,226,227,227,228,228,228,229,229,230,230,231,231,231,232,232,233,233,233,234,234,235,235,235,236,236,236,237,237,238,238,238,239,239,239,240,240,240,241,241,242,242,242,243,243,243,244,244,245,245,245,246,246,247,248,248,249,249,250,250,251,251,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252], 'g':[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,3,4,5,6,7,8,9,10,11,13,14,15,16,17,19,20,21,23,24,25,27,28,30,31,33,34,36,37,39,40,42,44,45,47,49,50,52,54,56,57,59,61,63,65,67,69,71,73,75,78,80,82,85,87,89,92,94,97,99,102,104,106,109,111,114,116,118,121,123,125,127,129,131,133,135,137,139,141,143,145,146,148,150,152,154,156,157,159,161,163,164,166,168,169,171,173,174,176,178,179,181,182,184,185,187,188,190,191,192,194,195,196,197,198,199,200,201,202,203,204,205,205,206,207,207,208,209,209,210,210,211,211,211,212,212,213,213,213,214,214,215,215,216,216,216,217,217,218,218,219,219,220,220,220,221,221,222,222,222,223,223,224,224,225,225,225,226,226,227,227,228,228,228,229,229,230,230,231,231,232,232,232,233,233,234,234,235,235,236,236,237,237,238,238,239,239,239,240,240,241,241,242,242,243,244,244,245,246,246,247,248,249,249,250,250,251,251,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252,252], 'b':[2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5,6,6,6,6,6,7,7,7,8,8,9,9,9,10,10,11,12,12,13,13,14,15,15,16,17,17,18,19,19,20,21,22,23,24,24,25,26,27,28,29,30,32,33,34,35,36,38,39,40,42,43,45,47,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,87,89,91,93,95,96,98,100,101,103,105,107,108,110,112,113,115,117,118,120,122,123,125,127,128,130,131,133,135,136,138,140,141,143,145,146,148,149,151,153,154,156,158,159,161,163,164,166,167,169,170,171,173,174,175,177,178,179,180,182,183,184,185,186,187,189,190,191,192,193,194,195,195,196,197,198,198,199,200,200,201,201,202,202,203,203,204,204,204,205,205,205,206,206,206,207,207,207,207,208,208,209,209,209,210,210,211,211,211,212,212,213,213,214,214,214,215,215,216,216,216,217,217,218,218,218,219,219,220,220,220,221,221,222,222,222,223,223,224,224,225,225,226,226,227,227,227,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228]}
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('lord-kelvin', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
      curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[43,44,46,47,49,50,52,53,55,56,58,59,61,62,64,65,67,69,70,72,73,75,77,78,80,81,83,85,86,88,90,91,93,95,96,98,100,102,103,105,107,109,111,112,114,116,118,120,121,123,125,127,129,130,132,134,136,137,139,141,142,144,146,147,149,151,152,154,155,157,158,160,162,163,165,166,168,169,171,172,174,175,176,178,179,180,182,183,184,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,201,202,203,204,204,205,206,207,207,208,209,210,210,211,212,212,213,214,214,215,216,217,217,218,219,219,220,221,222,222,223,224,224,225,225,226,227,227,228,228,229,229,229,230,230,231,231,232,232,232,233,233,233,234,234,235,235,235,236,236,236,237,237,237,238,238,239,239,239,240,240,240,241,241,241,242,242,242,243,243,243,243,244,244,244,245,245,245,245,245,246,246,246,246,246,247,247,247,247,247,248,248,248,248,248,248,249,249,249,249,249,249,249,250,250,250,250,250,250,250,250,251,251,251,251,251,251,251,251,251,252,252,252,252,252,252,252,252,252,253,253,253,253,253,253,253,253,254,254,254,254,254], 'g':[36,36,36,36,36,36,36,36,36,36,36,36,36,37,37,37,37,37,37,38,38,38,39,39,40,40,41,41,42,43,43,44,45,46,47,47,48,49,50,51,52,53,54,55,56,57,59,60,61,62,63,64,65,67,68,69,70,71,72,73,75,76,77,78,79,80,81,82,83,84,86,87,88,89,90,91,92,93,95,96,97,98,99,100,101,102,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,155,156,157,158,158,159,160,160,161,161,162,163,163,164,164,165,165,166,166,167,167,168,168,168,169,169,170,171,171,172,172,173,173,174,174,175,175,176,177,177,178,178,179,179,180,180,181,181,182,182,182,183,183,184,184,184,185,185,185,186,186,186,186,187,187,187,187,188,188,188,188,188,189,189,189,189,189,190,190,190,190,190,190,190,191,191,191,191,191,191,191,191,192,192,192,192,192,192,192,192,193,193,193,193,193,193,193,193,194,194,194,194,194,194,194,195,195,195,195], 'b':[69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,70,70,70,70,70,70,70,70,70,70,71,71,71,72,72,73,73,73,74,74,75,75,76,76,77,78,78,79,79,80,80,81,81,82,82,82,83,83,84,84,84,85,85,86,86,86,87,87,87,88,88,88,89,89,90,90,90,91,91,91,92,92,93,93,93,94,94,95,95,96,96,96,97,97,98,99,99,100,100,101,101,102,102,102,103,103,103,104,104,104,105,105,105,106,106,106,106,107,107,107,107,108,108,108,108,109,109,109,110,110,110,111,111,111,111,112,112,112,113,113,113,114,114,114,115,115,115,115,116,116,116,116,117,117,117,117,117,118,118,118,118,118,118,119,119,119,119,119,119,119,120,120,120,120,120,120,120,120,120,121,121,121,121,121,121,121,121,121,121,121,122,122,122,122,122,122,122,122,122,122,122,122,123,123,123,123,123,123,123,123,123,123,123,124,124,124,124,124,124]}
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('nashville', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
      curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,56,57,57,58,58,59,59,60,61,62,63,64,65,66,67,68,69,71,72,73,75,76,78,79,81,82,84,85,87,88,90,91,93,95,96,98,100,102,104,106,108,110,113,115,117,120,122,124,127,129,131,133,136,138,140,142,144,146,148,150,152,154,155,157,159,160,162,164,165,167,168,170,171,173,174,175,177,178,179,181,182,183,185,186,187,189,190,191,192,194,195,196,197,198,200,201,202,203,204,205,206,208,209,209,210,211,212,213,214,215,216,217,217,218,219,220,220,221,222,223,223,224,225,226,226,227,228,228,229,230,230,231,231,232,233,233,234,234,235,235,236,237,237,238,238,239,239,240,240,240,241,241,242,242,243,243,243,244,244,245,245,245,246,246,246,247,247,247,248,248,248,248,249,249,249,249,250,250,250,250,251,251,251,251,251,252,252,252,252,252,253,253,253,253,253,254,254,254,254,254,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255], 'g':[38,39,39,40,41,41,42,42,43,44,44,45,46,46,47,48,49,50,51,52,53,55,56,57,59,60,61,63,64,65,67,68,69,71,72,73,74,76,77,78,80,81,82,84,85,86,87,89,90,91,93,94,95,97,98,99,101,102,103,104,106,107,108,110,111,112,114,115,116,118,119,121,122,123,125,126,128,129,130,132,133,134,136,137,138,140,141,142,143,145,146,147,148,149,150,151,152,153,154,155,156,157,158,158,159,160,161,162,163,163,164,165,166,166,167,168,169,169,170,171,172,172,173,174,175,176,176,177,178,179,180,181,181,182,183,184,185,186,187,187,188,189,189,190,191,191,192,193,193,194,194,195,195,196,197,197,198,198,199,199,200,200,201,201,202,202,202,203,203,204,204,205,205,205,206,206,207,207,207,208,208,208,209,209,209,210,210,210,211,211,211,212,212,212,213,213,213,213,214,214,214,214,215,215,215,215,216,216,216,216,216,217,217,217,217,217,218,218,218,218,218,218,219,219,219,219,219,220,220,220,220,220,220,220,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221,221], 'b':[97,98,98,99,99,100,100,101,101,102,102,103,104,104,105,105,106,107,107,108,109,110,110,111,112,113,114,114,115,116,116,117,118,118,119,119,120,120,121,121,122,122,123,123,124,124,124,125,125,126,126,127,127,127,128,128,129,129,129,130,130,131,131,132,132,132,133,133,134,134,135,135,136,136,136,137,137,138,138,139,139,139,140,140,141,141,142,142,142,143,143,144,144,144,145,145,146,146,147,147,147,148,148,149,149,150,150,151,151,151,152,152,153,153,154,154,154,155,155,155,156,156,156,157,157,157,158,158,158,158,158,158,159,159,159,159,159,159,159,159,159,159,159,160,160,160,160,160,161,161,161,162,162,162,162,163,163,163,163,164,164,164,164,165,165,165,165,165,165,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,166,167,167,167,167,167,167,167,167,167,168,168,168,168,168,168,169,169,169,169,169,170,170,170,170,171,171,171,171,171,172,172,172,172,172,173,173,173,173,173,173,173,174,174,174,174,174,174,174,174,175,175,175,175,175,175,175,175,175,175,175,176,176,176,176,176,176,176,176,176,176]}
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('negative', function (self, imageData, canvas) {
	    var context = canvas.getContext('2d');
	    var data = imageData.data;
	    for (var i = 0; i < data.length; i += 4) {
	        data[i]   = 255 - data[i];   // red
	        data[i+1] = 255 - data[i+1]; // green
	        data[i+2] = 255 - data[i+2]; // blue
	    }
			return imageData;
	});
})();

(function () {
	AvatarCrop.registerFilter('sepia', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			sepia: 1
		});
	});
})();

(function () {
	AvatarCrop.registerFilter('vignette', function (self, imageData, canvas) {
		var ctx = canvas.getContext('2d'),
				width = canvas.width,
				height = canvas.height,
				outerRadius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
		ctx.putImageData(imageData, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		var gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, outerRadius);
		gradient.addColorStop(0, 'rgba(0,0,0,0)');
		gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
		gradient.addColorStop(1, ['rgba(0,0,0,', this.configs.radius, ')'].join(''));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
		return imageData = ctx.getImageData(0, 0, width, height);
	}, {
		radius: 0.16
	});
})();

(function () {
	AvatarCrop.registerFilter('x-pro-ii', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
      curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,3,3,4,4,5,5,5,6,7,7,8,8,9,9,10,11,11,12,13,14,14,15,16,17,17,18,19,20,21,22,23,24,25,26,27,28,29,31,32,33,34,35,37,38,39,41,42,43,45,46,48,49,51,52,54,55,57,58,60,62,63,65,67,68,70,72,74,76,77,79,81,83,85,87,89,91,93,95,97,99,101,103,105,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,172,174,176,178,180,182,184,186,188,189,191,193,194,196,198,199,201,202,204,205,207,208,209,211,212,214,215,216,217,219,220,221,222,223,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,239,240,241,242,243,243,244,245,246,246,247,248,248,249,249,250,250,251,251,252,252,252,253,253,253,253,253,253,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,255,255,255,255,255,255,255,255], 'g':[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,4,4,4,5,5,5,6,6,7,7,8,8,9,10,10,11,12,12,13,14,14,15,16,17,18,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33,34,35,36,37,39,40,41,43,44,45,47,48,50,51,53,54,56,57,59,61,62,64,66,67,69,71,73,75,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160,161,163,165,167,169,171,173,175,176,178,180,182,183,185,187,189,190,192,193,195,197,198,200,201,203,204,206,207,209,210,211,213,214,216,217,218,219,221,222,223,224,226,227,228,229,230,231,232,233,234,235,236,237,237,238,239,240,240,241,242,243,243,244,244,245,246,246,247,247,248,248,249,249,250,250,250,251,251,252,252,252,253,253,253,253,253,253,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,255,255,255,255,255,255,255,255,255,255], 'b':[24,25,26,27,28,28,29,30,31,32,33,34,35,35,36,37,38,39,40,41,41,42,43,44,45,45,46,47,48,49,49,50,51,52,53,53,54,55,56,56,57,58,59,59,60,61,62,62,63,64,64,65,66,67,67,68,69,70,70,71,72,73,73,74,75,76,77,77,78,79,80,81,81,82,83,84,85,86,86,87,88,89,90,91,91,92,93,94,95,96,96,97,98,99,100,101,101,102,103,104,105,106,107,107,108,109,110,111,112,113,114,114,115,116,117,118,119,119,120,121,122,123,124,124,125,126,127,127,128,129,129,130,130,131,131,132,132,133,134,134,135,136,137,138,138,139,140,141,142,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,162,163,164,165,165,166,167,168,168,169,170,171,171,172,173,173,174,175,176,176,177,178,178,179,180,181,182,182,183,184,185,185,186,187,188,189,189,190,191,192,193,193,194,195,196,197,197,198,199,200,200,201,202,203,204,204,205,206,206,207,208,208,209,210,210,211,212,212,213,214,215,215,216,217,218,218,219,220,221,221,222,223,224,225,226,226,227,228,229]}
		});
	});
})();

//# sourceMappingURL=avatar-crop.full.js.map