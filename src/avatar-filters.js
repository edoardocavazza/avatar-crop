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
