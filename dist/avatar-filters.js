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

		// vignette
		if (!!effects.vignette) {
			ctx.globalCompositeOperation = 'source-over';
			gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, outerRadius);
			gradient.addColorStop(0, 'rgba(0,0,0,0)');
			gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
			gradient.addColorStop(1, ['rgba(0,0,0,', effects.vignette, ')'].join(''));
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);
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
	AvatarCrop.registerFilter('greyscale', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			desaturate: 1
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

//# sourceMappingURL=avatar-filters.js.map