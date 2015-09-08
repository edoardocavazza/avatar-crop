(function () {
	AvatarCrop.addFilter('vignette', function (self, canvas) {
		AvatarCrop.execFilter(canvas, {
			vignette: this.configs.radius
		})
	}, {
		radius: 0.16
	});
})();
