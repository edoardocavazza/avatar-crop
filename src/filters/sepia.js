(function () {
	AvatarCrop.registerFilter('sepia', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
			sepia: 1
		});
	});
})();
