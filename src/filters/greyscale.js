(function () {
	AvatarCrop.registerFilter('greyscale', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			desaturate: 1
		});
	});
})();
