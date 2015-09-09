(function () {
	AvatarCrop.registerFilter('greyscale', function (self, canvas) {
		AvatarCrop.execFilter(canvas, {
			desaturate: 1
		})
	});
})();
