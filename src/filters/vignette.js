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
