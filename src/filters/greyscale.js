(function () {
	AvatarCrop.addFilter('greyscale', function (self, canvas) {
		AvatarCrop.execFilter(canvas, {
			desaturate: 1
		})
	});
})();
