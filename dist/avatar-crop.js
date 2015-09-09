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
        time = 0,
        pinchCenter = { x: 0, y: 0 },
        wheel = 0,
        isTouch = false,
        pinching = false,
        isDragging = false;

    function handleMouseDown(e) {
      if (self.data) {
        if (e.type == 'touchstart') {
          if (e.timeStamp - time < 250) {
            return handleDblClick(e);
          }
          time = e.timeStamp;
          isTouch = true;
          if (e.touches && e.touches.length) {
            pinching = (e.touches.length == 2);
            e = e.touches[0];
          }
        }
        canMouseX = e.clientX + self._offsetX;
        canMouseY = e.clientY + self._offsetY;
        isDragging = true;
      }
    }

    function handleMouseUp(e) {
      isDragging = false;
      isTouch = false;
      pinching = false;
    }

    function handleMouseMove(e) {
      if (isDragging && isTouch == !!e.type.match('touch')) {
        e.preventDefault();
        e.stopPropagation();
        if (pinching && e.changedTouches && e.changedTouches.length == 2 && typeof e.scale !== 'undefined') {
          self.zoom(e.scale);
        } else {
          pinching = false;
          if (e.changedTouches && e.changedTouches.length) {
            e = e.changedTouches[0];
          }
          self.move(e.clientX - canMouseX, e.clientY - canMouseY, 1);
        }
      }
    }

    function handleMouseWheel(e) {
      if (self.data && isDragging && isTouch == !!e.type.match('touch')) {
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
            self.fill().render();
          } else {
            self.center().render();
          }
        } else {
          self.fit().render();
        }
        return false;
      }
    }

    bind(canvas, 'mousedown', handleMouseDown);
    bind(canvas, 'touchstart', handleMouseDown);
    bind(canvas, 'mousemove', handleMouseMove);
    bind(canvas, 'touchmove', handleMouseMove);
    bind(canvas, 'mouseup', handleMouseUp);
    bind(canvas, 'touchend', handleMouseUp);
    bind(canvas, 'mouseout', handleMouseUp);
    bind(canvas, 'touchcancel', handleMouseUp);
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
          if (self._loading) {
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
      self.reset(0).render();
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
    return this.moveAndZoom(0, 0, 1, (typeof durate !== 'undefined') ? durate : AvatarCrop.DEFAULT_ANIM_DURATE);
  }

  proto.fill = function(durate) {
    if (this.data) {
      var image = this.data,
        imageW = image.width,
        imageH = image.height;
      if (imageH > imageW) {
        this.moveAndZoom(0, 0, imageH / imageW, (typeof durate !== 'undefined') ? durate : AvatarCrop.DEFAULT_ANIM_DURATE);
      } else {
        this.moveAndZoom(0, 0, imageW / imageH, (typeof durate !== 'undefined') ? durate : AvatarCrop.DEFAULT_ANIM_DURATE);
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
    return this.moveAndZoom(0, 0, this._zoom, (typeof durate !== 'undefined') ? durate : AvatarCrop.DEFAULT_ANIM_DURATE);
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

//# sourceMappingURL=avatar-crop.js.map